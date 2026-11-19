/**
 * Data layer: loaders and the `useHubData` hook.
 *
 * Layout of the data code:
 *   net.js          fetching: de-duplication, LRU response cache, proxies, retries, diagnostics
 *   parsers.js      ESPN parsers (validate structure, skip bad records, never invent values)
 *   availability.js player availability states
 *   feeds.js        RSS / ESPN news parsers
 *
 * Every source loads independently. The last good copy of each is cached in localStorage so the
 * page paints instantly on the next visit (clearly marked as cached), then refreshes in the background.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ARSENAL_FEEDS, OUTLETS, TEAM_ID, rss2json } from "./sources.js";
import { parseEspnNews, parseRss2Json, parseRssXml } from "./feeds.js";
import { fold } from "./news.js";
import { boundedPut, mergeWithArchive, readJSON, writeJSON } from "./storage.js";
import { FetchError } from "./errors.js";
import { OVERALL_TIMEOUT_MS, clearMemo, configureNet, fetchJSON, getNetDiagnostics } from "./net.js";
import { parseRoster, parseSchedules, parseStandings, parseSummary, parseTeam } from "./parsers.js";
import { persistentStats } from "./diagnostics.js";
import { arr, isObj, str } from "./validate.js";
import { bumpRefreshEpoch } from "./refresh.js";

export { FetchError, OVERALL_TIMEOUT_MS, clearMemo, configureNet, fetchJSON };
export { competitionOf, isFriendlySlug, logoOf, num, parseEvent, parseRoster, parseSchedules, parseStandings, parseSummary } from "./parsers.js";

export const WOMEN_ID = "19973";
export { TEAM_ID };

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer";

export const URLS = {
  // `soccer/all` includes cup + European games; eng.1 is the fallback
  scheduleAll: `${ESPN}/all/teams/${TEAM_ID}/schedule`,
  scheduleLeague: `${ESPN}/eng.1/teams/${TEAM_ID}/schedule`,
  roster: `${ESPN}/eng.1/teams/${TEAM_ID}/roster`,
  standings: "https://site.web.api.espn.com/apis/v2/sports/soccer/eng.1/standings",
  team: `${ESPN}/eng.1/teams/${TEAM_ID}`,
  leagueNews: `${ESPN}/eng.1/news`,
  uclNews: `${ESPN}/uefa.champions/news`,
  arsenalEspnNews: `${ESPN}/eng.1/news?team=${TEAM_ID}`,
  womenRoster: `${ESPN}/eng.w.1/teams/${WOMEN_ID}/roster`,
  womenScheduleAll: `${ESPN}/all/teams/${WOMEN_ID}/schedule`,
  womenScheduleLeague: `${ESPN}/eng.w.1/teams/${WOMEN_ID}/schedule`,
  womenStandings: "https://site.web.api.espn.com/apis/v2/sports/soccer/eng.w.1/standings",
  playerStats: (id, team, league) => `https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${id}/stats?team=${team}${league ? `&league=${league}` : ""}`,
  playerBio: (id) => `https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${id}/bio`,
  summary: (league, id) => `${ESPN}/${league || "all"}/summary?event=${id}`,
  athlete: (id) => `https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${id}`,
  search: (q) => `https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(q)}&limit=5`,
};

/* ────────────────────────────── Feeds ────────────────────────────── */

const MAX_RAW_ITEMS = 25;

/**
 * An RSS feed: rss2json first (fast, CORS-enabled), then the raw XML through
 * the proxy chain if rss2json refuses (it rate-limits "new" feeds per IP).
 */
export async function fetchFeed(outletId, scope = "arsenal") {
  const url = OUTLETS[outletId].feed;
  let directFailed = false;
  if (OUTLETS[outletId].cors) {
    try {
      const xml = await fetchJSON(url, { as: "text", timeoutMs: 8000, proxy: false });
      return { items: parseRssXml(xml, outletId, scope).slice(0, MAX_RAW_ITEMS), via: "direct" };
    } catch { directFailed = true; /* fall through to rss2json */ }
  }
  try {
    const json = await fetchJSON(rss2json(url), { proxy: false });
    if (!isObj(json) || json.status !== "ok") throw new FetchError((isObj(json) && str(json.message)) || "Feed unavailable", "data");
    return { items: parseRss2Json(json, outletId, scope), via: "rss2json" };
  } catch (first) {
    try {
      // Don't repeat a direct request that has just failed; only the proxy chain is left to try.
      const xml = await fetchJSON(url, { as: "text", timeoutMs: 8000, skipDirect: directFailed });
      return { items: parseRssXml(xml, outletId, scope).slice(0, MAX_RAW_ITEMS), via: "direct" };
    } catch {
      throw new FetchError(first.kind === "ratelimit" || /rate|short period/i.test(first.message) ? "Rate limited" : first.message, first.kind);
    }
  }
}

/* ────────────────────────────── Match detail ────────────────────────────── */

export async function fetchMatchSummary(match, { fresh = false } = {}) {
  const json = await fetchJSON(URLS.summary(match.leagueSlug, match.id), { fresh });
  return parseSummary(json);
}

/* ────────────────────────────── Player lookup ────────────────────────────── */

const LOOKUP_KEY = "afc-player-lookup-v2";
const LOOKUP_TTL = 7 * 86400e3;
const LOOKUP_MAX = 200; // names remembered (oldest dropped first)

/**
 * Resolve possible transfer targets to real players via ESPN search. Accepted
 * only when exactly one *player* result has the same (accent-folded) name.
 * Results (including misses) are cached for a week.
 */
export async function lookupPlayers(names, max = 8) {
  const cache = readJSON(LOOKUP_KEY, {});
  const now = Date.now();
  const todo = names.filter((n) => !isObj(cache[fold(n)]) || now - (cache[fold(n)].at ?? 0) > LOOKUP_TTL).slice(0, max);
  await Promise.allSettled(todo.map(async (name) => {
    const json = await fetchJSON(URLS.search(name), { proxy: false, timeoutMs: 8000 });
    if (!isObj(json)) throw new FetchError("Unexpected response format (player search)", "data");
    const players = arr(json.results).filter((r) => isObj(r) && r.type === "player").flatMap((r) => arr(r.contents)).filter(isObj);
    const exact = players.filter((p) => fold(p.displayName ?? "") === fold(name) && p.sport === "soccer");
    const hit = exact.length === 1 ? exact[0] : null;
    const id = hit?.uid?.match?.(/a:(\d+)/)?.[1] ?? null;
    if (!hit || !id) {
      boundedPut(cache, fold(name), { at: now, miss: true }, LOOKUP_MAX);
      return;
    }
    // Search's subtitle can be a national team, so read club/age/position from the athlete profile.
    let profile = null;
    try {
      const p = await fetchJSON(URLS.athlete(id), { proxy: false, timeoutMs: 8000 });
      profile = isObj(p?.athlete) ? p.athlete : null;
    } catch { /* profile optional; club stays unknown */ }
    boundedPut(cache, fold(name), {
      at: now,
      name: hit.displayName,
      id,
      club: str(profile?.team?.displayName),
      position: str(profile?.position?.displayName),
      age: Number.isFinite(Number(profile?.age)) && profile?.age !== "" && profile?.age != null ? Number(profile.age) : null,
      link: hit.link?.web ?? null,
    }, LOOKUP_MAX);
  }));
  writeJSON(LOOKUP_KEY, cache);
  return Object.fromEntries(Object.entries(cache).filter(([, v]) => isObj(v) && !v.miss));
}

/* ────────────────────────────── Loaders ────────────────────────────── */

/** Cap each feed so one slow fallback chain can't hold up the whole news refresh. */
const withDeadline = (p, ms) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new FetchError("Timed out", "timeout")), ms))]);

async function loadFeeds(list) {
  // 8s: healthy feeds answer in 1–2s; a feed still on its proxy fallback chain
  // after that rarely succeeds and shouldn't keep a first-time visitor waiting.
  const settled = await Promise.allSettled(list.map(([, fn]) => withDeadline(fn(), 8000)));
  const feeds = settled.map((s, i) => ({
    id: list[i][0],
    name: OUTLETS[list[i][0]]?.name ?? list[i][0],
    ok: s.status === "fulfilled",
    count: s.status === "fulfilled" ? s.value.items.length : 0,
    via: s.status === "fulfilled" ? s.value.via : null,
    error: s.status === "rejected" ? s.reason?.message ?? "failed" : null,
  }));
  const items = settled.flatMap((s) => (s.status === "fulfilled" ? s.value.items : []));
  return { items, feeds };
}

/** Each loader returns { data, warnings[] } or throws if nothing usable came back. */
export const LOADERS = {
  schedule: async () => {
    const tryPair = (base) => Promise.all([fetchJSON(base), fetchJSON(`${base}?fixture=true`)]);
    try {
      return { data: parseSchedules(await tryPair(URLS.scheduleAll)) };
    } catch {
      return { data: parseSchedules(await tryPair(URLS.scheduleLeague)), warnings: ["Showing Premier League matches only"] };
    }
  },
  roster: async () => ({ data: parseRoster(await fetchJSON(URLS.roster)) }),
  standings: async () => ({ data: parseStandings(await fetchJSON(URLS.standings)) }),
  team: async () => ({ data: parseTeam(await fetchJSON(URLS.team)) }),
  // Women's team: loaded on demand (see LAZY_SOURCES), kept entirely separate from the men's data.
  womenRoster: async () => ({ data: parseRoster(await fetchJSON(URLS.womenRoster)) }),
  womenSchedule: async () => {
    const tryPair = (base) => Promise.all([fetchJSON(base), fetchJSON(`${base}?fixture=true`)]);
    try {
      return { data: parseSchedules(await tryPair(URLS.womenScheduleAll), WOMEN_ID) };
    } catch {
      return { data: parseSchedules(await tryPair(URLS.womenScheduleLeague), WOMEN_ID), warnings: ["Showing Women's Super League matches only"] };
    }
  },
  womenStandings: async () => ({ data: parseStandings(await fetchJSON(URLS.womenStandings)) }),
  arsenalNews: async () => {
    const list = [
      ...ARSENAL_FEEDS.map((id) => [id, () => fetchFeed(id, "arsenal")]),
      ["espn", () => fetchJSON(URLS.arsenalEspnNews).then((j) => ({ items: parseEspnNews(j, "arsenal"), via: "api" }))],
    ];
    const { items: fresh, feeds } = await loadFeeds(list);
    if (!fresh.length) throw new FetchError(feeds.map((f) => `${f.name}: ${f.error}`).join(" · ") || "No Arsenal news available", "data");
    const items = mergeWithArchive(fresh);
    const failed = feeds.filter((f) => !f.ok);
    return { data: { items, feeds, fetchedCount: fresh.length }, warnings: failed.map((f) => `${f.name}: ${f.error}`) };
  },
  worldNews: async () => {
    const list = [
      ["pl", () => fetchJSON(URLS.leagueNews).then((j) => ({ items: parseEspnNews(j, "league"), via: "api" }))],
      ["ucl", () => fetchJSON(URLS.uclNews).then((j) => ({ items: parseEspnNews(j, "ucl"), via: "api" }))],
    ];
    const { items, feeds } = await loadFeeds(list);
    if (!items.length) throw new FetchError("No football news available", "data");
    return { data: { items, feeds }, warnings: feeds.filter((f) => !f.ok).map((f) => `${f.id}: ${f.error}`) };
  },
};

// ESPN's /teams/:id sends no CORS header, so on static hosts (GitHub Pages) it
// only works via slow public proxies. Everything it provides is also derived
// from schedule + standings, so it's treated as optional enrichment: it never
// blocks the "refreshing" state and never counts as a failed source.
export const OPTIONAL_SOURCES = new Set(["team"]);

// Only fetched once a page that needs them is opened.
export const LAZY_SOURCES = new Set(["womenRoster", "womenSchedule", "womenStandings"]);

/* ────────────────────────────── Persistent cache ────────────────────────────── */

const CACHE_KEY = "afc-cache-v2";

/**
 * Settings for the last-good-copy cache in localStorage.
 *   maxBytes   serialised size cap; the oldest-saved sources are evicted to stay under it
 *   maxAgeMs   how long a saved source may still be shown, per source key, with a "default"
 */
export const cacheConfig = {
  maxBytes: 1_500_000,
  maxAgeMs: { default: 3 * 86400e3 },
};

export function configureCache(partial = {}) {
  if (partial.maxBytes != null) cacheConfig.maxBytes = partial.maxBytes;
  if (partial.maxAgeMs) Object.assign(cacheConfig.maxAgeMs, partial.maxAgeMs);
}
const maxAgeOf = (key) => cacheConfig.maxAgeMs[key] ?? cacheConfig.maxAgeMs.default;

const DATE_KEYS = new Set(["date", "updated", "savedAt", "dob"]);
const revive = (k, v) => (DATE_KEYS.has(k) && typeof v === "string" ? new Date(v) : v);
const validDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());

/**
 * Cached data crosses a JSON round trip (and possibly an older version of the app), so check it
 * before it reaches the UI: anything that would later throw on `match.date.getTime()` is dropped.
 */
function sanitizeSchedule(data) {
  if (!data || !Array.isArray(data.fixtures) || !Array.isArray(data.results)) return null;
  const ok = (m) => m && typeof m === "object" && validDate(m.date);
  return { ...data, fixtures: data.fixtures.filter(ok), results: data.results.filter(ok) };
}
const CACHE_CHECKS = { schedule: sanitizeSchedule, womenSchedule: sanitizeSchedule };

/** Saved sources that are still within their maximum age and well-formed: { [key]: { data, savedAt } }. */
export function readCache(now = Date.now()) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw, revive);
    const out = {};
    for (const [key, v] of Object.entries(isObj(parsed) ? parsed : {})) {
      if (!validDate(v?.savedAt)) continue;
      if (now - v.savedAt.getTime() >= maxAgeOf(key)) {
        persistentStats.expired++;
        continue;
      }
      const data = CACHE_CHECKS[key] ? CACHE_CHECKS[key](v.data) : v.data;
      if (data != null) out[key] = { ...v, data };
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Saves one source. If the whole cache would exceed `maxBytes`, or the browser refuses the write
 * (quota), the oldest-saved *other* sources are evicted first. Returns whether the write happened.
 */
export function writeCache(key, data, savedAt = new Date()) {
  try {
    const all = readJSON(CACHE_KEY, {});
    all[key] = { data, savedAt };
    const oldestOther = () => Object.entries(all).filter(([k]) => k !== key).sort((a, b) => new Date(a[1]?.savedAt ?? 0) - new Date(b[1]?.savedAt ?? 0))[0];
    let json = JSON.stringify(all);
    while (json.length > cacheConfig.maxBytes) {
      const victim = oldestOther();
      if (!victim) { persistentStats.rejected++; return false; } // this source alone is over the limit
      delete all[victim[0]];
      persistentStats.evicted++;
      json = JSON.stringify(all);
    }
    for (let tries = 0; ; tries++) {
      try {
        localStorage.setItem(CACHE_KEY, json);
        persistentStats.bytes = json.length;
        return true;
      } catch (err) {
        const victim = tries < 4 ? oldestOther() : null;
        if (!victim) throw err;
        delete all[victim[0]];
        persistentStats.evicted++;
        json = JSON.stringify(all);
      }
    }
  } catch {
    persistentStats.writeFailures++; // storage full or unavailable: caching is optional
    return false;
  }
}

/** Cache and provider counters for debugging; also available in the console as `afcDiagnostics()`. */
export const getDiagnostics = () => getNetDiagnostics();
if (typeof window !== "undefined") window.afcDiagnostics = getDiagnostics;

/* ────────────────────────────── Hook ────────────────────────────── */

const initialSource = { status: "loading", data: null, error: null, warnings: [], savedAt: null };
const AUTO_REFRESH_MS = 10 * 60e3;
const MATCH_POLL_MS = 60e3;

export function useHubData() {
  const [sources, setSources] = useState(() => {
    const cached = readCache();
    for (const k of Object.keys(LOADERS)) cached[k] ? persistentStats.hits++ : persistentStats.misses++;
    return Object.fromEntries(Object.keys(LOADERS).map((k) => [
      k,
      cached[k]
        ? { ...initialSource, status: "cached", data: cached[k].data, savedAt: cached[k].savedAt }
        : LAZY_SOURCES.has(k) ? { ...initialSource, status: "idle" } : initialSource,
    ]));
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const lastRefresh = useRef(0);
  const activated = useRef(new Set());
  const flight = useRef(new Map()); // source key -> promise of the request in progress
  const latest = useRef(new Map()); // source key -> token of the newest request; older results are ignored
  const counter = useRef(0);

  /**
   * Loads one source. A request already in progress is shared rather than duplicated, unless
   * `force` is set (the Refresh button), in which case a new request starts and the older one's
   * result is discarded so it can't overwrite fresher data.
   */
  const load = useCallback((key, { force = false } = {}) => {
    if (!force && flight.current.has(key)) return flight.current.get(key);
    const token = ++counter.current;
    latest.current.set(key, token);
    const current = () => latest.current.get(key) === token;
    setSources((s) => ({ ...s, [key]: { ...s[key], status: s[key].data ? "refreshing" : "loading", error: null } }));
    const p = (async () => {
      try {
        const { data, warnings = [] } = await LOADERS[key]();
        if (!current()) return true;
        const savedAt = new Date();
        writeCache(key, data, savedAt);
        setSources((s) => ({ ...s, [key]: { status: "ok", data, error: null, warnings, savedAt } }));
        return true;
      } catch (err) {
        // Keep previously loaded data (if any) and surface the error alongside it.
        if (current()) setSources((s) => ({ ...s, [key]: { ...s[key], status: "error", error: err?.message ?? "Failed to load" } }));
        return false;
      }
    })().finally(() => { if (flight.current.get(key) === p) flight.current.delete(key); });
    flight.current.set(key, p);
    return p;
  }, []);

  /** Start loading an on-demand source the first time a page needs it. */
  const ensure = useCallback((key) => {
    if (activated.current.has(key)) return;
    activated.current.add(key);
    load(key);
  }, [load]);

  // `initial` is the automatic refresh on page load: pages that were just opened already fetched their
  // own detail data, so only later refreshes are broadcast to them (see refresh.js).
  const refreshAll = useCallback(async ({ initial = false } = {}) => {
    setRefreshing(true);
    lastRefresh.current = Date.now();
    clearMemo();
    const keys = Object.keys(LOADERS).filter((k) => !LAZY_SOURCES.has(k) || activated.current.has(k));
    keys.filter((k) => OPTIONAL_SOURCES.has(k)).forEach((k) => load(k, { force: true })); // fire and forget
    const results = await Promise.all(keys.filter((k) => !OPTIONAL_SOURCES.has(k)).map((k) => load(k, { force: true })));
    // "Last refreshed" means data actually arrived, not just that we tried.
    if (results.some(Boolean)) {
      setLastUpdated(new Date());
      if (!initial) bumpRefreshEpoch();
    }
    setRefreshing(false);
  }, [load]);

  // Fetch fresh data on every page load (guarded so StrictMode's double-mount
  // in dev doesn't double-hit rate-limited feeds).
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    refreshAll({ initial: true });
  }, [refreshAll]);

  // Background refresh: every 10 min while visible, and on return to the tab.
  useEffect(() => {
    const maybe = () => {
      if (document.visibilityState === "visible" && Date.now() - lastRefresh.current > AUTO_REFRESH_MS) refreshAll();
    };
    const id = setInterval(maybe, 60e3);
    document.addEventListener("visibilitychange", maybe);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", maybe);
    };
  }, [refreshAll]);

  // Matchday: poll the schedule every minute while a match is in play or about to start.
  const fixtures = sources.schedule.data?.fixtures;
  const matchWindow = !!fixtures?.some((m) => {
    const dt = m.date.getTime() - Date.now();
    return m.state === "in" || (dt < 15 * 60e3 && dt > -3 * 3600e3);
  });
  useEffect(() => {
    if (!matchWindow) return undefined;
    const id = setInterval(() => document.visibilityState === "visible" && load("schedule"), MATCH_POLL_MS);
    return () => clearInterval(id);
  }, [matchWindow, load]);

  return { sources, load, ensure, refreshAll, refreshing, lastUpdated, matchWindow };
}
