/**
 * The network layer: every request to a data provider goes through `fetchJSON`.
 *
 * What it does for callers
 *   - De-duplicates: identical simultaneous requests share one network call.
 *   - Caches: successful responses are kept in a bounded LRU cache with a TTL per data category.
 *   - Fails clearly: every failure is a FetchError with a `kind` (see errors.js).
 *   - Falls back sparingly: public CORS proxies are tried only after a *network/CORS* failure of the
 *     direct request, never for HTTP errors, timeouts, rate limits or bad data. All attempts share one
 *     overall time budget, a proxy that keeps failing is skipped for a while (circuit breaker), and a
 *     host known to need a proxy goes proxy-first so it doesn't pay for a doomed direct request.
 *   - Backs off: after HTTP 429 a provider is left alone for its Retry-After (default 30s).
 *   - Explains itself: per-provider counters and a fallback log are available via getNetDiagnostics().
 */
import { FetchError } from "./errors.js";
import { LruCache } from "./cache.js";
import { getDiagnostics, recordAttempt, recordFallback, resetDiagnostics, setCircuit } from "./diagnostics.js";

const IS_DEV = Boolean(import.meta.env?.DEV);

// Tried in order, only when a direct request fails with a network/CORS error.
// 1) same-origin proxy from vite.config.js: local dev only (static hosts like GitHub Pages can't
//    run it); 2+) public fallbacks, best-effort.
export const PROXIES = [
  ...(IS_DEV ? [{ id: "dev-proxy", wrap: (url) => `/__proxy?url=${encodeURIComponent(url)}` }] : []),
  { id: "allorigins", wrap: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
  { id: "codetabs", wrap: (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` },
];

/** Longest a single logical request may take: the direct attempt and any proxy fallbacks together. */
export const OVERALL_TIMEOUT_MS = 5000;

/** Tunable at runtime with configureNet(); defaults are conservative. */
export const config = {
  memoMax: 100,
  // How long a successful response is reused, by data category (ms). The Refresh button clears everything.
  ttl: { live: 30e3, news: 60e3, roster: 120e3, standings: 120e3, stats: 300e3, default: 30e3 },
  retry: { statuses: [502, 503, 504], backoffMs: 250 }, // one retry, transient gateway errors only
  circuit: { failures: 2, openMs: 5 * 60e3 },
  proxyFirstMs: 10 * 60e3,
  rateLimit: { defaultMs: 30e3, maxMs: 120e3 },
};

export function configureNet(partial = {}) {
  if (partial.ttl) Object.assign(config.ttl, partial.ttl);
  for (const k of ["retry", "circuit", "rateLimit"]) if (partial[k]) Object.assign(config[k], partial[k]);
  if (partial.proxyFirstMs != null) config.proxyFirstMs = partial.proxyFirstMs;
  if (partial.memoMax != null) {
    config.memoMax = partial.memoMax;
    memo.max = partial.memoMax;
    while (memo.size > memo.max) memo.delete(memo.keys()[0]);
  }
}

/** Data category from the URL, which selects the TTL. */
export function categoryOf(url = "") {
  if (/\/schedule|\/summary/.test(url)) return "live";
  if (/\/roster/.test(url)) return "roster";
  if (/\/standings/.test(url)) return "standings";
  if (/\/athletes\//.test(url)) return "stats";
  if (/\/news|rss|\/feed|\.xml/i.test(url)) return "news";
  return "default";
}

const hostOf = (url) => {
  try {
    return new URL(url, "http://local.invalid").hostname;
  } catch {
    return "unknown";
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const offline = () => typeof navigator !== "undefined" && navigator.onLine === false;

/* ───────────────────────── State ───────────────────────── */

const memo = new LruCache({ max: config.memoMax });
const inflight = new Map(); // `${generation}|${key}` -> Promise
let generation = 0; // bumped by clearMemo() so a request started before a refresh can't repopulate the cache
const cooldownUntil = new Map(); // host -> epoch ms
const proxyFirstUntil = new Map(); // host -> epoch ms
const circuits = new Map(); // proxy id -> { fails, openUntil }

export function clearMemo() {
  generation++;
  memo.clear();
}

/** Test helper: back to a pristine state. */
export function resetNetState() {
  clearMemo();
  memo.resetStats();
  inflight.clear();
  cooldownUntil.clear();
  proxyFirstUntil.clear();
  circuits.clear();
  resetDiagnostics();
}

export function getNetDiagnostics() {
  const now = Date.now();
  return getDiagnostics({
    memo: memo.stats(),
    cooldowns: Object.fromEntries([...cooldownUntil].filter(([, t]) => t > now).map(([h, t]) => [h, Math.ceil((t - now) / 1000)])),
    proxyFirst: [...proxyFirstUntil].filter(([, t]) => t > now).map(([h]) => h),
  });
}

/* ───────────────────────── One attempt ───────────────────────── */

function retryAfterMs(res) {
  const raw = res.headers?.get?.("retry-after");
  const s = Number(raw);
  return Number.isFinite(s) && s > 0 ? Math.min(s * 1000, config.rateLimit.maxMs) : config.rateLimit.defaultMs;
}

/** A single request. Classifies every failure and records it against `id`. */
async function attempt(url, { id, host, timeoutMs, as, direct }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = Date.now();
  try {
    const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    if (res.status === 429) {
      const wait = retryAfterMs(res);
      if (direct) cooldownUntil.set(host, Date.now() + wait);
      throw new FetchError("Rate limited by the data provider", "ratelimit", { status: 429, host, via: id, retryAfterMs: wait });
    }
    if (!res.ok) throw new FetchError(`HTTP ${res.status}`, "http", { status: res.status, host, via: id });
    const body = as === "text" ? await res.text() : await res.json();
    recordAttempt(id, { ok: true, ms: Date.now() - t0 });
    return body;
  } catch (raw) {
    let err = raw;
    if (!(raw instanceof FetchError)) {
      if (raw?.name === "AbortError") err = new FetchError("Request timed out", "timeout", { host, via: id });
      else if (raw instanceof SyntaxError) err = new FetchError("Unexpected response format", "data", { host, via: id });
      // TypeError: Failed to fetch -> offline, DNS, or blocked by CORS
      else err = new FetchError("Network error or blocked by CORS", "network", { host, via: id });
    }
    recordAttempt(id, { ok: false, kind: err.kind, status: err.status, ms: Date.now() - t0, message: err.message });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** The direct request, with one retry for transient gateway errors if the time budget allows. */
async function direct(url, { host, timeoutMs, as, left }) {
  const id = `direct:${host}`;
  const go = (ms) => attempt(url, { id, host, timeoutMs: ms, as, direct: true });
  try {
    return await go(Math.min(timeoutMs, left()));
  } catch (err) {
    const wait = config.retry.backoffMs;
    if (err.kind === "http" && config.retry.statuses.includes(err.status) && left() > wait + 1000) {
      await sleep(wait);
      return go(Math.min(timeoutMs, left()));
    }
    throw err;
  }
}

/* ───────────────────────── Proxy circuit breaker ───────────────────────── */

const circuitOpen = (id) => (circuits.get(id)?.openUntil ?? 0) > Date.now();
function circuitSuccess(id) {
  circuits.set(id, { fails: 0, openUntil: 0 });
  setCircuit(id, null);
}
function circuitFailure(id) {
  const c = circuits.get(id) ?? { fails: 0, openUntil: 0 };
  c.fails++;
  if (c.fails >= config.circuit.failures) {
    c.openUntil = Date.now() + config.circuit.openMs;
    setCircuit(id, c.openUntil);
  }
  circuits.set(id, c);
}

/* ───────────────────────── One logical request ───────────────────────── */

async function fetchRaw(url, { timeoutMs = 12000, proxy = true, as = "json", skipDirect = false, overallMs = OVERALL_TIMEOUT_MS } = {}) {
  const host = hostOf(url);
  const started = Date.now();
  const left = () => overallMs - (Date.now() - started);

  const cooling = cooldownUntil.get(host) ?? 0;
  if (cooling > Date.now()) {
    const ms = cooling - Date.now();
    throw new FetchError(`${host} asked us to slow down; trying again in ${Math.ceil(ms / 1000)}s`, "ratelimit", { host, retryAfterMs: ms });
  }
  if (offline()) throw new FetchError("You appear to be offline", "offline", { host });

  const proxyFirst = proxy && !skipDirect && (proxyFirstUntil.get(host) ?? 0) > Date.now();
  let directErr;
  if (skipDirect || proxyFirst) {
    directErr = new FetchError("Direct request skipped", "network", { host });
  } else {
    try {
      return await direct(url, { host, timeoutMs, as, left });
    } catch (err) {
      // Only a network/CORS failure justifies a proxy. HTTP errors, timeouts, rate limits and bad data
      // would just be repeated by a proxy.
      if (!proxy || err.kind !== "network") throw err;
      directErr = err;
    }
  }

  for (const p of PROXIES) {
    if (circuitOpen(p.id)) continue;
    const remaining = left();
    if (remaining < 300) break;
    try {
      const body = await attempt(p.wrap(url), { id: p.id, host, timeoutMs: remaining, as, direct: false });
      circuitSuccess(p.id);
      recordFallback({ host, via: p.id, outcome: "ok", after: directErr.kind });
      proxyFirstUntil.set(host, Date.now() + config.proxyFirstMs);
      return body;
    } catch (err) {
      circuitFailure(p.id);
      recordFallback({ host, via: p.id, outcome: err.kind, after: directErr.kind });
    }
  }

  // A host we expected to need a proxy: give the direct route one last chance (CORS may have been fixed).
  if (proxyFirst && left() > 300) {
    try {
      const body = await attempt(url, { id: `direct:${host}`, host, timeoutMs: left(), as, direct: true });
      proxyFirstUntil.delete(host);
      return body;
    } catch (err) {
      directErr = err;
    }
  }
  throw new FetchError(`${directErr.message}; CORS proxies also unavailable`, directErr.kind, { host, status: directErr.status });
}

/**
 * Every request goes through here. Identical in-flight requests share one network call; successful
 * responses are reused for their category's TTL. `clearMemo()` (the Refresh button) starts a new
 * generation, so a manual refresh always reaches the network and an older request can't write stale
 * data back into the cache. Pass { fresh: true } to skip the cache for one call.
 */
export function fetchJSON(url, opts = {}) {
  const key = `${opts.as ?? "json"}|${url}`;
  const category = opts.category ?? categoryOf(url);
  if (!opts.fresh) {
    const hit = memo.get(key, category);
    if (hit !== undefined) return Promise.resolve(hit);
  }
  const flightKey = `${generation}|${key}`;
  if (inflight.has(flightKey)) return inflight.get(flightKey);
  const startedIn = generation;
  const p = fetchRaw(url, opts)
    .then((v) => {
      if (startedIn === generation) memo.set(key, v, config.ttl[category] ?? config.ttl.default);
      return v;
    })
    .finally(() => inflight.delete(flightKey));
  inflight.set(flightKey, p);
  return p;
}
