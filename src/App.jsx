/**
 * Arsenal Hub: a daily Arsenal platform.
 *
 * App shell: hash routing (works on GitHub Pages with no server config),
 * header + mobile bottom nav, unified search, theme, and the homepage. Data
 * loading lives in lib/data.js; news intelligence in lib/news.js; transfers in
 * lib/transfers.js; per-player stats in lib/playerstats.js. Pages live in components/.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowRight, BarChart3, CalendarDays, Home, Landmark, MoreHorizontal, Moon, Newspaper, RefreshCw, Repeat, Search, Sun, Users, X,
} from "lucide-react";
import { TEAM_ID, lookupPlayers, useHubData } from "./lib/data.js";
import { buildStories, fanTalk, pickBriefing, playerKeys } from "./lib/news.js";
import { buildTransfers, namesToLookUp } from "./lib/transfers.js";
import { searchHistory } from "./lib/history.js";
import { readJSON, useBookmarks, usePersistentState, usePredictions, useRecents, useSavedPlayers, useWatchlist } from "./lib/storage.js";
import { fmtLongDay, fmtTime, relDay, sameDay, timeAgo } from "./lib/format.js";
import { Chips, Crest, EmptyState, Panel, SectionHead, cx, useNow } from "./components/ui.jsx";
import { BriefingList, FanTalk, FeaturedSkeleton, FeaturedStory, NewsPage, StoryListSkeleton, StoryRow } from "./components/news.jsx";
import { FormStrip, MatchCentrePage, MatchDetailPage, MatchList, NextMatchHero, StandingsTable } from "./components/matches.jsx";
import { AvailabilityList, PlayerAvatar, PlayerProfilePage, SquadPage } from "./components/squad.jsx";
import { TransferWatch, TransfersPage } from "./components/transfers.jsx";
import { ComparePage } from "./components/analysis.jsx";
import { HistoryPage } from "./components/history.jsx";

const CREST = `https://a.espncdn.com/i/teamlogos/soccer/500/${TEAM_ID}.png`;
const ARCHIVE_DAYS = 21;

/* ───────────────────────── Routing ───────────────────────── */

const NAV = [
  { id: "home", label: "Home", href: "#/", icon: Home, primary: true },
  { id: "news", label: "News", href: "#/news", icon: Newspaper, primary: true },
  { id: "matches", label: "Matches", href: "#/matches", icon: CalendarDays, primary: true },
  { id: "transfers", label: "Transfers", href: "#/transfers", icon: Repeat, primary: true },
  { id: "squad", label: "Squad", href: "#/squad", icon: Users, primary: true },
  { id: "analysis", label: "Analysis", href: "#/analysis", icon: BarChart3 },
  { id: "history", label: "History", href: "#/history", icon: Landmark },
];

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [path, qs] = raw.split("?");
  const parts = path.split("/").filter(Boolean).map((p) => decodeURIComponent(p));
  const first = parts[0] ?? "";
  // Legacy tab ids from earlier versions of the site
  const legacy = { overview: "home", fixtures: "matches", stats: "matches" }[first];
  const page = legacy ?? (NAV.some((n) => n.id === first) ? first : "home");
  return { page, parts: parts.slice(1), query: new URLSearchParams(qs ?? "") };
}

function useRoute() {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const on = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

/* ───────────────────────── Theme ───────────────────────── */

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
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0e0e10" : "#f5f4f1");
    try { localStorage.setItem("afc-theme", dark ? "dark" : "light"); } catch { /* ignore */ }
  }, [dark]);
  return [dark, setDark];
}

/* ───────────────────────── Derived data ───────────────────────── */

function useIntelligence(s) {
  const players = s.roster.data?.players;
  const keys = useMemo(() => playerKeys(players ?? []), [players]);
  const rawNews = s.arsenalNews.data?.items;
  const rawWorld = s.worldNews.data?.items;
  const stories = useMemo(
    () => buildStories([...(rawNews ?? []), ...(rawWorld ?? [])], { players: keys }),
    [rawNews, rawWorld, keys]
  );
  const [lookups, setLookups] = useState(() =>
    Object.fromEntries(Object.entries(readJSON("afc-player-lookup-v2", {})).filter(([, v]) => !v.miss))
  );
  useEffect(() => {
    if (!stories.length) return undefined;
    const names = namesToLookUp(stories, keys);
    if (!names.length) return undefined;
    let cancelled = false;
    lookupPlayers(names).then((l) => !cancelled && setLookups(l)).catch(() => {});
    return () => { cancelled = true; };
  }, [stories, keys]);
  const transfers = useMemo(() => buildTransfers(stories, { squad: keys, lookups }), [stories, keys, lookups]);
  return { stories, transfers, keys };
}

/* ───────────────────────── Header, nav, search ───────────────────────── */

function Freshness({ sources, lastUpdated, refreshing, className }) {
  const now = useNow();
  const savedAt = sources.arsenalNews.savedAt;
  const failed = Object.entries(sources).filter(([k, x]) => k !== "team" && x.status === "error").length;
  let text;
  if (refreshing && !lastUpdated) text = savedAt ? `Showing saved data from ${timeAgo(savedAt, now)} · refreshing…` : "Loading live data…";
  else if (refreshing) text = "Refreshing…";
  else if (lastUpdated) text = `Feeds refreshed ${timeAgo(lastUpdated, now)}`;
  else if (savedAt) text = `Showing saved data from ${timeAgo(savedAt, now)}`;
  else text = "";
  return (
    <span className={cx("inline-flex items-center gap-1.5", className)} title={lastUpdated ? lastUpdated.toLocaleString() : undefined}>
      {text}
      {failed > 0 && !refreshing && (
        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300"><AlertTriangle size={11} /> {failed} source{failed > 1 ? "s" : ""} failed</span>
      )}
    </span>
  );
}

function Header({ route, dark, setDark, onRefresh, refreshing, openSearch, sources, lastUpdated }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 text-ink backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="h-[3px] bg-brand" />
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <a href="#/" className="flex shrink-0 items-center gap-2" aria-label="Arsenal Hub home">
          <img src={CREST} alt="" width="28" height="28" className="h-7 w-7" />
          <span className="font-display text-[17px] font-bold tracking-tight">Arsenal <span className="text-accent">Hub</span></span>
        </a>
        <nav className="ml-4 hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <a key={n.id} href={n.href} aria-current={route.page === n.id ? "page" : undefined}
              className={cx("relative rounded-md px-2.5 py-2 text-sm font-semibold transition", route.page === n.id ? "text-accent" : "text-ink-muted hover:text-ink")}>
              {n.label}
              {route.page === n.id && <span className="absolute inset-x-2.5 -bottom-[11px] h-0.5 rounded-full bg-brand" />}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <span className="mr-2 hidden text-[11px] text-ink-muted xl:block">
            <Freshness sources={sources} lastUpdated={lastUpdated} refreshing={refreshing} />
          </span>
          <button onClick={openSearch} aria-label="Search" title="Search (/)" className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink">
            <Search size={18} />
          </button>
          <button onClick={onRefresh} disabled={refreshing} aria-label="Refresh news and data" title="Refresh"
            className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink disabled:opacity-60">
            <RefreshCw size={17} className={cx(refreshing && "animate-spin")} />
          </button>
          <button onClick={() => setDark((d) => !d)} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title="Theme"
            className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink">
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </div>
    </header>
  );
}

/** Five primary destinations plus a "More" sheet (Analysis, History), so nothing is cramped on a phone. */
function BottomNav({ route }) {
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [route]);
  const primary = NAV.filter((n) => n.primary);
  const secondary = NAV.filter((n) => !n.primary);
  const moreActive = secondary.some((n) => n.id === route.page);
  return (
    <>
      {more && <button className="fixed inset-0 z-20 cursor-default bg-black/20 lg:hidden" onClick={() => setMore(false)} aria-label="Close menu" />}
      <nav className="bottom-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:hidden" aria-label="Main">
        {more && (
          <div className="absolute inset-x-3 bottom-full mb-2 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
            {secondary.map(({ id, label, href, icon: Icon }) => (
              <a key={id} href={href} className={cx("flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-surface-2", route.page === id ? "text-accent" : "text-ink")}>
                <Icon size={18} /> {label}
              </a>
            ))}
          </div>
        )}
        <div className="mx-auto grid max-w-lg grid-cols-6">
          {primary.map(({ id, label, href, icon: Icon }) => {
            const active = route.page === id;
            return (
              <a key={id} href={href} aria-current={active ? "page" : undefined}
                className={cx("flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold", active ? "text-accent" : "text-ink-muted")}>
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                {label}
              </a>
            );
          })}
          <button onClick={() => setMore((m) => !m)} aria-expanded={more}
            className={cx("flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold normal-case", moreActive || more ? "text-accent" : "text-ink-muted")}>
            <MoreHorizontal size={20} />
            More
          </button>
        </div>
      </nav>
    </>
  );
}

/** One search box over news, players, transfers, matches and history. */
function SearchOverlay({ open, onClose, stories, schedules, squads, transfers }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
    else setQ("");
  }, [open]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const term = q.trim().toLowerCase();
  const res = useMemo(() => {
    if (!open || term.length < 2) return null;
    const words = term.split(/\s+/);
    const hit = (text) => words.every((w) => text.toLowerCase().includes(w));
    return {
      news: stories.filter((s) => s.scope === "arsenal" && s.articles.some((a) => hit(`${a.title} ${a.summary}`))).slice(0, 5),
      players: [...(squads.men ?? []).map((p) => ({ ...p, team: "men" })), ...(squads.women ?? []).map((p) => ({ ...p, team: "women" }))]
        .filter((p) => hit(`${p.name} ${p.position} ${p.nationality ?? ""}`)).slice(0, 5),
      transfers: transfers.filter((e) => hit(`${e.player?.name ?? ""} ${e.headline}`)).slice(0, 4),
      matches: schedules.flatMap((d) => (d ? [...d.fixtures, ...d.results] : [])).filter((m) => hit(`${m.opp?.name ?? ""} ${m.competition}`)).slice(0, 5),
      history: searchHistory(term),
    };
  }, [open, term, stories, schedules, squads, transfers]);
  if (!open) return null;
  const go = (href) => { window.location.hash = href; onClose(); };
  const empty = res && Object.values(res).every((l) => !l.length);
  const Group = ({ title, children }) => (
    <div className="py-2">
      <p className="eyebrow px-2 py-1 text-ink-muted">{title}</p>
      {children}
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Search">
      <div className="mx-auto mt-0 max-w-xl bg-surface p-3 shadow-2xl sm:mt-16 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={(e) => { e.preventDefault(); if (term) go(`#/news?q=${encodeURIComponent(q.trim())}`); }} className="flex items-center gap-2 border-b border-line pb-2">
          <Search size={18} className="ml-1 text-ink-muted" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search news, players, transfers, matches, history"
            className="min-w-0 flex-1 bg-transparent py-2 text-base text-ink placeholder:text-ink-muted focus:outline-none" aria-label="Search" />
          <button type="button" onClick={onClose} aria-label="Close search" className="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-surface-2"><X size={16} /></button>
        </form>
        <div className="max-h-[75vh] overflow-y-auto">
          {!res && <p className="px-2 py-6 text-center text-sm text-ink-muted">Try a player, an opponent, a competition or a topic, e.g. “Saka”, “Chelsea”, “contract”, “Invincibles”.</p>}
          {empty && <p className="px-2 py-6 text-center text-sm text-ink-muted">No results for “{q}”.</p>}
          {res?.news.length > 0 && (
            <Group title="News">
              {res.news.map((s) => (
                <a key={s.id} href={s.lead.link} target="_blank" rel="noopener noreferrer" className="block rounded-lg px-2 py-2 hover:bg-surface-2">
                  <p className="text-sm font-semibold leading-snug text-ink">{s.lead.title}</p>
                  <p className="text-[11px] text-ink-muted">{s.lead.source} · {timeAgo(s.date)}</p>
                </a>
              ))}
              <button onClick={() => go(`#/news?q=${encodeURIComponent(q.trim())}`)} className="mt-1 inline-flex items-center gap-1 px-2 text-xs font-semibold text-accent">All news results <ArrowRight size={12} /></button>
            </Group>
          )}
          {res?.players.length > 0 && (
            <Group title="Players">
              {res.players.map((p) => (
                <button key={`${p.team}${p.id}`} onClick={() => go(`#/squad/player/${p.id}${p.team === "women" ? "?team=women" : ""}`)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-surface-2">
                  <PlayerAvatar p={p} className="h-7 w-7" />
                  <span className="flex-1 text-sm text-ink">{p.name}</span>
                  <span className="text-[11px] text-ink-muted">{p.team === "women" ? "Women · " : ""}{p.position}</span>
                </button>
              ))}
            </Group>
          )}
          {res?.transfers.length > 0 && (
            <Group title="Transfers">
              {res.transfers.map((e) => (
                <button key={e.id} onClick={() => go("#/transfers")} className="block w-full rounded-lg px-2 py-2 text-left hover:bg-surface-2">
                  <p className="text-sm font-semibold leading-snug text-ink">{e.player?.name ?? e.headline}</p>
                  <p className="text-[11px] text-ink-muted">{e.direction} · {e.status}</p>
                </button>
              ))}
            </Group>
          )}
          {res?.matches.length > 0 && (
            <Group title="Matches">
              {res.matches.map((m) => (
                <button key={m.id} onClick={() => go(`#/matches/${m.id}`)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-surface-2">
                  <Crest src={m.opp?.logo} alt={m.opp?.abbr} className="h-6 w-6" />
                  <span className="flex-1 text-sm text-ink">{m.isHome ? "vs" : "at"} {m.opp?.name}</span>
                  <span className="text-[11px] text-ink-muted">{m.state === "post" ? `${m.ars?.score}–${m.opp?.score}` : relDay(m.date)} · {m.compShort}</span>
                </button>
              ))}
            </Group>
          )}
          {res?.history.length > 0 && (
            <Group title="History">
              {res.history.map((h, i) => (
                <button key={i} onClick={() => go(h.kind === "invincibles" ? "#/history/invincibles" : "#/history")} className="block w-full rounded-lg px-2 py-2 text-left hover:bg-surface-2">
                  <p className="text-sm font-semibold leading-snug text-ink"><span className="tabular-nums text-accent">{h.label}</span> · {h.title}</p>
                  <p className="line-clamp-1 text-[11px] text-ink-muted">{h.text}</p>
                </button>
              ))}
            </Group>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Homepage ───────────────────────── */

function AtAGlance({ s }) {
  const row = s.standings.data?.rows?.find((r) => r.id === TEAM_ID);
  const total = s.standings.data?.rows?.length;
  const leader = s.standings.data?.rows?.[0];
  const results = s.schedule.data?.results ?? [];
  const gap = row && leader ? (row.id === leader.id ? s.standings.data.rows[1] && row.pts - s.standings.data.rows[1].pts : row.pts - leader.pts) : null;
  return (
    <Panel className="flex h-full flex-col gap-4 p-4">
      <p className="eyebrow text-ink-muted">At a glance</p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] text-ink-muted">Premier League</p>
          {row ? (
            <p className="font-display text-4xl font-bold leading-none text-ink">
              {row.rank}<span className="text-base text-ink-muted">{["th", "st", "nd", "rd"][(row.rank % 100 > 10 && row.rank % 100 < 14) ? 0 : row.rank % 10] ?? "th"}</span>
            </p>
          ) : <p className="text-sm text-ink-muted">{s.standings.status === "error" ? "Table unavailable" : "Loading…"}</p>}
        </div>
        {row && (
          <div className="text-right text-[13px]">
            <p><span className="font-display text-xl font-bold tabular-nums text-ink">{row.pts}</span> <span className="text-ink-muted">pts · {row.gp} played</span></p>
            {gap != null && <p className="text-ink-muted">{row.id === leader.id ? `${gap >= 0 ? "+" : ""}${gap} clear at the top` : `${Math.abs(gap)} pts behind ${leader.short}`}</p>}
          </div>
        )}
      </div>
      <div>
        <p className="mb-1.5 text-[11px] text-ink-muted">Form, last 5 (oldest → newest)</p>
        {results.length ? <FormStrip results={results} /> : <div className="h-7" />}
      </div>
      {total ? <p className="mt-auto text-[11px] text-ink-muted">{s.standings.data.season}</p> : null}
    </Panel>
  );
}

const HOME_FILTERS = [
  { id: "all", label: "All" },
  { id: "match", label: "Match" },
  { id: "transfer", label: "Transfers" },
  { id: "injury", label: "Injuries" },
];

/** Followed players and recently opened pages, kept on this device. */
function YourHub({ saved, recents }) {
  const players = Object.entries(saved.saved);
  if (!players.length && !recents.recents.length) return null;
  return (
    <section>
      <SectionHead title="Your hub" action={recents.recents.length > 0 && <button onClick={recents.clear} className="text-[11px] font-semibold text-ink-muted hover:text-ink">Clear history</button>} />
      <Panel className="divide-y divide-line">
        {players.length > 0 && (
          <div className="p-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Following</p>
            <div className="flex flex-wrap gap-1.5">
              {players.map(([id, p]) => (
                <a key={id} href={`#/squad/player/${id}${p.team === "women" ? "?team=women" : ""}`} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink hover:bg-line">{p.name}</a>
              ))}
            </div>
          </div>
        )}
        {recents.recents.length > 0 && (
          <div className="p-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Recently visited</p>
            <ul className="space-y-1">
              {recents.recents.slice(0, 5).map((r) => (
                <li key={r.href}><a href={r.href} className="text-[13px] text-ink hover:text-accent">{r.title} <span className="text-[11px] text-ink-muted">· {r.kind}</span></a></li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </section>
  );
}

function HomePage({ s, load, stories, transfers, bookmarks, prefs, setPrefs, saved, recents }) {
  const now = useNow();
  const arsenal = stories.filter((x) => x.scope === "arsenal");
  const briefing = useMemo(() => pickBriefing(stories, now), [stories]); // eslint-disable-line react-hooks/exhaustive-deps
  const featured = briefing[0] ?? null;
  const fan = useMemo(() => fanTalk(stories), [stories]);
  const homeCat = prefs.homeCategory ?? "all";
  const latest = arsenal
    .filter((x) => !briefing.includes(x))
    .filter((x) => homeCat === "all" || x.categories.has(homeCat))
    .sort((a, b) => (b.date ?? 0) - (a.date ?? 0))
    .slice(0, 8);
  const newsLoading = !s.arsenalNews.data && s.arsenalNews.status === "loading";
  const fixtures = s.schedule.data?.fixtures ?? [];
  const results = s.schedule.data?.results ?? [];
  const today = fixtures.find((m) => sameDay(m.date, new Date(now)) || m.state === "in");
  const matchNews = today ? arsenal.filter((x) => x.categories.has("match") && x.date && now - x.date < 30 * 3600e3).slice(0, 3) : [];
  const fanDown = (s.arsenalNews.data?.feeds ?? []).filter((f) => ["arseblog", "reddit"].includes(f.id)).every((f) => !f.ok);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow text-accent">{fmtLongDay(new Date(now))}</p>
        <h1 className="text-2xl text-ink sm:text-3xl">{today ? "It’s matchday" : "Your Arsenal briefing"}</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><NextMatchHero source={s.schedule} onRetry={() => load("schedule")} /></div>
        <AtAGlance s={s} />
      </div>

      {matchNews.length > 0 && (
        <section>
          <SectionHead eyebrow="Matchday" title="Build-up & team news" href="#/news?cat=match" />
          <Panel className="divide-y divide-line px-4">
            {matchNews.map((st) => <StoryRow key={st.id} story={st} bookmarks={bookmarks} now={now} dense />)}
          </Panel>
        </section>
      )}

      <section>
        {newsLoading ? <FeaturedSkeleton /> : featured ? <FeaturedStory story={featured} bookmarks={bookmarks} now={now} />
          : s.arsenalNews.status === "error" ? <Panel><EmptyState>News feeds are unavailable right now. Try refreshing.</EmptyState></Panel> : null}
        {briefing.length > 1 && (
          <div className="mt-4">
            <SectionHead eyebrow="Daily briefing" title="Five things to know" />
            <Panel className="px-4"><BriefingList stories={briefing} bookmarks={bookmarks} now={now} skipFirst /></Panel>
            <p className="mt-1.5 text-[11px] text-ink-muted">The most important Arsenal stories of the last two days, ranked by recency, source reliability and how many outlets cover them. Summaries are the outlets’ own descriptions.</p>
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionHead title="Latest" href="#/news" linkLabel="All news" />
          <Chips options={HOME_FILTERS} value={homeCat} onChange={(v) => setPrefs((p) => ({ ...p, homeCategory: v }))} className="mb-1" />
          <div className="divide-y divide-line">
            {newsLoading ? <StoryListSkeleton rows={5} /> : latest.length ? latest.map((st) => <StoryRow key={st.id} story={st} bookmarks={bookmarks} now={now} />)
              : <EmptyState>{s.arsenalNews.status === "error" && !s.arsenalNews.data ? "News unavailable." : "No stories in this category right now."}</EmptyState>}
          </div>
        </section>

        <aside className="space-y-8">
          <section>
            <SectionHead title="Transfer watch" href="#/transfers" />
            <Panel className="overflow-hidden"><TransferWatch entries={transfers} unavailable={s.arsenalNews.status === "error" && !s.arsenalNews.data} /></Panel>
          </section>
          <section>
            <SectionHead title="Upcoming" href="#/matches" linkLabel="All fixtures" />
            <Panel className="overflow-hidden"><MatchList matches={fixtures.slice(0, 3)} dense empty={s.schedule.status === "error" ? "Fixtures unavailable." : s.schedule.data ? "No fixtures announced." : "Loading…"} /></Panel>
          </section>
          <section>
            <SectionHead title="Recent results" href="#/matches" />
            <Panel className="overflow-hidden"><MatchList matches={results.filter((m) => !m.friendly).slice(0, 3)} dense empty={s.schedule.status === "error" ? "Results unavailable." : s.schedule.data ? "No results yet." : "Loading…"} /></Panel>
          </section>
          <section>
            <SectionHead title="Premier League" href="#/matches" linkLabel="Full table" />
            <Panel className="overflow-hidden"><StandingsTable source={s.standings} onRetry={() => load("standings")} /></Panel>
          </section>
          <section>
            <SectionHead title="Injuries & doubts" href="#/squad" linkLabel="Squad" />
            <Panel className="overflow-hidden"><AvailabilityList source={s.roster} limit={5} /></Panel>
            <p className="mt-1.5 text-[11px] text-ink-muted">From ESPN injury reports, which can lag club updates.</p>
          </section>
          <section>
            <SectionHead title="Fan talk" />
            <Panel className="overflow-hidden"><FanTalk stories={fan} unavailable={fanDown && !newsLoading} now={now} /></Panel>
            <p className="mt-1.5 text-[11px] text-ink-muted">Opinion from fan sites, not reporting.</p>
          </section>
          <YourHub saved={saved} recents={recents} />
        </aside>
      </div>
    </div>
  );
}

/* ───────────────────────── App ───────────────────────── */

const TITLES = {
  home: "Arsenal Hub", news: "News · Arsenal Hub", matches: "Match Centre · Arsenal Hub", transfers: "Transfers · Arsenal Hub",
  squad: "Squad · Arsenal Hub", analysis: "Analysis · Arsenal Hub", history: "History · Arsenal Hub",
};

export default function App() {
  const { sources: s, load, ensure, refreshAll, refreshing, lastUpdated } = useHubData();
  const route = useRoute();
  const [dark, setDark] = useDarkMode();
  const [prefs, setPrefs] = usePersistentState("afc-prefs-v1", {});
  const bookmarks = useBookmarks();
  const saved = useSavedPlayers();
  const watch = useWatchlist();
  const predictions = usePredictions();
  const recents = useRecents();
  const [searchOpen, setSearchOpen] = useState(false);
  const [newsQuery, setNewsQuery] = useState("");
  const { stories, transfers } = useIntelligence(s);
  const now = useNow();
  const team = route.query.get("team") === "women" ? "women" : "men";

  // Deep links: #/news?cat=injury, #/news?q=saka
  useEffect(() => {
    if (route.page !== "news") return;
    const cat = route.query.get("cat");
    const q = route.query.get("q");
    if (cat) setPrefs((p) => ({ ...p, newsCategory: cat }));
    if (q != null) setNewsQuery(q);
  }, [route]); // eslint-disable-line react-hooks/exhaustive-deps

  // The women's squad data is only fetched when someone asks for it.
  useEffect(() => {
    const needs = team === "women" && ["squad", "analysis"].includes(route.page);
    if (needs) ensure("womenRoster");
  }, [team, route.page, ensure]);
  // Search covers both teams, so opening it loads the women's squad and fixtures too (once).
  useEffect(() => { if (searchOpen) { ensure("womenRoster"); ensure("womenSchedule"); } }, [searchOpen, ensure]);
  // Opening any search result for a player on the women's team (profile) also needs its roster.
  useEffect(() => { if (route.page === "squad" && route.parts[0] === "player" && team === "women") ensure("womenRoster"); }, [route, team, ensure]);

  useEffect(() => { document.title = TITLES[route.page] ?? "Arsenal Hub"; }, [route.page]);

  // Recently visited: player profiles and matches
  useEffect(() => {
    if (route.page === "squad" && route.parts[0] === "player") {
      const id = route.parts[1];
      const src = team === "women" ? s.womenRoster : s.roster;
      const p = src.data?.players.find((x) => String(x.id) === String(id));
      if (p) recents.push({ kind: "player", title: p.name, href: `#/squad/player/${id}${team === "women" ? "?team=women" : ""}` });
    } else if (route.page === "matches" && route.parts[0]) {
      const id = route.parts[0];
      const m = [s.schedule.data, s.womenSchedule.data].flatMap((d) => (d ? [...d.fixtures, ...d.results] : [])).find((x) => String(x.id) === String(id));
      if (m) recents.push({ kind: "match", title: `${m.home.short} v ${m.away.short}`, href: `#/matches/${id}` });
    }
  }, [route, s.roster.data, s.womenRoster.data, s.schedule.data, s.womenSchedule.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // "/" opens search
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement?.tagName ?? "")) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const injuryStories = stories.filter((x) => x.scope === "arsenal" && x.categories.has("injury")).sort((a, b) => (b.date ?? 0) - (a.date ?? 0));
  const newsLoading = !s.arsenalNews.data && s.arsenalNews.status === "loading";
  const womens = team === "women";
  const roster = womens ? s.womenRoster : s.roster;

  let page;
  switch (route.page) {
    case "news":
      page = <NewsPage stories={stories} sources={s} load={load} bookmarks={bookmarks} prefs={prefs} setPrefs={setPrefs} query={newsQuery} setQuery={setNewsQuery} squad={s.roster.data?.players ?? []} />;
      break;
    case "matches":
      page = route.parts[0]
        ? <MatchDetailPage id={route.parts[0]} schedules={[s.schedule, s.womenSchedule]} stories={stories} onRetrySchedule={() => load("schedule")} ensure={ensure} predictions={predictions}
            squads={{ men: s.roster.data?.players ?? [], women: s.womenRoster.data?.players ?? [] }} />
        : <MatchCentrePage sources={s} load={load} prefs={prefs} setPrefs={setPrefs} team={team} ensure={ensure} />;
      break;
    case "transfers":
      page = <TransfersPage entries={transfers} loading={newsLoading} failed={s.arsenalNews.status === "error"} prefs={prefs} setPrefs={setPrefs} archiveDays={ARCHIVE_DAYS} watch={watch} />;
      break;
    case "squad":
      page = route.parts[0] === "player"
        ? <PlayerProfilePage id={route.parts[1]} team={team} roster={roster} stories={stories} bookmarks={bookmarks} saved={saved} onRetryRoster={() => load(womens ? "womenRoster" : "roster")} />
        : <SquadPage team={team} source={roster} onRetry={() => load(womens ? "womenRoster" : "roster")} injuryStories={injuryStories} bookmarks={bookmarks} now={now} prefs={prefs} setPrefs={setPrefs} saved={saved} />;
      break;
    case "analysis": {
      const ids = [route.query.get("a") ?? "", route.query.get("b") ?? ""];
      const setIds = ([a, b]) => {
        const qs = new URLSearchParams();
        if (a) qs.set("a", a);
        if (b) qs.set("b", b);
        if (womens) qs.set("team", "women");
        window.location.hash = `#/analysis?${qs.toString()}`;
      };
      page = <ComparePage team={team} roster={roster} onRetry={() => load(womens ? "womenRoster" : "roster")} ids={ids} setIds={setIds} prefs={prefs} setPrefs={setPrefs} />;
      break;
    }
    case "history":
      page = <HistoryPage tab={route.parts[0]} prefs={prefs} setPrefs={setPrefs} />;
      break;
    default:
      page = <HomePage s={s} load={load} stories={stories} transfers={transfers} bookmarks={bookmarks} prefs={prefs} setPrefs={setPrefs} saved={saved} recents={recents} />;
  }

  return (
    <div className="min-h-screen bg-page text-ink">
      <a
        href="#main"
        onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <Header route={route} dark={dark} setDark={setDark} onRefresh={refreshAll} refreshing={refreshing} openSearch={() => setSearchOpen(true)} sources={s} lastUpdated={lastUpdated} />
      <main id="main" tabIndex={-1} className="pb-safe mx-auto max-w-6xl px-4 pt-5 outline-none sm:pt-8">
        <div className="mb-4 flex items-center justify-between text-[11px] text-ink-muted xl:hidden">
          <Freshness sources={s} lastUpdated={lastUpdated} refreshing={refreshing} />
        </div>
        <div key={route.page + route.parts.join("/") + team} className="fade-up">{page}</div>
        <footer className="mt-12 border-t border-line pt-4 text-[11px] leading-relaxed text-ink-muted">
          <p>
            Unofficial fan site, not affiliated with Arsenal FC. Match, squad and player data from ESPN; news from BBC Sport, Sky Sports, The Athletic, The Guardian, ESPN,
            football.london, Arseblog and r/Gunners (headlines and feed summaries only; every story links to the original). The history section is a curated reference.
            Preferences, saved items, predictions and recent stories are stored on this device only.
          </p>
          <p className="mt-1">Times shown in your timezone. Last refresh: {lastUpdated ? fmtTime(lastUpdated) : "—"}.</p>
        </footer>
      </main>
      <BottomNav route={route} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} stories={stories} transfers={transfers}
        schedules={[s.schedule.data, s.womenSchedule.data]} squads={{ men: s.roster.data?.players, women: s.womenRoster.data?.players }} />
    </div>
  );
}
