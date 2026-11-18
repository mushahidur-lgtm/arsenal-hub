/**
 * Arsenal Hub: a daily Arsenal briefing.
 *
 * App shell: hash routing (works on GitHub Pages with no server config),
 * header + mobile bottom nav, search, theme, and the homepage. Data loading
 * lives in lib/data.js; news intelligence in lib/news.js; transfers in
 * lib/transfers.js. Pages live in components/.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowRight, CalendarDays, Home, Moon, Newspaper, RefreshCw, Repeat, Search, Sun, Users, X,
} from "lucide-react";
import { TEAM_ID, lookupPlayers, useHubData } from "./lib/data.js";
import { buildStories, pickFeatured, playerKeys } from "./lib/news.js";
import { buildTransfers, namesToLookUp } from "./lib/transfers.js";
import { readJSON, useBookmarks, usePersistentState } from "./lib/storage.js";
import { fmtLongDay, fmtTime, relDay, sameDay, timeAgo } from "./lib/format.js";
import { Chips, Crest, EmptyState, Panel, SectionHead, cx, useNow } from "./components/ui.jsx";
import { FeaturedSkeleton, FeaturedStory, NewsPage, StoryListSkeleton, StoryRow } from "./components/news.jsx";
import { FormStrip, MatchCentrePage, MatchDetailPage, MatchList, NextMatchHero, StandingsTable } from "./components/matches.jsx";
import { AvailabilityList, PlayerAvatar, SquadPage } from "./components/squad.jsx";
import { TransferWatch, TransfersPage } from "./components/transfers.jsx";

const CREST = `https://a.espncdn.com/i/teamlogos/soccer/500/${TEAM_ID}.png`;
const ARCHIVE_DAYS = 21;

/* ───────────────────────── Routing ───────────────────────── */

const NAV = [
  { id: "home", label: "Home", href: "#/", icon: Home },
  { id: "news", label: "News", href: "#/news", icon: Newspaper },
  { id: "matches", label: "Matches", href: "#/matches", icon: CalendarDays },
  { id: "transfers", label: "Transfers", href: "#/transfers", icon: Repeat },
  { id: "squad", label: "Squad", href: "#/squad", icon: Users },
];

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [path, qs] = raw.split("?");
  const [page = "", param] = path.split("/");
  const known = NAV.some((n) => n.id === page);
  // Legacy tab ids from the previous version of the site
  const legacy = { overview: "home", fixtures: "matches", stats: "matches" }[page];
  return { page: legacy ?? (known ? page : "home"), param: param ? decodeURIComponent(param) : null, query: new URLSearchParams(qs ?? "") };
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
    if (!stories.length) return;
    const names = namesToLookUp(stories, keys);
    if (!names.length) return;
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
        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((n) => (
            <a key={n.id} href={n.href} aria-current={route.page === n.id ? "page" : undefined}
              className={cx("relative rounded-md px-3 py-2 text-sm font-semibold transition",
                route.page === n.id ? "text-accent" : "text-ink-muted hover:text-ink")}>
              {n.label}
              {route.page === n.id && <span className="absolute inset-x-3 -bottom-[11px] h-0.5 rounded-full bg-brand" />}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <span className="mr-2 hidden text-[11px] text-ink-muted lg:block">
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

function BottomNav({ route }) {
  return (
    <nav className="bottom-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:hidden" aria-label="Main">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {NAV.map(({ id, label, href, icon: Icon }) => {
          const active = route.page === id;
          return (
            <a key={id} href={href} aria-current={active ? "page" : undefined}
              className={cx("flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold", active ? "text-accent" : "text-ink-muted")}>
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              {label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function SearchOverlay({ open, onClose, stories, schedule, players }) {
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
  if (!open) return null;
  const term = q.trim().toLowerCase();
  const news = term ? stories.filter((s) => s.scope === "arsenal" && s.articles.some((a) => a.title.toLowerCase().includes(term) || (a.summary ?? "").toLowerCase().includes(term))).slice(0, 6) : [];
  const matches = term && schedule ? [...schedule.fixtures, ...schedule.results].filter((m) => `${m.opp?.name} ${m.competition}`.toLowerCase().includes(term)).slice(0, 5) : [];
  const squad = term ? (players ?? []).filter((p) => p.name.toLowerCase().includes(term)).slice(0, 5) : [];
  const go = (href) => { window.location.hash = href; onClose(); };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Search">
      <div className="mx-auto mt-0 max-w-xl bg-surface p-3 shadow-2xl sm:mt-20 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={(e) => { e.preventDefault(); if (term) go(`#/news?q=${encodeURIComponent(q.trim())}`); }} className="flex items-center gap-2 border-b border-line pb-2">
          <Search size={18} className="ml-1 text-ink-muted" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search news, fixtures, players"
            className="min-w-0 flex-1 bg-transparent py-2 text-base text-ink placeholder:text-ink-muted focus:outline-none" aria-label="Search" />
          <button type="button" onClick={onClose} aria-label="Close search" className="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-surface-2"><X size={16} /></button>
        </form>
        <div className="max-h-[70vh] overflow-y-auto">
          {!term && <p className="px-2 py-6 text-center text-sm text-ink-muted">Try a player, an opponent or a topic, e.g. “Saka”, “Chelsea”, “contract”.</p>}
          {term && !news.length && !matches.length && !squad.length && <p className="px-2 py-6 text-center text-sm text-ink-muted">No results for “{q}”.</p>}
          {news.length > 0 && (
            <div className="py-2">
              <p className="eyebrow px-2 py-1 text-ink-muted">News</p>
              {news.map((s) => (
                <a key={s.id} href={s.lead.link} target="_blank" rel="noopener noreferrer" className="block rounded-lg px-2 py-2 hover:bg-surface-2">
                  <p className="text-sm font-semibold leading-snug text-ink">{s.lead.title}</p>
                  <p className="text-[11px] text-ink-muted">{s.lead.source} · {timeAgo(s.date)}</p>
                </a>
              ))}
              <button onClick={() => go(`#/news?q=${encodeURIComponent(q.trim())}`)} className="mt-1 inline-flex items-center gap-1 px-2 text-xs font-semibold text-accent">All news results <ArrowRight size={12} /></button>
            </div>
          )}
          {matches.length > 0 && (
            <div className="py-2">
              <p className="eyebrow px-2 py-1 text-ink-muted">Matches</p>
              {matches.map((m) => (
                <button key={m.id} onClick={() => go(`#/matches/${m.id}`)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-surface-2">
                  <Crest src={m.opp?.logo} alt={m.opp?.abbr} className="h-6 w-6" />
                  <span className="flex-1 text-sm text-ink">{m.isHome ? "vs" : "at"} {m.opp?.name}</span>
                  <span className="text-[11px] text-ink-muted">{m.state === "post" ? `${m.ars?.score}–${m.opp?.score}` : relDay(m.date)} · {m.compShort}</span>
                </button>
              ))}
            </div>
          )}
          {squad.length > 0 && (
            <div className="py-2">
              <p className="eyebrow px-2 py-1 text-ink-muted">Squad</p>
              {squad.map((p) => (
                <button key={p.id} onClick={() => go("#/squad")} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-surface-2">
                  <PlayerAvatar p={p} className="h-7 w-7" />
                  <span className="flex-1 text-sm text-ink">{p.name}</span>
                  <span className="text-[11px] text-ink-muted">{p.position}</span>
                </button>
              ))}
            </div>
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

function HomePage({ s, load, stories, transfers, bookmarks, prefs, setPrefs }) {
  const now = useNow();
  const arsenal = stories.filter((x) => x.scope === "arsenal");
  const featured = useMemo(() => pickFeatured(stories, now), [stories]); // eslint-disable-line react-hooks/exhaustive-deps
  const homeCat = prefs.homeCategory ?? "all";
  const latest = arsenal
    .filter((x) => x !== featured)
    .filter((x) => homeCat === "all" || x.categories.has(homeCat))
    .sort((a, b) => (b.date ?? 0) - (a.date ?? 0))
    .slice(0, 8);
  const newsLoading = !s.arsenalNews.data && s.arsenalNews.status === "loading";
  const fixtures = s.schedule.data?.fixtures ?? [];
  const results = s.schedule.data?.results ?? [];
  const today = fixtures.find((m) => sameDay(m.date, new Date(now)) || m.state === "in");
  const matchNews = today ? arsenal.filter((x) => x.categories.has("match") && x.date && now - x.date < 30 * 3600e3).slice(0, 3) : [];

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
        </aside>
      </div>
    </div>
  );
}

/* ───────────────────────── App ───────────────────────── */

const TITLES = { home: "Arsenal Hub", news: "News · Arsenal Hub", matches: "Match Centre · Arsenal Hub", transfers: "Transfers · Arsenal Hub", squad: "Squad · Arsenal Hub" };

export default function App() {
  const { sources: s, load, refreshAll, refreshing, lastUpdated } = useHubData();
  const route = useRoute();
  const [dark, setDark] = useDarkMode();
  const [prefs, setPrefs] = usePersistentState("afc-prefs-v1", {});
  const bookmarks = useBookmarks();
  const [searchOpen, setSearchOpen] = useState(false);
  const [newsQuery, setNewsQuery] = useState("");
  const { stories, transfers } = useIntelligence(s);
  const now = useNow();

  // Deep links: #/news?cat=injury, #/news?q=saka
  useEffect(() => {
    if (route.page !== "news") return;
    const cat = route.query.get("cat");
    const q = route.query.get("q");
    if (cat) setPrefs((p) => ({ ...p, newsCategory: cat }));
    if (q != null) setNewsQuery(q);
  }, [route]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { document.title = TITLES[route.page] ?? "Arsenal Hub"; }, [route.page]);

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

  let page;
  switch (route.page) {
    case "news":
      page = <NewsPage stories={stories} sources={s} load={load} bookmarks={bookmarks} prefs={prefs} setPrefs={setPrefs} query={newsQuery} setQuery={setNewsQuery} />;
      break;
    case "matches":
      page = route.param
        ? <MatchDetailPage id={route.param} schedule={s.schedule} stories={stories} onRetrySchedule={() => load("schedule")} />
        : <MatchCentrePage sources={s} load={load} prefs={prefs} setPrefs={setPrefs} />;
      break;
    case "transfers":
      page = <TransfersPage entries={transfers} loading={newsLoading} failed={s.arsenalNews.status === "error"} prefs={prefs} setPrefs={setPrefs} archiveDays={ARCHIVE_DAYS} />;
      break;
    case "squad":
      page = <SquadPage source={s.roster} onRetry={() => load("roster")} injuryStories={injuryStories} bookmarks={bookmarks} now={now} prefs={prefs} setPrefs={setPrefs} />;
      break;
    default:
      page = <HomePage s={s} load={load} stories={stories} transfers={transfers} bookmarks={bookmarks} prefs={prefs} setPrefs={setPrefs} />;
  }

  return (
    <div className="min-h-screen bg-page text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">Skip to content</a>
      <Header route={route} dark={dark} setDark={setDark} onRefresh={refreshAll} refreshing={refreshing} openSearch={() => setSearchOpen(true)} sources={s} lastUpdated={lastUpdated} />
      <main id="main" className="pb-safe mx-auto max-w-6xl px-4 pt-5 sm:pt-8">
        <div className="mb-4 flex items-center justify-between text-[11px] text-ink-muted lg:hidden">
          <Freshness sources={s} lastUpdated={lastUpdated} refreshing={refreshing} />
        </div>
        <div key={route.page + (route.param ?? "")} className="fade-up">{page}</div>
        <footer className="mt-12 border-t border-line pt-4 text-[11px] leading-relaxed text-ink-muted">
          <p>
            Unofficial fan site, not affiliated with Arsenal FC. Match data from ESPN; news from BBC Sport, Sky Sports, The Athletic, The Guardian, ESPN,
            football.london, Arseblog and r/Gunners (headlines and feed summaries only; every story links to the original).
            Preferences, saved articles and recent stories are stored on this device only.
          </p>
          <p className="mt-1">Times shown in your timezone. Last refresh: {lastUpdated ? fmtTime(lastUpdated) : "—"}.</p>
        </footer>
      </main>
      <BottomNav route={route} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} stories={stories} schedule={s.schedule.data} players={s.roster.data?.players} />
    </div>
  );
}
