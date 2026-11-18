/**
 * Data layer: fetching, ESPN parsers, loaders and the `useHubData` hook.
 *
 * Every source loads independently. The last good copy of each is cached in
 * localStorage so the page paints instantly on the next visit (clearly marked
 * as cached), then refreshes in the background.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ARSENAL_FEEDS, OUTLETS, TEAM_ID, rss2json } from "./sources.js";
import { parseEspnNews, parseRss2Json, parseRssXml } from "./feeds.js";
import { fold } from "./news.js";
import { mergeWithArchive, readJSON, writeJSON } from "./storage.js";

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
  summary: (league, id) => `${ESPN}/${league || "all"}/summary?event=${id}`,
  athlete: (id) => `https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${id}`,
  search: (q) =>`https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(q)}&limit=5`,
};

// Tried in order only when a direct request fails with a network/CORS error.
// 1) same-origin proxy from vite.config.js — local dev only (static hosts like
//    GitHub Pages can't run it); 2+) public fallbacks, best-effort.
const IS_DEV = Boolean(import.meta.env?.DEV);
const CORS_PROXIES = [
  ...(IS_DEV ? [(url) => `/__proxy?url=${encodeURIComponent(url)}`] : []),
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

/* ────────────────────────────── Fetching ────────────────────────────── */

export class FetchError extends Error {
  constructor(message, kind) {
    super(message);
    this.kind = kind; // "network" | "http" | "ratelimit" | "timeout" | "data"
  }
}

async function fetchOnce(url, timeoutMs, as = "json") {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    if (res.status === 429) throw new FetchError("Rate limited by the data provider", "ratelimit");
    if (!res.ok) throw new FetchError(`HTTP ${res.status}`, "http");
    return as === "text" ? await res.text() : await res.json();
  } catch (err) {
    if (err instanceof FetchError) throw err;
    if (err.name === "AbortError") throw new FetchError("Request timed out", "timeout");
    if (err instanceof SyntaxError) throw new FetchError("Unexpected response format", "data");
    // TypeError: Failed to fetch → offline, DNS, or blocked by CORS
    throw new FetchError("Network error or blocked by CORS", "network");
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch with no caching; retry through a CORS proxy on network/CORS failure. */
export async function fetchJSON(url, { timeoutMs = 12000, proxy = true, as = "json" } = {}) {
  try {
    return await fetchOnce(url, timeoutMs, as);
  } catch (err) {
    if (!proxy || (err.kind !== "network" && err.kind !== "timeout")) throw err;
    for (const wrap of CORS_PROXIES) {
      try {
        return await fetchOnce(wrap(url), 9000, as);
      } catch { /* try next proxy */ }
    }
    throw new FetchError(`${err.message}; CORS proxies also unavailable`, err.kind);
  }
}

const MAX_RAW_ITEMS = 25;

/**
 * An RSS feed: rss2json first (fast, CORS-enabled), then the raw XML through
 * the proxy chain if rss2json refuses (it rate-limits "new" feeds per IP).
 */
export async function fetchFeed(outletId, scope = "arsenal") {
  const url = OUTLETS[outletId].feed;
  if (OUTLETS[outletId].cors) {
    try {
      const xml = await fetchJSON(url, { as: "text", timeoutMs: 8000, proxy: false });
      return { items: parseRssXml(xml, outletId, scope).slice(0, MAX_RAW_ITEMS), via: "direct" };
    } catch { /* fall through to rss2json */ }
  }
  try {
    const json = await fetchJSON(rss2json(url), { proxy: false });
    if (json?.status !== "ok") throw new FetchError(json?.message || "Feed unavailable", "data");
    return { items: parseRss2Json(json, outletId, scope), via: "rss2json" };
  } catch (first) {
    try {
      const xml = await fetchJSON(url, { as: "text", timeoutMs: 8000 });
      return { items: parseRssXml(xml, outletId, scope).slice(0, MAX_RAW_ITEMS), via: "direct" };
    } catch {
      throw new FetchError(/rate|short period/i.test(first.message) ? "Rate limited" : first.message, first.kind);
    }
  }
}

/* ────────────────────────────── ESPN parsers ────────────────────────────── */

export const num = (v) => {
  if (v == null) return null;
  if (typeof v === "object") v = v.value ?? v.displayValue;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const logoOf = (team) =>
  team?.logos?.[0]?.href || team?.logo || (team?.id ? `https://a.espncdn.com/i/teamlogos/soccer/500/${team.id}.png` : null);

/** League slug → readable competition names. */
const COMPETITIONS = {
  "eng.1": { name: "Premier League", short: "PL" },
  "uefa.champions": { name: "Champions League", short: "UCL" },
  "eng.fa": { name: "FA Cup", short: "FA Cup" },
  "eng.league_cup": { name: "Carabao Cup", short: "Carabao" },
  "uefa.europa": { name: "Europa League", short: "UEL" },
  "eng.charity": { name: "Community Shield", short: "Shield" },
};
export const isFriendlySlug = (slug = "") => /friendly|emirates_cup|club\.|preseason/i.test(slug);

export function competitionOf(slug, fallback) {
  if (COMPETITIONS[slug]) return COMPETITIONS[slug];
  if (isFriendlySlug(slug)) return { name: "Friendly", short: "Friendly" };
  return { name: fallback || "Match", short: fallback || "Match" };
}

export function parseEvent(e) {
  const comp = e.competitions?.[0] ?? {};
  const status = comp.status?.type ?? e.status?.type ?? {};
  const sides = (comp.competitors ?? []).map((c) => ({
    id: String(c.team?.id ?? c.id),
    name: c.team?.displayName ?? c.team?.name ?? "TBD",
    short: c.team?.shortDisplayName ?? c.team?.displayName,
    abbr: c.team?.abbreviation ?? "",
    logo: logoOf(c.team),
    homeAway: c.homeAway,
    score: num(c.score),
    shootout: num(c.shootoutScore),
  }));
  const ars = sides.find((s) => s.id === TEAM_ID);
  const opp = sides.find((s) => s.id !== TEAM_ID);
  const home = sides.find((s) => s.homeAway === "home") ?? sides[0];
  const away = sides.find((s) => s.homeAway === "away") ?? sides[1];
  const state = status.state ?? "pre"; // pre | in | post
  let result = null;
  if (state === "post" && ars?.score != null && opp?.score != null) {
    if (ars.score > opp.score) result = "W";
    else if (ars.score < opp.score) result = "L";
    else if (ars.shootout != null && opp.shootout != null) result = ars.shootout > opp.shootout ? "W" : "L";
    else result = "D";
  }
  const slug = e.league?.slug ?? comp.league?.slug ?? "";
  const c = competitionOf(slug, e.league?.abbreviation || e.league?.name || comp.type?.text);
  return {
    id: e.id,
    date: new Date(e.date),
    leagueSlug: slug,
    competition: c.name,
    compShort: c.short,
    friendly: isFriendlySlug(slug),
    venue: comp.venue?.fullName ?? null,
    city: comp.venue?.address?.city ?? null,
    state,
    completed: !!status.completed,
    statusDetail: status.shortDetail || status.detail || status.description,
    clock: comp.status?.displayClock,
    postponed: /postponed|canceled|cancelled/i.test(status.name || status.description || ""),
    isHome: ars?.homeAway === "home",
    home, away, ars, opp, result,
  };
}

export function parseSchedules(jsons) {
  const byId = new Map();
  for (const j of jsons) for (const e of j?.events ?? []) byId.set(e.id, parseEvent(e));
  const all = [...byId.values()];
  const results = all.filter((m) => m.state === "post" && !m.postponed).sort((a, b) => b.date - a.date);
  const fixtures = all.filter((m) => m.state !== "post").sort((a, b) => a.date - b.date);
  return { results, fixtures };
}

function availabilityOf(athlete) {
  const inj = athlete.injuries?.[0];
  const raw = `${inj?.status ?? ""} ${inj?.type?.description ?? ""} ${inj?.details?.type ?? ""}`.toLowerCase();
  if (inj) {
    if (/questionable|doubt|day-to-day|probable/.test(raw)) return { key: "doubtful", label: "Doubtful", detail: inj.details?.type || inj.status };
    return { key: "injured", label: "Injured", detail: inj.details?.type || inj.status || "Injury" };
  }
  if (athlete.suspended || /suspend/i.test(athlete.status?.name ?? "")) return { key: "injured", label: "Suspended" };
  return { key: "available", label: "Available" };
}

export function parseRoster(json) {
  const groupOf = (p) => {
    const a = (p?.abbreviation || p?.name || "").toUpperCase();
    if (a.startsWith("G")) return "Goalkeepers";
    if (a.startsWith("D")) return "Defenders";
    if (a.startsWith("M")) return "Midfielders";
    return "Forwards";
  };
  const players = (json?.athletes ?? []).map((a) => {
    const stats = {};
    for (const cat of a.statistics?.splits?.categories ?? [])
      for (const s of cat.stats ?? []) stats[s.name] = num(s.value);
    return {
      id: a.id,
      name: a.displayName,
      shortName: a.shortName,
      lastName: a.lastName || a.displayName,
      jersey: a.jersey ?? "",
      position: a.position?.displayName ?? a.position?.name ?? "",
      group: groupOf(a.position),
      age: a.age,
      nationality: a.citizenship,
      flag: a.flag?.href,
      photo: a.headshot?.href || `https://a.espncdn.com/i/headshots/soccer/players/full/${a.id}.png`,
      link: a.links?.find((l) => l.rel?.includes("playercard"))?.href,
      availability: availabilityOf(a),
      stats,
    };
  });
  const order = { Goalkeepers: 0, Defenders: 1, Midfielders: 2, Forwards: 3 };
  players.sort((x, y) => order[x.group] - order[y.group] || (Number(x.jersey) || 99) - (Number(y.jersey) || 99));
  return { players };
}

export function parseStandings(json) {
  const entries = json?.children?.[0]?.standings?.entries ?? json?.standings?.entries ?? [];
  const rows = entries.map((e) => {
    const s = Object.fromEntries((e.stats ?? []).map((x) => [x.name, x.value ?? num(x.displayValue)]));
    return {
      id: String(e.team?.id),
      name: e.team?.displayName,
      short: e.team?.shortDisplayName || e.team?.displayName,
      abbr: e.team?.abbreviation,
      logo: logoOf(e.team),
      rank: s.rank, gp: s.gamesPlayed, w: s.wins, d: s.ties, l: s.losses,
      gf: s.pointsFor, ga: s.pointsAgainst, gd: s.pointDifferential, pts: s.points,
      note: e.note ? { color: e.note.color, label: e.note.description } : null,
    };
  });
  rows.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  return { rows, season: json?.season?.displayName || json?.children?.[0]?.name || json?.name };
}

function parseTeam(json) {
  const t = json?.team ?? {};
  const total = t.record?.items?.find((i) => i.type === "total") ?? t.record?.items?.[0];
  const s = Object.fromEntries((total?.stats ?? []).map((x) => [x.name, x.value]));
  return { name: t.displayName, logo: logoOf(t), summary: t.standingSummary, record: total?.summary, stats: s };
}

/* ────────────────────────────── Match detail ────────────────────────────── */

const STAT_ROWS = [
  ["possessionPct", "Possession", "%"],
  ["totalShots", "Shots"],
  ["shotsOnTarget", "Shots on target"],
  ["wonCorners", "Corners"],
  ["passPct", "Pass accuracy", "pct"],
  ["saves", "Saves"],
  ["foulsCommitted", "Fouls"],
  ["offsides", "Offsides"],
  ["yellowCards", "Yellow cards"],
  ["redCards", "Red cards"],
];

/** ESPN match summary → lineups, events and team stats. Missing pieces stay empty. */
export function parseSummary(json) {
  const header = json?.header?.competitions?.[0];
  const teams = (json?.boxscore?.teams ?? []).map((t) => ({
    id: String(t.team?.id),
    name: t.team?.displayName,
    stats: Object.fromEntries((t.statistics ?? []).map((s) => [s.name, num(s.displayValue)])),
  }));
  const stats = teams.length === 2
    ? STAT_ROWS.filter(([k]) => teams.every((t) => t.stats[k] != null)).map(([k, label, unit]) => {
      const fmt = (v) => (unit === "pct" ? `${Math.round(v * 100)}%` : unit === "%" ? `${v}%` : String(v));
      return { key: k, label, home: teams[0].stats[k], away: teams[1].stats[k], fmt, teamIds: [teams[0].id, teams[1].id] };
    })
    : [];
  const lineups = (json?.rosters ?? []).map((r) => ({
    teamId: String(r.team?.id),
    team: r.team?.displayName,
    formation: r.formation ?? null,
    starters: (r.roster ?? []).filter((p) => p.starter).map(rosterPlayer),
    subs: (r.roster ?? []).filter((p) => !p.starter).map(rosterPlayer),
  })).filter((l) => l.starters.length);
  const events = (json?.keyEvents ?? []).flatMap((k) => {
    const type = k.type?.type ?? "";
    const kind = k.scoringPlay ? (/own/i.test(k.type?.text ?? "") ? "own-goal" : /penalty/i.test(k.type?.text ?? "") ? "penalty" : "goal")
      : /yellow/.test(type) ? "yellow" : /red/.test(type) ? "red" : type === "substitution" ? "sub" : null;
    if (!kind) return [];
    const names = (k.participants ?? []).map((p) => p.athlete?.displayName).filter(Boolean);
    let primary = names[0] ?? null;
    let secondary = names[1] ?? null;
    if (kind === "sub") {
      // "Substitution, Arsenal. A replaces B."
      const m = (k.text ?? "").match(/\.\s*(.+?) replaces (.+?)(?:\s+because.*)?\.?$/);
      if (m) { primary = m[1]; secondary = m[2]; }
    }
    return [{
      id: k.id,
      kind,
      minute: k.clock?.displayValue ?? "",
      teamId: String(k.team?.id ?? ""),
      primary,
      secondary, // assist for goals (only when ESPN names one), player off for subs
      text: k.text,
    }];
  });
  return {
    status: header?.status?.type,
    clock: header?.status?.displayClock,
    stats,
    lineups,
    events,
    attendance: json?.gameInfo?.attendance ?? null,
    referee: json?.gameInfo?.officials?.[0]?.displayName ?? null,
    venue: json?.gameInfo?.venue?.fullName ?? null,
  };
}

function rosterPlayer(p) {
  return {
    id: p.athlete?.id,
    name: p.athlete?.displayName,
    jersey: p.jersey,
    position: p.position?.abbreviation ?? "",
    subbedIn: !!p.subbedIn,
    subbedOut: !!p.subbedOut,
  };
}

export async function fetchMatchSummary(match) {
  const json = await fetchJSON(URLS.summary(match.leagueSlug, match.id));
  return parseSummary(json);
}

/* ────────────────────────────── Player lookup ────────────────────────────── */

const LOOKUP_KEY = "afc-player-lookup-v2";
const LOOKUP_TTL = 7 * 86400e3;

/**
 * Resolve possible transfer targets to real players via ESPN search. Accepted
 * only when exactly one *player* result has the same (accent-folded) name.
 * Results (including misses) are cached for a week.
 */
export async function lookupPlayers(names, max = 8) {
  const cache = readJSON(LOOKUP_KEY, {});
  const now = Date.now();
  const todo = names.filter((n) => !cache[fold(n)] || now - cache[fold(n)].at > LOOKUP_TTL).slice(0, max);
  await Promise.allSettled(todo.map(async (name) => {
    const json = await fetchJSON(URLS.search(name), { proxy: false, timeoutMs: 8000 });
    const players = (json?.results ?? []).filter((r) => r.type === "player").flatMap((r) => r.contents ?? []);
    const exact = players.filter((p) => fold(p.displayName) === fold(name) && p.sport === "soccer");
    const hit = exact.length === 1 ? exact[0] : null;
    const id = hit?.uid?.match(/a:(\d+)/)?.[1] ?? null;
    if (!hit || !id) {
      cache[fold(name)] = { at: now, miss: true };
      return;
    }
    // Search's subtitle can be a national team, so read club/age/position from the athlete profile.
    let profile = null;
    try {
      profile = (await fetchJSON(URLS.athlete(id), { proxy: false, timeoutMs: 8000 }))?.athlete ?? null;
    } catch { /* profile optional; club stays unknown */ }
    cache[fold(name)] = {
      at: now,
      name: hit.displayName,
      id,
      club: profile?.team?.displayName ?? null,
      position: profile?.position?.displayName ?? null,
      age: profile?.age ?? null,
      link: hit.link?.web ?? null,
    };
  }));
  writeJSON(LOOKUP_KEY, cache);
  return Object.fromEntries(Object.entries(cache).filter(([, v]) => !v.miss));
}

/* ────────────────────────────── Loaders ────────────────────────────── */

async function loadFeeds(list) {
  const settled = await Promise.allSettled(list.map(([, fn]) => fn()));
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

/* ────────────────────────────── Cache ────────────────────────────── */

const CACHE_KEY = "afc-cache-v2";
const CACHE_MAX_AGE = 3 * 86400e3; // older than this is not worth showing at all
const DATE_KEYS = new Set(["date", "updated", "savedAt"]);
const revive = (k, v) => (DATE_KEYS.has(k) && typeof v === "string" ? new Date(v) : v);

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw, revive);
    return Object.fromEntries(Object.entries(parsed).filter(([, v]) => v?.savedAt && Date.now() - v.savedAt.getTime() < CACHE_MAX_AGE));
  } catch {
    return {};
  }
}

function writeCache(key, data) {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    all[key] = { data, savedAt: new Date() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch { /* storage full or unavailable: caching is optional */ }
}

/* ────────────────────────────── Hook ────────────────────────────── */

const initialSource = { status: "loading", data: null, error: null, warnings: [], savedAt: null };
const AUTO_REFRESH_MS = 10 * 60e3;
const MATCH_POLL_MS = 60e3;

export function useHubData() {
  const [sources, setSources] = useState(() => {
    const cached = readCache();
    return Object.fromEntries(Object.keys(LOADERS).map((k) => [
      k,
      cached[k] ? { ...initialSource, status: "cached", data: cached[k].data, savedAt: cached[k].savedAt } : initialSource,
    ]));
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const lastRefresh = useRef(0);

  const load = useCallback(async (key) => {
    setSources((s) => ({ ...s, [key]: { ...s[key], status: s[key].data ? "refreshing" : "loading", error: null } }));
    try {
      const { data, warnings = [] } = await LOADERS[key]();
      const savedAt = new Date();
      writeCache(key, data);
      setSources((s) => ({ ...s, [key]: { status: "ok", data, error: null, warnings, savedAt } }));
    } catch (err) {
      // Keep previously loaded data (if any) and surface the error alongside it.
      setSources((s) => ({ ...s, [key]: { ...s[key], status: "error", error: err?.message ?? "Failed to load" } }));
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    lastRefresh.current = Date.now();
    const keys = Object.keys(LOADERS);
    keys.filter((k) => OPTIONAL_SOURCES.has(k)).forEach(load); // fire and forget
    await Promise.allSettled(keys.filter((k) => !OPTIONAL_SOURCES.has(k)).map(load));
    setLastUpdated(new Date());
    setRefreshing(false);
  }, [load]);

  // Fetch fresh data on every page load (guarded so StrictMode's double-mount
  // in dev doesn't double-hit rate-limited feeds).
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    refreshAll();
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
    if (!matchWindow) return;
    const id = setInterval(() => document.visibilityState === "visible" && load("schedule"), MATCH_POLL_MS);
    return () => clearInterval(id);
  }, [matchWindow, load]);

  return { sources, load, refreshAll, refreshing, lastUpdated, matchWindow };
}
