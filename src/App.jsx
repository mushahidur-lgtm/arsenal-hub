/**
 * Arsenal FC Live Hub — self-contained React component (src/App.jsx).
 *
 * Drop-in: needs only React, Tailwind CSS and lucide-react. All data is fetched
 * live from keyless public APIs on mount (and on "Refresh"), with
 * `cache: "no-store"`. Nothing is hardcoded — if a source fails, its section
 * shows an error with a retry button instead of stale/static content.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertTriangle, BarChart3, CalendarDays, ChevronRight, Clock, ExternalLink,
  Globe, Goal, Hand, HeartPulse, LayoutGrid, MapPin, Moon, Newspaper, PlayCircle,
  RefreshCw, Shield, ShieldCheck, Star, Sun, Target, Timer, Trophy, Users,
} from "lucide-react";

/* ────────────────────────────── Config ────────────────────────────── */

const TEAM_ID = "359";
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const RSS2JSON = "https://api.rss2json.com/v1/api.json?rss_url=";

const URLS = {
  // `soccer/all` includes cup + European games; eng.1 is the fallback
  scheduleAll: `${ESPN}/all/teams/${TEAM_ID}/schedule`,
  scheduleLeague: `${ESPN}/eng.1/teams/${TEAM_ID}/schedule`,
  roster: `${ESPN}/eng.1/teams/${TEAM_ID}/roster`,
  standings: "https://site.web.api.espn.com/apis/v2/sports/soccer/eng.1/standings",
  team: `${ESPN}/eng.1/teams/${TEAM_ID}`,
  leagueNews: `${ESPN}/eng.1/news`,
  uclNews: `${ESPN}/uefa.champions/news`,
  arsenalEspnNews: `${ESPN}/eng.1/news?team=${TEAM_ID}`,
  arseblog: RSS2JSON + encodeURIComponent("https://www.arseblog.com/feed/"),
  reddit: RSS2JSON + encodeURIComponent("https://www.reddit.com/r/Gunners/top/.rss?t=day"),
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

const C = { red: "var(--ars-red)", navy: "var(--ars-navy)", gold: "var(--ars-gold)" };

/* ────────────────────────────── Fetching ────────────────────────────── */

class FetchError extends Error {
  constructor(message, kind) {
    super(message);
    this.kind = kind; // "network" | "http" | "ratelimit" | "timeout" | "data"
  }
}

async function fetchOnce(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    if (res.status === 429) throw new FetchError("Rate limited by the data provider", "ratelimit");
    if (!res.ok) throw new FetchError(`HTTP ${res.status}`, "http");
    return await res.json();
  } catch (err) {
    if (err instanceof FetchError) throw err;
    if (err.name === "AbortError") throw new FetchError("Request timed out", "timeout");
    // TypeError: Failed to fetch → offline, DNS, or blocked by CORS
    throw new FetchError("Network error or blocked by CORS", "network");
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch JSON with no caching; retry through a CORS proxy on network/CORS failure. */
async function fetchJSON(url, { timeoutMs = 12000, proxy = true } = {}) {
  try {
    return await fetchOnce(url, timeoutMs);
  } catch (err) {
    if (!proxy || (err.kind !== "network" && err.kind !== "timeout")) throw err;
    for (const wrap of CORS_PROXIES) {
      try {
        return await fetchOnce(wrap(url), 8000);
      } catch { /* try next proxy */ }
    }
    throw new FetchError(`${err.message}; CORS proxies also unavailable`, err.kind);
  }
}

/** rss2json returns HTTP 200 with {status:"error"} when the feed host rate-limits. */
async function fetchRss(url) {
  const json = await fetchJSON(url, { proxy: false });
  if (json?.status !== "ok") {
    const msg = json?.message || "Feed unavailable";
    throw new FetchError(msg, /rate/i.test(msg) ? "ratelimit" : "data");
  }
  return json;
}

/* ────────────────────────────── Parsers ────────────────────────────── */

const num = (v) => {
  if (v == null) return null;
  if (typeof v === "object") v = v.value ?? v.displayValue;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const logoOf = (team) =>
  team?.logos?.[0]?.href || team?.logo || (team?.id ? `https://a.espncdn.com/i/teamlogos/soccer/500/${team.id}.png` : null);

function parseEvent(e) {
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
  return {
    id: e.id,
    date: new Date(e.date),
    competition: e.league?.abbreviation || e.league?.name || comp.type?.text || "Match",
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

function parseSchedules(jsons) {
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

function parseRoster(json) {
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
  return { players, coach: json?.coach?.[0] ? `${json.coach[0].firstName} ${json.coach[0].lastName}` : null };
}

function parseStandings(json) {
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
  return {
    name: t.displayName, logo: logoOf(t), summary: t.standingSummary,
    record: total?.summary, stats: s,
  };
}

const decode = (str = "") =>
  str.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#8217;/g, "’").replace(/&#8216;/g, "‘")
    .replace(/&#8220;/g, "“").replace(/&#8221;/g, "”").replace(/&#8211;/g, "–").replace(/&#8230;/g, "…")
    .replace(/&nbsp;/g, " ");
const stripHtml = (html = "") => decode(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const firstImg = (html = "") => {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? decode(m[1]) : null;
};
// rss2json gives "YYYY-MM-DD HH:mm:ss" in UTC with no zone marker
const rssDate = (s) => (s ? new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z") : null);

function parseRssItems(json, source) {
  return (json?.items ?? []).map((i) => {
    const body = i.content || i.description || "";
    const thumb = [i.thumbnail, i.enclosure?.link, firstImg(body)].find(
      (x) => x && /^https?:/.test(x) && !/redditstatic|self|default/.test(x)
    );
    let excerpt = stripHtml(i.description || "");
    if (source === "r/Gunners") excerpt = excerpt.replace(/submitted by.*$/i, "").trim();
    return {
      id: i.guid || i.link,
      title: decode(i.title),
      link: i.link,
      date: rssDate(i.pubDate),
      image: thumb || null,
      excerpt: excerpt.slice(0, 180),
      source,
    };
  });
}

function parseEspnNews(json, source = "ESPN") {
  return (json?.articles ?? []).map((a) => ({
    id: String(a.id ?? a.dataSourceIdentifier ?? a.headline),
    title: a.headline,
    link: a.links?.web?.href,
    date: a.published ? new Date(a.published) : null,
    image: a.images?.[0]?.url ?? null,
    excerpt: a.description && a.description !== a.headline ? a.description : "",
    source,
    video: a.type === "Media",
  }));
}

const mergeNews = (lists) => {
  const seen = new Set();
  return lists.flat().filter((n) => {
    if (!n.link || !n.title) return false;
    const key = n.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => (b.date ?? 0) - (a.date ?? 0));
};

/* ────────────────────────────── Data loaders ────────────────────────────── */

/** Each loader returns { data, warnings[] } or throws if nothing usable came back. */
const LOADERS = {
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
    const sources = [
      ["Arseblog", () => fetchRss(URLS.arseblog).then((j) => parseRssItems(j, "Arseblog"))],
      ["r/Gunners", () => fetchRss(URLS.reddit).then((j) => parseRssItems(j, "r/Gunners"))],
      ["ESPN", () => fetchJSON(URLS.arsenalEspnNews).then((j) => parseEspnNews(j, "ESPN"))],
    ];
    const settled = await Promise.allSettled(sources.map(([, fn]) => fn()));
    const ok = settled.filter((s) => s.status === "fulfilled").map((s) => s.value);
    const warnings = settled.flatMap((s, i) => (s.status === "rejected" ? [`${sources[i][0]}: ${s.reason?.message ?? "failed"}`] : []));
    const items = mergeNews(ok);
    if (!items.length) throw new FetchError(warnings.join(" · ") || "No Arsenal news available", "data");
    return { data: items, warnings };
  },
  worldNews: async () => {
    const sources = [
      ["Premier League", () => fetchJSON(URLS.leagueNews).then((j) => parseEspnNews(j, "Premier League"))],
      ["Champions League", () => fetchJSON(URLS.uclNews).then((j) => parseEspnNews(j, "Champions League"))],
    ];
    const settled = await Promise.allSettled(sources.map(([, fn]) => fn()));
    const ok = settled.filter((s) => s.status === "fulfilled").map((s) => s.value);
    const warnings = settled.flatMap((s, i) => (s.status === "rejected" ? [`${sources[i][0]}: ${s.reason?.message ?? "failed"}`] : []));
    const items = mergeNews(ok);
    if (!items.length) throw new FetchError(warnings.join(" · ") || "No football news available", "data");
    return { data: items, warnings };
  },
};

const initialSource = { status: "loading", data: null, error: null, warnings: [] };

// ESPN's /teams/:id sends no CORS header, so on static hosts (GitHub Pages) it
// only works via slow public proxies. Everything it provides is also derived
// from schedule + standings, so it's treated as optional enrichment: it never
// blocks the "refreshing" state and never counts as a failed source.
const OPTIONAL_SOURCES = new Set(["team"]);

function useHubData() {
  const [sources, setSources] = useState(() =>
    Object.fromEntries(Object.keys(LOADERS).map((k) => [k, initialSource]))
  );
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (key) => {
    setSources((s) => ({ ...s, [key]: { ...s[key], status: "loading", error: null } }));
    try {
      const { data, warnings = [] } = await LOADERS[key]();
      setSources((s) => ({ ...s, [key]: { status: "ok", data, error: null, warnings } }));
    } catch (err) {
      // Keep previously loaded data (if any) and surface the error alongside it.
      setSources((s) => ({ ...s, [key]: { ...s[key], status: "error", error: err?.message ?? "Failed to load" } }));
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
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

  return { sources, load, refreshAll, refreshing, lastUpdated };
}

/* ────────────────────────────── Formatting ────────────────────────────── */

const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const fmtDate = (d, opts) => (d ? new Intl.DateTimeFormat(undefined, opts).format(d) : "");
const fmtKick = (d) => fmtDate(d, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const fmtDay = (d) => fmtDate(d, { weekday: "short", day: "numeric", month: "short" });
const fmtTime = (d) => fmtDate(d, { hour: "2-digit", minute: "2-digit" });
const tzShort = (d) =>
  new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(d ?? new Date()).find((p) => p.type === "timeZoneName")?.value ?? "";

function timeAgo(d) {
  if (!d) return "";
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  return days < 7 ? `${days}d ago` : fmtDay(d);
}

/* ────────────────────────────── UI primitives ────────────────────────────── */

const cx = (...c) => c.filter(Boolean).join(" ");

function Card({ className, children }) {
  return (
    <section className={cx("rounded-2xl border border-line bg-surface text-ink shadow-lg shadow-black/15", className)}>
      {children}
    </section>
  );
}

function CardHeader({ icon: Icon, title, action, sub }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        {Icon && (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand/10 text-accent">
            <Icon size={16} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-sm uppercase">{title}</h2>
          {sub && <p className="truncate text-xs text-ink-muted">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

const Skel = ({ className }) => <div className={cx("animate-pulse rounded-md bg-surface-2", className)} />;

function SkeletonRows({ rows = 4, avatar = true }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {avatar && <Skel className="h-9 w-9 shrink-0 rounded-full" />}
          <div className="flex-1 space-y-2">
            <Skel className="h-3 w-3/4" />
            <Skel className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonNews({ count = 4 }) {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skel className="aspect-video w-full rounded-xl" />
          <Skel className="h-3 w-5/6" />
          <Skel className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry, compact }) {
  return (
    <div className={cx("flex flex-col items-center justify-center gap-2 text-center", compact ? "p-4" : "p-8")}>
      <AlertTriangle className="text-amber-500" size={compact ? 20 : 28} />
      <p className="text-sm font-medium">Couldn’t load live data</p>
      <p className="max-w-sm text-xs text-ink-muted">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-navy px-3 py-1.5 text-xs text-white hover:bg-navy/90"
        >
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}

function StaleBanner({ source, onRetry }) {
  if (source.status !== "error" || !source.data) return null;
  return (
    <div className="flex items-center justify-between gap-2 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
      <span className="flex items-center gap-1.5"><AlertTriangle size={12} /> Refresh failed ({source.error}). Showing last loaded data.</span>
      <button onClick={onRetry} className="font-semibold underline">Retry</button>
    </div>
  );
}

/** Renders skeleton / error / content depending on a source's state. */
function SourceGate({ source, onRetry, skeleton, children }) {
  if (!source.data && source.status === "loading") return skeleton;
  if (!source.data && source.status === "error") return <ErrorState message={source.error} onRetry={onRetry} />;
  if (!source.data) return skeleton;
  return (
    <>
      <StaleBanner source={source} onRetry={onRetry} />
      {children(source.data)}
    </>
  );
}

function Crest({ src, alt, className = "h-8 w-8" }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken)
    return (
      <span className={cx("grid place-items-center rounded-full bg-surface-2 text-[10px] font-bold text-ink-muted", className)}>
        {(alt || "?").slice(0, 3).toUpperCase()}
      </span>
    );
  return <img src={src} alt={alt} loading="lazy" onError={() => setBroken(true)} className={cx("object-contain", className)} />;
}

const RESULT_STYLE = {
  W: "bg-emerald-700 text-white",
  D: "bg-zinc-500 text-white",
  L: "bg-brand text-white",
};

function ResultPill({ r, className = "h-6 w-6 text-xs" }) {
  return <span className={cx("grid shrink-0 place-items-center rounded-md font-bold", RESULT_STYLE[r] ?? "bg-surface-2", className)}>{r ?? "–"}</span>;
}

function CompBadge({ comp }) {
  const ucl = /champions/i.test(comp);
  return (
    <span className={cx(
      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
      ucl ? "bg-navy/10 text-navy-ink dark:bg-sky-400/10" : "bg-gold/15 text-gold-ink"
    )}>
      {comp}
    </span>
  );
}

/* ────────────────────────────── Hero: next match ────────────────────────────── */

function useCountdown(target) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, (target?.getTime?.() ?? 0) - now);
  return {
    done: diff === 0,
    d: Math.floor(diff / 86400000),
    h: Math.floor(diff / 3600000) % 24,
    m: Math.floor(diff / 60000) % 60,
    s: Math.floor(diff / 1000) % 60,
  };
}

function CountdownBox({ value, label }) {
  return (
    <div className="flex min-w-[3.75rem] flex-col items-center rounded-xl bg-white/10 px-2 py-2 ring-1 ring-white/15 backdrop-blur sm:min-w-[4.5rem]">
      <span className="font-display text-2xl font-extrabold tabular-nums sm:text-3xl">{String(value).padStart(2, "0")}</span>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-white/80">{label}</span>
    </div>
  );
}

function HeroTeam({ side, align }) {
  return (
    <div className={cx("flex min-w-0 flex-1 flex-col items-center gap-2 text-center", align)}>
      <div className="grid h-16 w-16 place-items-center rounded-full bg-white p-2 shadow-lg sm:h-24 sm:w-24 sm:p-3">
        <Crest src={side?.logo} alt={side?.abbr} className="h-full w-full" />
      </div>
      <span className="line-clamp-2 text-sm font-bold sm:text-lg">{side?.name ?? "TBD"}</span>
    </div>
  );
}

function HeroMatch({ source, onRetry }) {
  const shell = (children) => (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy to-crimson text-white shadow-2xl shadow-black/30 ring-1 ring-white/10">
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-bright/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-gold/25 blur-3xl" />
      <div className="relative">{children}</div>
    </div>
  );

  if (!source.data) {
    if (source.status === "error")
      return shell(<div className="text-white [&_p]:text-white/80"><ErrorState message={source.error} onRetry={onRetry} /></div>);
    return shell(
      <div className="flex flex-col items-center gap-5 p-6 sm:p-10">
        <div className="h-4 w-40 animate-pulse rounded bg-white/20" />
        <div className="flex w-full items-center justify-around">
          <div className="h-20 w-20 animate-pulse rounded-full bg-white/20" />
          <div className="h-8 w-12 animate-pulse rounded bg-white/20" />
          <div className="h-20 w-20 animate-pulse rounded-full bg-white/20" />
        </div>
        <div className="flex gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-14 w-16 animate-pulse rounded-xl bg-white/15" />)}</div>
      </div>
    );
  }

  const { fixtures, results } = source.data;
  const live = fixtures.find((m) => m.state === "in");
  const next = live ?? fixtures.find((m) => !m.postponed) ?? null;
  const last = results[0];

  return shell(
    <div className="p-5 sm:p-8">
      <StaleBanner source={source} onRetry={onRetry} />
      {next ? <HeroBody match={next} /> : <HeroNoFixture last={last} />}
      {last && next && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 border-t border-white/10 pt-4 text-xs text-white/75">
          <span>Last result:</span>
          <ResultPill r={last.result} className="h-5 w-5 text-[10px]" />
          <span className="font-semibold text-white">
            {last.home.short} {last.home.score}–{last.away.score} {last.away.short}
          </span>
          <span>· {fmtDay(last.date)}</span>
        </div>
      )}
    </div>
  );
}

function HeroBody({ match }) {
  const cd = useCountdown(match.date);
  const isLive = match.state === "in";
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest">
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> Live · {match.clock || match.statusDetail}
          </span>
        ) : (
          <span className="rounded-full bg-white/15 px-3 py-1">Next match</span>
        )}
        <span className="rounded-full bg-gold-deep px-3 py-1">{match.competition}</span>
      </div>

      <div className="flex w-full max-w-xl items-center gap-3">
        <HeroTeam side={match.home} />
        <div className="flex shrink-0 flex-col items-center">
          {isLive ? (
            <span className="font-display text-4xl font-extrabold tabular-nums sm:text-5xl">{match.home.score ?? 0}–{match.away.score ?? 0}</span>
          ) : (
            <span className="font-display text-2xl font-extrabold text-white/70 sm:text-3xl">VS</span>
          )}
        </div>
        <HeroTeam side={match.away} />
      </div>

      {!isLive && (
        cd.done ? (
          <p className="text-sm font-semibold text-gold-light">Kick-off imminent — refresh for live score</p>
        ) : (
          <div className="flex gap-2 sm:gap-3" aria-label="Countdown to kick-off">
            <CountdownBox value={cd.d} label="Days" />
            <CountdownBox value={cd.h} label="Hrs" />
            <CountdownBox value={cd.m} label="Min" />
            <CountdownBox value={cd.s} label="Sec" />
          </div>
        )
      )}

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-white/85">
        <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} /> {fmtKick(match.date)} {tzShort(match.date)}</span>
        {match.venue && <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {match.venue}{match.city ? `, ${match.city}` : ""}</span>}
      </div>
      <p className="text-[11px] text-white/75">Times shown in your timezone ({userTz})</p>
    </div>
  );
}

function HeroNoFixture({ last }) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <Trophy className="text-gold-light" />
      <p className="text-lg font-bold">No upcoming fixtures announced yet</p>
      {last && (
        <p className="text-sm text-white/80">
          Latest: {last.home.name} {last.home.score}–{last.away.score} {last.away.name} ({fmtDay(last.date)})
        </p>
      )}
    </div>
  );
}

/* ────────────────────────────── Fixtures & results ────────────────────────────── */

function MatchRow({ m }) {
  const done = m.state === "post";
  return (
    <li className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2">
      {done ? (
        <ResultPill r={m.result} />
      ) : (
        <span className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-md text-[10px] font-bold",
          m.isHome ? "bg-navy text-white" : "bg-surface-2 text-ink-muted")}
          title={m.isHome ? "Home" : "Away"}>
          {m.isHome ? "H" : "A"}
        </span>
      )}
      <Crest src={m.opp?.logo} alt={m.opp?.abbr} className="h-8 w-8 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {m.isHome ? "vs" : "@"} {m.opp?.name}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
          <CompBadge comp={m.competition} />
          <span>{fmtDay(m.date)}{!done && ` · ${fmtTime(m.date)}`}</span>
          {m.venue && <span className="hidden truncate sm:inline">· {m.venue}</span>}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {done ? (
          <span className="font-display text-lg font-extrabold tabular-nums">
            {m.ars?.score}<span className="text-ink-muted">–</span>{m.opp?.score}
          </span>
        ) : m.state === "in" ? (
          <span className="rounded bg-brand px-1.5 py-0.5 text-xs font-bold text-white">LIVE {m.ars?.score}-{m.opp?.score}</span>
        ) : m.postponed ? (
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Postponed</span>
        ) : (
          <span className="text-xs font-medium text-ink-muted">{tzShort(m.date)}</span>
        )}
      </div>
    </li>
  );
}

function FixturesCard({ source, onRetry, limit, defaultView = "upcoming", className }) {
  const [view, setView] = useState(defaultView);
  return (
    <Card className={className}>
      <CardHeader
        icon={CalendarDays}
        title="Fixtures & Results"
        action={
          <div className="flex rounded-full bg-surface-2 p-0.5 text-xs">
            {[["upcoming", "Upcoming"], ["results", "Results"]].map(([k, l]) => (
              <button key={k} onClick={() => setView(k)}
                className={cx("rounded-full px-3 py-1 transition", view === k ? "bg-surface text-accent shadow" : "text-ink-muted")}>
                {l}
              </button>
            ))}
          </div>
        }
      />
      <SourceGate source={source} onRetry={onRetry} skeleton={<SkeletonRows rows={limit ?? 6} />}>
        {({ fixtures, results }) => {
          const list = (view === "upcoming" ? fixtures : results).slice(0, limit ?? undefined);
          return list.length ? (
            <ul className="divide-y divide-line">{list.map((m) => <MatchRow key={m.id} m={m} />)}</ul>
          ) : (
            <p className="p-6 text-center text-sm text-ink-muted">No {view === "upcoming" ? "upcoming fixtures" : "results"} yet.</p>
          );
        }}
      </SourceGate>
    </Card>
  );
}

function FormStrip({ results, n = 5 }) {
  const form = results.slice(0, n).reverse();
  return (
    <div className="flex gap-1.5">
      {form.map((m) => (
        <span key={m.id} title={`${m.isHome ? "vs" : "@"} ${m.opp?.name} ${m.ars?.score}-${m.opp?.score}`}>
          <ResultPill r={m.result} className="h-7 w-7 text-xs" />
        </span>
      ))}
    </div>
  );
}

/* ────────────────────────────── News ────────────────────────────── */

const SOURCE_STYLE = {
  Arseblog: "bg-brand text-white",
  "r/Gunners": "bg-orange-700 text-white",
  ESPN: "bg-zinc-800 text-white dark:bg-zinc-600",
  "Premier League": "bg-[#3d195b] text-white",
  "Champions League": "bg-navy text-white",
};

function NewsImage({ src, alt, video }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-br from-navy to-brand">
      {src && !broken ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setBroken(true)}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
      ) : (
        <div className="grid h-full w-full place-items-center text-white/60"><Newspaper size={28} /></div>
      )}
      {video && (
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
          <PlayCircle size={12} /> Video
        </span>
      )}
    </div>
  );
}

function NewsCard({ item, layout = "grid" }) {
  const meta = (
    <p className="flex items-center gap-2 text-[11px] text-ink-muted">
      <span className={cx("rounded px-1.5 py-0.5 text-[10px] font-bold", SOURCE_STYLE[item.source] ?? "bg-surface-2")}>{item.source}</span>
      <span>{timeAgo(item.date)}</span>
      <ExternalLink size={11} className="ml-auto opacity-0 transition group-hover:opacity-100" />
    </p>
  );
  if (layout === "list")
    return (
      <a href={item.link} target="_blank" rel="noopener noreferrer"
        className="group flex gap-3 px-4 py-3 transition hover:bg-surface-2">
        <div className="w-24 shrink-0 sm:w-28"><NewsImage src={item.image} alt="" video={item.video} /></div>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug group-hover:text-accent">{item.title}</h3>
          {meta}
        </div>
      </a>
    );
  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-2">
      <NewsImage src={item.image} alt="" video={item.video} />
      <h3 className="line-clamp-2 text-sm font-bold leading-snug group-hover:text-accent">{item.title}</h3>
      {item.excerpt && <p className="line-clamp-2 text-xs text-ink-muted">{item.excerpt}</p>}
      {meta}
    </a>
  );
}

function SourceWarnings({ warnings }) {
  if (!warnings?.length) return null;
  return (
    <p className="flex items-start gap-1.5 px-4 pt-3 text-[11px] text-amber-800 dark:text-amber-300">
      <AlertTriangle size={12} className="mt-px shrink-0" />
      Some feeds unavailable — {warnings.join(" · ")}
    </p>
  );
}

function NewsCard2({ title, icon, source, onRetry, limit, layout = "grid", sub, className }) {
  const [filter, setFilter] = useState("All");
  const items = source.data ?? [];
  const tags = ["All", ...new Set(items.map((i) => i.source))];
  return (
    <Card className={className}>
      <CardHeader icon={icon} title={title} sub={sub}
        action={layout === "grid" && tags.length > 2 && (
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            {tags.map((t) => (
              <button key={t} onClick={() => setFilter(t)}
                className={cx("whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] transition",
                  filter === t ? "bg-navy text-white" : "bg-surface-2 text-ink-muted hover:bg-line")}>
                {t}
              </button>
            ))}
          </div>
        )}
      />
      <SourceGate source={source} onRetry={onRetry}
        skeleton={layout === "grid" ? <SkeletonNews count={limit ?? 6} /> : <SkeletonRows rows={limit ?? 4} />}>
        {(data) => {
          const list = data.filter((i) => filter === "All" || i.source === filter).slice(0, limit ?? undefined);
          return (
            <>
              <SourceWarnings warnings={source.warnings} />
              {layout === "grid" ? (
                <div className="grid gap-5 p-4 sm:grid-cols-2 xl:grid-cols-3">{list.map((n) => <NewsCard key={n.id} item={n} />)}</div>
              ) : (
                <div className="divide-y divide-line">{list.map((n) => <NewsCard key={n.id} item={n} layout="list" />)}</div>
              )}
            </>
          );
        }}
      </SourceGate>
    </Card>
  );
}

/* ────────────────────────────── Squad ────────────────────────────── */

const AVAIL_STYLE = {
  available: { dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" },
  doubtful: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" },
  injured: { dot: "bg-brand", chip: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300" },
};

function PlayerAvatar({ p, className = "h-14 w-14" }) {
  const [broken, setBroken] = useState(false);
  const initials = p.name.split(" ").map((x) => x[0]).slice(0, 2).join("");
  return (
    <div className={cx("relative shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-brand to-navy ring-2 ring-surface", className)}>
      {/* Initials always render underneath; the photo covers them only once it loads. */}
      <span className="absolute inset-0 grid place-items-center text-sm font-bold text-white">{initials}</span>
      {!broken && (
        <img src={p.photo} alt={p.name} loading="lazy" onError={() => setBroken(true)}
          className="relative h-full w-full bg-surface-2 object-cover object-top opacity-0 transition-opacity"
          onLoad={(e) => e.currentTarget.classList.replace("opacity-0", "opacity-100")} />
      )}
    </div>
  );
}

function PlayerCard({ p }) {
  const a = AVAIL_STYLE[p.availability.key];
  const st = p.stats;
  const line = p.group === "Goalkeepers"
    ? [["Apps", st.appearances], ["Saves", st.saves], ["GA", st.goalsConceded]]
    : [["Apps", st.appearances], ["G", st.totalGoals], ["A", st.goalAssists]];
  return (
    <a href={p.link} target="_blank" rel="noopener noreferrer"
      className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-line bg-surface p-3 transition hover:-translate-y-0.5 hover:border-gold hover:shadow-md">
      <span className="pointer-events-none absolute -right-1 -top-3 font-display text-6xl font-extrabold text-surface-2">{p.jersey}</span>
      <PlayerAvatar p={p} />
      <div className="relative min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-bold">
          <span className="text-accent">{p.jersey}</span> {p.name}
        </p>
        <p className="flex items-center gap-1.5 truncate text-xs text-ink-muted">
          {p.flag && <img src={p.flag} alt="" className="h-3 w-4 rounded-sm object-cover" loading="lazy" />}
          {p.position}{p.age ? ` · ${p.age}` : ""}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", a.chip)} title={p.availability.detail}>
            <span className={cx("h-1.5 w-1.5 rounded-full", a.dot)} />
            {p.availability.label}{p.availability.detail ? ` · ${p.availability.detail}` : ""}
          </span>
          <span className="text-[10px] text-ink-muted tabular-nums">
            {line.map(([k, v]) => `${k} ${v ?? 0}`).join(" · ")}
          </span>
        </div>
      </div>
    </a>
  );
}

const GROUPS = ["Goalkeepers", "Defenders", "Midfielders", "Forwards"];

function SquadSection({ source, onRetry }) {
  const [pos, setPos] = useState("All");
  const [avail, setAvail] = useState("all");
  return (
    <Card>
      {/* ESPN's roster `coach` field is often stale, so it's deliberately not shown. */}
      <CardHeader icon={Users} title="Squad Availability" sub="Availability per ESPN injury reports" />
      <SourceGate source={source} onRetry={onRetry}
        skeleton={<div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 9 }).map((_, i) => <Skel key={i} className="h-20 rounded-xl" />)}</div>}>
        {({ players }) => {
          const counts = players.reduce((acc, p) => ({ ...acc, [p.availability.key]: (acc[p.availability.key] ?? 0) + 1 }), {});
          const filtered = players.filter((p) => (pos === "All" || p.group === pos) && (avail === "all" || p.availability.key === avail));
          const groups = GROUPS.filter((g) => pos === "All" || g === pos);
          return (
            <div className="space-y-4 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
                  {["All", ...GROUPS].map((g) => (
                    <button key={g} onClick={() => setPos(g)}
                      className={cx("whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition",
                        pos === g ? "bg-brand text-white shadow" : "bg-surface-2 text-ink-muted hover:bg-line")}>
                      {g} <span className="opacity-70">{g === "All" ? players.length : players.filter((p) => p.group === g).length}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5 text-xs">
                  {[["all", "All"], ["available", "Available"], ["doubtful", "Doubtful"], ["injured", "Out"]].map(([k, l]) => (
                    <button key={k} onClick={() => setAvail(k)}
                      className={cx("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 transition",
                        avail === k ? "border-navy bg-navy text-white" : "border-line text-ink-muted")}>
                      {k !== "all" && <span className={cx("h-1.5 w-1.5 rounded-full", AVAIL_STYLE[k].dot)} />}
                      {l} {k !== "all" && <span className="opacity-70">{counts[k] ?? 0}</span>}
                    </button>
                  ))}
                </div>
              </div>
              {groups.map((g) => {
                const list = filtered.filter((p) => p.group === g);
                if (!list.length) return null;
                return (
                  <div key={g}>
                    <h3 className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-gold-ink">
                      {g} <span className="h-px flex-1 bg-gold/40" />
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{list.map((p) => <PlayerCard key={p.id} p={p} />)}</div>
                  </div>
                );
              })}
              {!filtered.length && <p className="py-6 text-center text-sm text-ink-muted">No players match these filters.</p>}
            </div>
          );
        }}
      </SourceGate>
    </Card>
  );
}

/* ────────────────────────────── Stats & standings ────────────────────────────── */

const RIVALS = new Set(["367", "363", "360", "382", "364"]); // Spurs, Chelsea, Man Utd, Man City, Liverpool

function StandingsTable({ source, onRetry, compact, className }) {
  const [full, setFull] = useState(!compact);
  return (
    <Card className={className}>
      <CardHeader icon={Trophy} title="Premier League Table" sub={source.data?.season}
        action={compact !== undefined && source.data && (
          <button onClick={() => setFull((f) => !f)} className="text-xs text-accent hover:underline">
            {full ? "Around Arsenal" : "Full table"}
          </button>
        )}
      />
      <SourceGate source={source} onRetry={onRetry} skeleton={<SkeletonRows rows={compact ? 5 : 10} />}>
        {({ rows }) => {
          const idx = rows.findIndex((r) => r.id === TEAM_ID);
          let shown = rows;
          if (!full && idx >= 0) {
            const start = Math.max(0, Math.min(idx - 2, rows.length - 5));
            shown = rows.slice(start, start + 5);
          }
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase text-ink-muted">
                    <th className="py-2 pl-4 text-left font-semibold">#</th>
                    <th className="py-2 text-left font-semibold">Club</th>
                    <th className="px-1.5 py-2 text-center font-semibold">P</th>
                    <th className="hidden px-1.5 py-2 text-center font-semibold sm:table-cell">W</th>
                    <th className="hidden px-1.5 py-2 text-center font-semibold sm:table-cell">D</th>
                    <th className="hidden px-1.5 py-2 text-center font-semibold sm:table-cell">L</th>
                    <th className="px-1.5 py-2 text-center font-semibold">GD</th>
                    <th className="py-2 pr-4 text-right font-semibold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => {
                    const ars = r.id === TEAM_ID;
                    return (
                      <tr key={r.id} className={cx("border-t border-line",
                        ars && "bg-brand font-bold text-white")}>
                        <td className="relative py-2 pl-4 tabular-nums">
                          {r.note && <span className="absolute left-0 top-1 bottom-1 w-1 rounded-r" style={{ background: r.note.color }} title={r.note.label} />}
                          {r.rank}
                        </td>
                        <td className="py-2">
                          <span className="flex items-center gap-2">
                            <Crest src={r.logo} alt={r.abbr} className="h-5 w-5" />
                            <span className="truncate">{r.short}</span>
                            {RIVALS.has(r.id) && <Star size={10} className="shrink-0 text-gold-ink" aria-label="Rival" />}
                          </span>
                        </td>
                        <td className="px-1.5 py-2 text-center tabular-nums">{r.gp}</td>
                        <td className="hidden px-1.5 py-2 text-center tabular-nums sm:table-cell">{r.w}</td>
                        <td className="hidden px-1.5 py-2 text-center tabular-nums sm:table-cell">{r.d}</td>
                        <td className="hidden px-1.5 py-2 text-center tabular-nums sm:table-cell">{r.l}</td>
                        <td className="px-1.5 py-2 text-center tabular-nums">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                        <td className="py-2 pr-4 text-right font-bold tabular-nums">{r.pts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {full && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 text-[11px] text-ink-muted">
                  {[...new Map(rows.filter((r) => r.note).map((r) => [r.note.label, r.note.color])).entries()].map(([l, c]) => (
                    <span key={l} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />{l}</span>
                  ))}
                  <span className="inline-flex items-center gap-1.5"><Star size={10} className="text-gold-ink" /> Big Six rival</span>
                </div>
              )}
            </div>
          );
        }}
      </SourceGate>
    </Card>
  );
}

function StatTile({ icon: Icon, label, value, sub, accent = C.red }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-ink-muted">
        <Icon size={13} style={{ color: accent }} /> {label}
      </div>
      <p className="mt-1 font-display text-2xl font-extrabold tabular-nums">{value ?? "–"}</p>
      {sub && <p className="text-[11px] text-ink-muted">{sub}</p>}
    </div>
  );
}

const wdl = (list) =>
  list.length
    ? ["W", "D", "L"].map((r) => list.filter((m) => m.result === r).length).join("-")
    : null;

function computeTeamStats(team, standings, schedule) {
  const row = standings?.rows?.find((r) => r.id === TEAM_ID);
  const s = team?.stats ?? {};
  const gp = s.gamesPlayed ?? row?.gp;
  const w = s.wins ?? row?.w;
  const leagueResults = (schedule?.results ?? []).filter((m) => /premier/i.test(m.competition));
  const allResults = schedule?.results ?? [];
  return {
    rank: s.rank ?? row?.rank,
    pts: s.points ?? row?.pts,
    gp, w, d: s.ties ?? row?.d, l: s.losses ?? row?.l,
    gf: s.pointsFor ?? row?.gf,
    ga: s.pointsAgainst ?? row?.ga,
    gd: s.pointDifferential ?? row?.gd,
    winRate: gp ? Math.round((w / gp) * 100) : null,
    cleanSheets: leagueResults.filter((m) => m.opp?.score === 0).length,
    cleanSheetsAll: allResults.filter((m) => m.opp?.score === 0).length,
    homeRecord: s.homeGamesPlayed != null ? `${s.homeWins}-${s.homeTies}-${s.homeLosses}` : wdl(leagueResults.filter((m) => m.isHome)),
    awayRecord: s.awayGamesPlayed != null ? `${s.awayWins}-${s.awayTies}-${s.awayLosses}` : wdl(leagueResults.filter((m) => !m.isHome)),
    summary: team?.summary,
  };
}

function TeamStats({ teamSrc, standingsSrc, scheduleSrc, onRetry }) {
  const loading = !teamSrc.data && !standingsSrc.data;
  const failed = loading && teamSrc.status === "error" && standingsSrc.status === "error";
  const t = computeTeamStats(teamSrc.data, standingsSrc.data, scheduleSrc.data);
  const ord = (n) => (n == null ? "–" : n + (["th", "st", "nd", "rd"][(n % 100 > 10 && n % 100 < 14) ? 0 : n % 10] ?? "th"));
  return (
    <Card>
      <CardHeader icon={BarChart3} title="Team Season Stats" sub={t.summary ?? "Premier League"} />
      {failed ? (
        <ErrorState message={teamSrc.error} onRetry={onRetry} />
      ) : loading ? (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skel key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile icon={Trophy} label="Position" value={ord(t.rank)} sub={`${t.pts ?? "–"} pts`} accent={C.gold} />
            <StatTile icon={Activity} label="Record" value={`${t.w ?? "–"}-${t.d ?? "–"}-${t.l ?? "–"}`} sub={`${t.gp ?? "–"} played · W-D-L`} />
            <StatTile icon={Target} label="Goals scored" value={t.gf} sub={t.gp ? `${(t.gf / t.gp).toFixed(1)} per game` : null} />
            <StatTile icon={Shield} label="Conceded" value={t.ga} sub={t.gp ? `${(t.ga / t.gp).toFixed(1)} per game` : null} accent={C.navy} />
            <StatTile icon={ShieldCheck} label="Clean sheets" value={scheduleSrc.data ? t.cleanSheets : "–"}
              sub={scheduleSrc.data && t.cleanSheetsAll !== t.cleanSheets ? `${t.cleanSheetsAll} all comps` : "League"} accent={C.navy} />
            <StatTile icon={Goal} label="Goal diff" value={t.gd != null ? (t.gd > 0 ? `+${t.gd}` : t.gd) : "–"} />
            <StatTile icon={Star} label="Win rate" value={t.winRate != null ? `${t.winRate}%` : "–"} accent={C.gold} />
            <StatTile icon={MapPin} label="Home / Away" value={t.homeRecord ?? "–"} sub={t.awayRecord ? `Away ${t.awayRecord}` : null} />
          </div>
          {t.winRate != null && (
            <div>
              <div className="mb-1 flex justify-between text-[11px] font-semibold text-ink-muted">
                <span>W {t.w}</span><span>D {t.d}</span><span>L {t.l}</span>
              </div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-2">
                <div className="bg-emerald-600" style={{ width: `${(t.w / t.gp) * 100}%` }} />
                <div className="bg-zinc-400" style={{ width: `${(t.d / t.gp) * 100}%` }} />
                <div className="bg-brand" style={{ width: `${(t.l / t.gp) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

const LEADER_DEFS = [
  { key: "totalGoals", label: "Top scorer", icon: Goal, unit: "goals" },
  { key: "goalAssists", label: "Most assists", icon: HeartPulse, unit: "assists" },
  { key: "shotsOnTarget", label: "Shots on target", icon: Target, unit: "on target" },
  { key: "appearances", label: "Most appearances", icon: Activity, unit: "apps" },
  { key: "saves", label: "Most saves", icon: Hand, unit: "saves", gk: true },
];

function TopPerformers({ source, onRetry, className }) {
  return (
    <Card className={className}>
      <CardHeader icon={Star} title="Top Performers" sub="Season stats from ESPN squad data" />
      <SourceGate source={source} onRetry={onRetry} skeleton={<SkeletonRows rows={5} />}>
        {({ players }) => (
          <ul className="divide-y divide-line">
            {LEADER_DEFS.map((def) => {
              const pool = players.filter((p) => (def.gk ? p.group === "Goalkeepers" : true));
              const ranked = [...pool].sort((a, b) => (b.stats[def.key] ?? 0) - (a.stats[def.key] ?? 0));
              const top = ranked[0];
              if (!top || !top.stats[def.key]) return null;
              const runners = ranked.slice(1, 3).filter((p) => p.stats[def.key]);
              return (
                <li key={def.key} className="flex items-center gap-3 px-4 py-3">
                  <PlayerAvatar p={top} className="h-11 w-11" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-[11px] font-semibold uppercase text-gold-ink">
                      <def.icon size={12} /> {def.label}
                    </p>
                    <p className="truncate text-sm font-bold">{top.name}</p>
                    {runners.length > 0 && (
                      <p className="truncate text-[11px] text-ink-muted">
                        Next: {runners.map((r) => `${r.lastName} ${r.stats[def.key]}`).join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-extrabold tabular-nums text-accent">{top.stats[def.key]}</p>
                    <p className="text-[10px] uppercase text-ink-muted">{def.unit}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SourceGate>
    </Card>
  );
}

/* ────────────────────────────── Overview bento ────────────────────────────── */

function FormCard({ scheduleSrc, standingsSrc, onRetry }) {
  const row = standingsSrc.data?.rows?.find((r) => r.id === TEAM_ID);
  return (
    <Card className="flex flex-col">
      <CardHeader icon={Activity} title="Form & Position" />
      <div className="flex flex-1 flex-col justify-center gap-4 p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase text-ink-muted">League position</p>
            {row ? (
              <p className="font-display text-5xl font-extrabold leading-none text-accent">{row.rank}<span className="text-lg text-ink-muted">/{standingsSrc.data.rows.length}</span></p>
            ) : standingsSrc.status === "error" ? <p className="text-sm text-ink-muted">Unavailable</p> : <Skel className="h-12 w-20" />}
          </div>
          {row && (
            <div className="text-right text-sm">
              <p><span className="font-display font-extrabold text-xl tabular-nums">{row.pts}</span> <span className="text-ink-muted">pts</span></p>
              <p className="text-ink-muted tabular-nums">GD {row.gd > 0 ? `+${row.gd}` : row.gd}</p>
            </div>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase text-ink-muted">Last 5 (oldest → newest)</p>
          {scheduleSrc.data ? <FormStrip results={scheduleSrc.data.results} />
            : scheduleSrc.status === "error" ? <button onClick={onRetry} className="text-xs text-accent underline">Retry</button>
            : <div className="flex gap-1.5">{[0, 1, 2, 3, 4].map((i) => <Skel key={i} className="h-7 w-7" />)}</div>}
        </div>
      </div>
    </Card>
  );
}

function Overview({ s, load, go }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2"><FixturesCard source={s.schedule} onRetry={() => load("schedule")} limit={5} /></div>
      <FormCard scheduleSrc={s.schedule} standingsSrc={s.standings} onRetry={() => load("schedule")} />
      <StandingsTable source={s.standings} onRetry={() => load("standings")} compact />
      <div className="lg:col-span-2">
        <NewsCard2 title="Arsenal News" icon={Shield} source={s.arsenalNews} onRetry={() => load("arsenalNews")} limit={5} layout="list"
          sub="Arseblog · r/Gunners · ESPN" />
      </div>
      <TopPerformers source={s.roster} onRetry={() => load("roster")} />
      <div className="lg:col-span-2">
        <NewsCard2 title="Football News" icon={Globe} source={s.worldNews} onRetry={() => load("worldNews")} limit={4} layout="list"
          sub="Premier League & Champions League" />
      </div>
      <Card className="overflow-hidden border-white/10 bg-gradient-to-br from-navy to-crimson">
        <div className="flex h-full flex-col justify-center gap-3 p-5 text-white">
        <p className="font-display text-sm font-extrabold uppercase text-gold-light">Explore the hub</p>
        {[["fixtures", "Full fixture list & results"], ["news", "All news feeds"], ["squad", "Squad & availability"], ["stats", "Stats & full table"]].map(([t, l]) => (
          <button key={t} onClick={() => go(t)} className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 text-left text-xs transition hover:bg-white/20">
            {l} <ChevronRight size={16} />
          </button>
        ))}
        </div>
      </Card>
    </div>
  );
}

/* ────────────────────────────── App shell ────────────────────────────── */

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "fixtures", label: "Fixtures", icon: CalendarDays },
  { id: "news", label: "News", icon: Newspaper },
  { id: "squad", label: "Squad", icon: Users },
  { id: "stats", label: "Stats", icon: BarChart3 },
];

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem("afc-theme");
      if (saved) return saved === "dark";
    } catch { /* storage unavailable */ }
    return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try { localStorage.setItem("afc-theme", dark ? "dark" : "light"); } catch { /* ignore */ }
  }, [dark]);
  return [dark, setDark];
}

function LastUpdated({ at }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 30000);
    return () => clearInterval(id);
  }, []);
  if (!at) return <span>Loading live data…</span>;
  return <span title={at.toLocaleString()}>Updated {fmtTime(at)} · {timeAgo(at)}</span>;
}

export default function App() {
  const { sources: s, load, refreshAll, refreshing, lastUpdated } = useHubData();
  const [tab, setTab] = useState("overview");
  const [dark, setDark] = useDarkMode();
  const topRef = useRef(null);
  const errorCount = Object.entries(s).filter(([k, x]) => !OPTIONAL_SOURCES.has(k) && x.status === "error").length;
  const crest = s.team.data?.logo ?? `https://a.espncdn.com/i/teamlogos/soccer/500/${TEAM_ID}.png`;

  const go = (t) => {
    setTab(t);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const content = useMemo(() => {
    switch (tab) {
      case "fixtures":
        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <FixturesCard source={s.schedule} onRetry={() => load("schedule")} defaultView="upcoming" />
            <FixturesCard source={s.schedule} onRetry={() => load("schedule")} defaultView="results" />
          </div>
        );
      case "news":
        return (
          <div className="space-y-4">
            <NewsCard2 title="Arsenal News" icon={Shield} source={s.arsenalNews} onRetry={() => load("arsenalNews")}
              sub="Club updates, transfer talk & match reaction" />
            <NewsCard2 title="World & Premier League" icon={Globe} source={s.worldNews} onRetry={() => load("worldNews")}
              sub="Latest from ESPN FC" />
          </div>
        );
      case "squad":
        return <SquadSection source={s.roster} onRetry={() => load("roster")} />;
      case "stats":
        return (
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-3">
              <TeamStats teamSrc={s.team} standingsSrc={s.standings} scheduleSrc={s.schedule}
                onRetry={() => { load("team"); load("standings"); }} />
              <StandingsTable source={s.standings} onRetry={() => load("standings")} compact={false} />
            </div>
            <div className="lg:col-span-2"><TopPerformers source={s.roster} onRetry={() => load("roster")} /></div>
          </div>
        );
      default:
        return <Overview s={s} load={load} go={go} />;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, s, load]);

  return (
    <div className="min-h-screen bg-page text-on-page">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/15 bg-crimson/95 text-white backdrop-blur">
        <div className="h-1 bg-gradient-to-r from-navy via-gold to-navy" />
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <img src={crest} alt="Arsenal crest" className="h-9 w-9 shrink-0 rounded-full bg-white p-1" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-extrabold uppercase sm:text-lg">
              Arsenal FC <span className="text-gold-light">Live Hub</span>
            </h1>
            <p className="flex items-center gap-1.5 truncate text-[11px] text-white/90">
              <Clock size={11} /> <LastUpdated at={lastUpdated} />
              {errorCount > 0 && !refreshing && (
                <span className="inline-flex items-center gap-1 text-amber-300"><AlertTriangle size={11} /> {errorCount} source{errorCount > 1 ? "s" : ""} failed</span>
              )}
            </p>
          </div>
          <button onClick={() => setDark((d) => !d)} aria-label="Toggle dark mode"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 transition hover:bg-white/20">
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={refreshAll} disabled={refreshing}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-3 py-2 text-xs text-brand shadow-lg shadow-black/20 transition hover:bg-white/90 disabled:opacity-70 sm:px-4">
            <RefreshCw size={14} className={cx(refreshing && "animate-spin")} />
            <span className="hidden sm:inline">{refreshing ? "Refreshing…" : "Refresh Data"}</span>
          </button>
        </div>
        <nav className="mx-auto max-w-7xl px-2 sm:px-4">
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => go(id)}
                className={cx("relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-semibold transition",
                  tab === id ? "text-white" : "text-white/80 hover:text-white")}>
                <Icon size={15} /> {label}
                {tab === id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-white" />}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main ref={topRef} className="mx-auto max-w-7xl scroll-mt-32 space-y-4 px-4 py-5 sm:py-6">
        <HeroMatch source={s.schedule} onRetry={() => load("schedule")} />
        {s.schedule.warnings?.length > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-on-page"><AlertTriangle size={12} /> {s.schedule.warnings.join(" · ")}</p>
        )}
        {content}
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-8 pt-2 text-center text-[11px] text-on-page">
        <p className="flex flex-wrap items-center justify-center gap-x-2">
          <Timer size={11} /> Live data fetched on every load from ESPN, Arseblog & r/Gunners (via rss2json). Unofficial fan hub — not affiliated with Arsenal FC.
        </p>
      </footer>
    </div>
  );
}
