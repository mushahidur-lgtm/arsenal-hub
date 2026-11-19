import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FetchError } from "../../src/lib/errors.js";
import { PROXIES, categoryOf, clearMemo, config, configureNet, fetchJSON, getNetDiagnostics, resetNetState } from "../../src/lib/net.js";

/**
 * Deterministic: `fetch` is always a stub and time is fake. Under Vitest `import.meta.env.DEV` is true,
 * so the proxy list is [dev-proxy, allorigins, codetabs].
 */
const ok = (body, headers = {}) => ({ ok: true, status: 200, headers: { get: (k) => headers[k.toLowerCase()] ?? null }, json: async () => body, text: async () => JSON.stringify(body) });
const status = (code, headers = {}) => ({ ok: false, status: code, headers: { get: (k) => headers[k.toLowerCase()] ?? null }, json: async () => ({}), text: async () => "" });
const isProxy = (u) => /__proxy|allorigins|codetabs/.test(String(u));
const proxyId = (u) => (/__proxy/.test(u) ? "dev-proxy" : /allorigins/.test(u) ? "allorigins" : /codetabs/.test(u) ? "codetabs" : "direct");

const DEFAULTS = JSON.parse(JSON.stringify(config));
let n = 0;
const espn = (path = "x") => `https://site.api.espn.com/apis/site/v2/sports/soccer/${path}/${++n}`;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2025-03-01T12:00:00Z"));
  resetNetState();
});
afterEach(() => {
  vi.useRealTimers();
  Object.assign(config, JSON.parse(JSON.stringify(DEFAULTS)));
  configureNet({ memoMax: DEFAULTS.memoMax });
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
});

/** Runs a fetchJSON that may sleep (retry backoff / timeouts) to completion under fake timers. */
async function settle(promise, ms = 0) {
  const result = promise.then((v) => ({ v }), (e) => ({ e }));
  await vi.advanceTimersByTimeAsync(ms);
  return result;
}

describe("failure classification", () => {
  it("HTTP errors carry their status and host", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => status(404)));
    const { e } = await settle(fetchJSON(espn()));
    expect(e).toBeInstanceOf(FetchError);
    expect(e).toMatchObject({ kind: "http", status: 404, host: "site.api.espn.com", message: "HTTP 404" });
  });
  it("rate limits are classified and carry the provider's Retry-After", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => status(429, { "retry-after": "7" })));
    const { e } = await settle(fetchJSON(espn()));
    expect(e).toMatchObject({ kind: "ratelimit", status: 429, retryAfterMs: 7000 });
  });
  it("invalid JSON is a data error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => { throw new SyntaxError("bad"); } })));
    expect((await settle(fetchJSON(espn()))).e).toMatchObject({ kind: "data" });
  });
  it("a request with no answer inside its budget is a timeout", async () => {
    vi.stubGlobal("fetch", vi.fn((_u, { signal }) => new Promise((_r, rej) => signal.addEventListener("abort", () => rej(Object.assign(new Error("a"), { name: "AbortError" }))))));
    const { e } = await settle(fetchJSON(espn()), 5100);
    expect(e).toMatchObject({ kind: "timeout", message: "Request timed out" });
  });
  it("offline: fails immediately, sends nothing", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const { e } = await settle(fetchJSON(espn()));
    expect(e).toMatchObject({ kind: "offline" });
    expect(f).not.toHaveBeenCalled();
  });
  it("a network/CORS failure with every proxy failing says so and names the kind", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    const { e } = await settle(fetchJSON(espn()));
    expect(e).toMatchObject({ kind: "network" });
    expect(e.message).toContain("CORS proxies also unavailable");
  });
});

describe("retry strategy", () => {
  it.each([502, 503, 504])("HTTP %i (transient gateway error) is retried once, after a backoff", async (code) => {
    const f = vi.fn().mockResolvedValueOnce(status(code)).mockResolvedValueOnce(ok({ fine: true }));
    vi.stubGlobal("fetch", f);
    const p = settle(fetchJSON(espn()), 300);
    expect((await p).v).toEqual({ fine: true });
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("gives up after one retry (no loop)", async () => {
    const f = vi.fn(async () => status(503));
    vi.stubGlobal("fetch", f);
    const { e } = await settle(fetchJSON(espn()), 2000);
    expect(e).toMatchObject({ kind: "http", status: 503 });
    expect(f).toHaveBeenCalledTimes(2);
  });
  it.each([400, 404, 500])("HTTP %i is not retried", async (code) => {
    const f = vi.fn(async () => status(code));
    vi.stubGlobal("fetch", f);
    await settle(fetchJSON(espn()), 2000);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("never sends HTTP errors or timeouts through a proxy", async () => {
    const f = vi.fn(async () => status(500));
    vi.stubGlobal("fetch", f);
    await settle(fetchJSON(espn()), 1000);
    expect(f.mock.calls.some(([u]) => isProxy(u))).toBe(false);

    const g = vi.fn((_u, { signal }) => new Promise((_r, rej) => signal.addEventListener("abort", () => rej(Object.assign(new Error("a"), { name: "AbortError" })))));
    vi.stubGlobal("fetch", g);
    await settle(fetchJSON(espn()), 5100);
    expect(g).toHaveBeenCalledTimes(1);
  });
});

describe("rate-limit backoff", () => {
  it("after a 429 the provider is left alone until Retry-After has passed", async () => {
    const f = vi.fn().mockResolvedValueOnce(status(429, { "retry-after": "2" })).mockResolvedValue(ok({ again: true }));
    vi.stubGlobal("fetch", f);
    await settle(fetchJSON(espn()));
    expect(f).toHaveBeenCalledTimes(1);

    // Any other request to the same host is refused locally: no network call.
    const during = await settle(fetchJSON(espn("other")));
    expect(during.e).toMatchObject({ kind: "ratelimit", host: "site.api.espn.com" });
    expect(during.e.message).toMatch(/slow down/);
    expect(f).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2100);
    expect((await settle(fetchJSON(espn("later")))).v).toEqual({ again: true });
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("defaults to 30s when the provider gives no Retry-After, and caps absurd values", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => status(429)));
    expect((await settle(fetchJSON(espn()))).e.retryAfterMs).toBe(30e3);
    resetNetState();
    vi.stubGlobal("fetch", vi.fn(async () => status(429, { "retry-after": "99999" })));
    expect((await settle(fetchJSON(espn()))).e.retryAfterMs).toBe(config.rateLimit.maxMs);
  });
  it("a different host is unaffected", async () => {
    const f = vi.fn(async (u) => (String(u).includes("espn") ? status(429) : ok({ other: 1 })));
    vi.stubGlobal("fetch", f);
    await settle(fetchJSON(espn()));
    expect((await settle(fetchJSON("https://feeds.bbci.co.uk/rss.xml"))).v).toEqual({ other: 1 });
  });
});

describe("proxy fallback", () => {
  it("tries the proxies in order, only after a network failure, and returns the first success", async () => {
    const f = vi.fn(async (u) => (proxyId(String(u)) === "allorigins" ? ok({ via: "allorigins" }) : Promise.reject(new TypeError("x"))));
    vi.stubGlobal("fetch", f);
    const { v } = await settle(fetchJSON(espn()));
    expect(v).toEqual({ via: "allorigins" });
    expect(f.mock.calls.map(([u]) => proxyId(String(u)))).toEqual(["direct", "dev-proxy", "allorigins"]); // codetabs never needed
  });
  it("a host that needed a proxy goes proxy-first for later requests, skipping the doomed direct call", async () => {
    const f = vi.fn(async (u) => (isProxy(u) && proxyId(String(u)) === "dev-proxy" ? ok({ p: 1 }) : Promise.reject(new TypeError("cors"))));
    vi.stubGlobal("fetch", f);
    await settle(fetchJSON(espn()));
    f.mockClear();
    await settle(fetchJSON(espn("second")));
    expect(f.mock.calls.map(([u]) => proxyId(String(u)))).toEqual(["dev-proxy"]);
    expect(getNetDiagnostics().proxyFirst).toContain("site.api.espn.com");
  });
  it("proxy-first expires, and a failed proxy-first request still gets one direct try", async () => {
    const f = vi.fn(async (u) => (proxyId(String(u)) === "dev-proxy" ? ok({ p: 1 }) : Promise.reject(new TypeError("cors"))));
    vi.stubGlobal("fetch", f);
    await settle(fetchJSON(espn()));
    await vi.advanceTimersByTimeAsync(config.proxyFirstMs + 1000);
    f.mockClear();
    await settle(fetchJSON(espn("later")));
    expect(proxyId(String(f.mock.calls[0][0]))).toBe("direct"); // direct is tried first again

    resetNetState();
    // First a proxy has to be used (CORS blocked); later every proxy is down but the host now
    // allows direct access: the proxy-first request still gets a last-resort direct attempt.
    let proxiesUp = true;
    let corsFixed = false;
    const g = vi.fn(async (u) => {
      if (isProxy(u)) return proxiesUp ? ok({ via: "proxy" }) : Promise.reject(new TypeError("down"));
      return corsFixed ? ok({ via: "direct" }) : Promise.reject(new TypeError("cors"));
    });
    vi.stubGlobal("fetch", g);
    expect((await settle(fetchJSON(espn()))).v).toEqual({ via: "proxy" });
    proxiesUp = false;
    corsFixed = true;
    g.mockClear();
    expect((await settle(fetchJSON(espn("again")))).v).toEqual({ via: "direct" });
    const order = g.mock.calls.map(([u]) => proxyId(String(u)));
    expect(order[0]).not.toBe("direct"); // proxy-first
    expect(order.at(-1)).toBe("direct"); // then the direct last resort
    expect(getNetDiagnostics().proxyFirst).not.toContain("site.api.espn.com"); // flag cleared
  });
  it("a proxy that keeps failing is skipped for a while (circuit breaker)", async () => {
    const f = vi.fn(async () => { throw new TypeError("x"); });
    vi.stubGlobal("fetch", f);
    await settle(fetchJSON(espn())); // failure 1 for every proxy
    await settle(fetchJSON(espn())); // failure 2: circuits open
    f.mockClear();
    const { e } = await settle(fetchJSON(espn()));
    expect(f).toHaveBeenCalledTimes(1); // direct only; no proxy is bothered
    expect(e.kind).toBe("network");
    const d = getNetDiagnostics();
    for (const p of PROXIES) expect(d.providers[p.id].circuitOpenUntil).toBeGreaterThan(Date.now());

    await vi.advanceTimersByTimeAsync(config.circuit.openMs + 1000);
    f.mockClear();
    await settle(fetchJSON(espn()));
    expect(f.mock.calls.length).toBeGreaterThan(1); // proxies are tried again after the cool-down
  });
  it("a successful proxy resets its failure count", async () => {
    let healthy = false;
    const f = vi.fn(async (u) => (proxyId(String(u)) === "allorigins" && healthy ? ok({ ok: 1 }) : Promise.reject(new TypeError("x"))));
    vi.stubGlobal("fetch", f);
    await settle(fetchJSON(espn())); // allorigins fails once
    healthy = true;
    await settle(fetchJSON(espn())); // succeeds: resets
    const d = getNetDiagnostics();
    expect(d.providers.allorigins.ok).toBe(1);
    expect(d.providers.allorigins.circuitOpenUntil).toBeNull();
  });
  it("respects skipDirect and proxy:false", async () => {
    const f = vi.fn(async () => { throw new TypeError("x"); });
    vi.stubGlobal("fetch", f);
    await settle(fetchJSON(espn(), { proxy: false }));
    expect(f).toHaveBeenCalledTimes(1);
    f.mockClear();
    await settle(fetchJSON(espn(), { skipDirect: true }));
    expect(f.mock.calls.every(([u]) => isProxy(u))).toBe(true);
  });
  it("all attempts share the overall 5s budget", async () => {
    const hang = (_u, { signal }) => new Promise((_r, rej) => signal.addEventListener("abort", () => rej(Object.assign(new Error("a"), { name: "AbortError" }))));
    vi.stubGlobal("fetch", vi.fn((u, init) => (isProxy(u) ? hang(u, init) : Promise.reject(new TypeError("cors")))));
    const t0 = Date.now();
    const p = settle(fetchJSON(espn()), 5100);
    const { e } = await p;
    expect(e).toBeInstanceOf(FetchError);
    expect(Date.now() - t0).toBeLessThanOrEqual(5200);
  });
});

describe("diagnostics", () => {
  it("records per-provider requests, failures by kind, and the fallback log", async () => {
    const f = vi.fn(async (u) => (proxyId(String(u)) === "dev-proxy" ? ok({ p: 1 }) : Promise.reject(new TypeError("cors"))));
    vi.stubGlobal("fetch", f);
    await settle(fetchJSON(espn()));
    const d = getNetDiagnostics();
    expect(d.providers["direct:site.api.espn.com"]).toMatchObject({ requests: 1, ok: 0, failures: { network: 1 } });
    expect(d.providers["dev-proxy"]).toMatchObject({ requests: 1, ok: 1 });
    expect(d.fallbacks).toEqual([expect.objectContaining({ host: "site.api.espn.com", via: "dev-proxy", outcome: "ok", after: "network" })]);
    expect(d.providers["dev-proxy"].avgMs).not.toBeNull();
  });
  it("tracks last error details per provider", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => status(500)));
    await settle(fetchJSON(espn()));
    expect(getNetDiagnostics().providers["direct:site.api.espn.com"].lastError).toMatchObject({ kind: "http", status: 500, message: "HTTP 500" });
  });
  it("includes cache statistics", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ok({ a: 1 })));
    const u = espn("roster");
    await settle(fetchJSON(u));
    await settle(fetchJSON(u));
    const { memo } = getNetDiagnostics();
    expect(memo).toMatchObject({ hits: 1, misses: 1, size: 1 });
    expect(memo.byCategory.roster).toMatchObject({ hits: 1, misses: 1 });
  });
});

describe("response cache", () => {
  it("categorises URLs", () => {
    expect(categoryOf("https://x/teams/359/schedule?fixture=true")).toBe("live");
    expect(categoryOf("https://x/summary?event=1")).toBe("live");
    expect(categoryOf("https://x/teams/359/roster")).toBe("roster");
    expect(categoryOf("https://x/eng.1/standings")).toBe("standings");
    expect(categoryOf("https://x/athletes/1/stats")).toBe("stats");
    expect(categoryOf("https://x/eng.1/news")).toBe("news");
    expect(categoryOf("https://api.rss2json.com/v1/api.json?rss_url=y")).toBe("news");
    expect(categoryOf("https://x/other")).toBe("default");
  });
  it("TTL differs by category: live data expires in 30s, rosters in 2 minutes", async () => {
    const f = vi.fn(async () => ok({ v: 1 }));
    vi.stubGlobal("fetch", f);
    const live = espn("teams/schedule");
    const roster = "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams/359/roster";
    await settle(fetchJSON(live));
    await settle(fetchJSON(roster));
    f.mockClear();
    await vi.advanceTimersByTimeAsync(31e3);
    await settle(fetchJSON(live)); // expired -> network
    await settle(fetchJSON(roster)); // still cached
    expect(f.mock.calls.map(([u]) => String(u))).toEqual([live]);
    await vi.advanceTimersByTimeAsync(100e3);
    f.mockClear();
    await settle(fetchJSON(roster)); // 131s old -> expired
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("TTLs are configurable", async () => {
    const f = vi.fn(async () => ok({ v: 1 }));
    vi.stubGlobal("fetch", f);
    configureNet({ ttl: { roster: 1000 } });
    const u = "https://site.api.espn.com/apis/x/roster/1";
    await settle(fetchJSON(u));
    await vi.advanceTimersByTimeAsync(1100);
    await settle(fetchJSON(u));
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("is bounded: the least recently used response is evicted", async () => {
    const f = vi.fn(async () => ok({ v: 1 }));
    vi.stubGlobal("fetch", f);
    configureNet({ memoMax: 2 });
    const [a, b, c] = [espn(), espn(), espn()];
    await settle(fetchJSON(a));
    await settle(fetchJSON(b));
    await settle(fetchJSON(a)); // a is now more recent than b
    await settle(fetchJSON(c)); // evicts b
    expect(getNetDiagnostics().memo).toMatchObject({ size: 2, evictions: 1 });
    f.mockClear();
    await settle(fetchJSON(a)); // cached
    expect(f).not.toHaveBeenCalled();
    await settle(fetchJSON(b)); // was evicted
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("{ fresh: true } bypasses the cache for one call", async () => {
    const f = vi.fn(async () => ok({ v: 1 }));
    vi.stubGlobal("fetch", f);
    const u = espn();
    await settle(fetchJSON(u));
    await settle(fetchJSON(u, { fresh: true }));
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("failures are never cached", async () => {
    const f = vi.fn().mockResolvedValueOnce(status(404)).mockResolvedValueOnce(ok({ v: 2 }));
    vi.stubGlobal("fetch", f);
    const u = espn();
    expect((await settle(fetchJSON(u))).e).toBeInstanceOf(FetchError);
    expect((await settle(fetchJSON(u))).v).toEqual({ v: 2 });
  });
});

describe("in-flight requests and safe refresh", () => {
  it("simultaneous identical requests share one network call", async () => {
    let release;
    const f = vi.fn(() => new Promise((r) => { release = () => r(ok({ shared: 1 })); }));
    vi.stubGlobal("fetch", f);
    const u = espn();
    const all = Promise.all([fetchJSON(u), fetchJSON(u), fetchJSON(u)]);
    await vi.advanceTimersByTimeAsync(0);
    release();
    expect(await all).toEqual([{ shared: 1 }, { shared: 1 }, { shared: 1 }]);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("different URLs (or text vs json of the same URL) are not merged", async () => {
    const f = vi.fn(async () => ok({ v: 1 }));
    vi.stubGlobal("fetch", f);
    const u = espn();
    await Promise.all([fetchJSON(u), fetchJSON(u, { as: "text" }), fetchJSON(espn())]);
    expect(f).toHaveBeenCalledTimes(3);
  });
  it("a refresh (clearMemo) during a request starts a new one, and the older result cannot overwrite the cache", async () => {
    const resolvers = [];
    const f = vi.fn(() => new Promise((r) => resolvers.push((body) => r(ok(body)))));
    vi.stubGlobal("fetch", f);
    const u = espn();
    const older = fetchJSON(u);
    await vi.advanceTimersByTimeAsync(0);
    clearMemo(); // the Refresh button
    const newer = fetchJSON(u);
    await vi.advanceTimersByTimeAsync(0);
    expect(f).toHaveBeenCalledTimes(2); // not merged into the pre-refresh request
    resolvers[1]({ gen: "new" });
    await newer;
    resolvers[0]({ gen: "old" }); // the older response arrives last
    await older;
    f.mockClear();
    expect(await fetchJSON(u)).toEqual({ gen: "new" }); // served from cache, still the newer data
    expect(f).not.toHaveBeenCalled();
  });
  it("a failed request leaves no in-flight entry behind", async () => {
    const f = vi.fn().mockRejectedValueOnce(new TypeError("x")).mockResolvedValue(ok({ ok: 1 }));
    vi.stubGlobal("fetch", f);
    const u = espn();
    await settle(fetchJSON(u, { proxy: false }));
    expect((await settle(fetchJSON(u))).v).toEqual({ ok: 1 });
  });
});
