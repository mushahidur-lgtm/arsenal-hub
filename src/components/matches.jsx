import React, { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowLeft, CalendarDays, Goal, MapPin, RefreshCw, Shield, ShieldCheck, Star, Target, Trophy,
} from "lucide-react";
import { TEAM_ID, WOMEN_ID, fetchMatchSummary } from "../lib/data.js";
import { LineupPanel, MatchReport, PredictionBox } from "./pitch.jsx";
import { TeamSwitch } from "./squad.jsx";
import { fmtDay, fmtFull, fmtKick, fmtLongDay, fmtTime, ordinal, relDay, sameDay, signed, timeAgo, tzShort, userTz } from "../lib/format.js";
import {
  Chips, CompBadge, Crest, EmptyState, ErrorState, Panel, ResultPill, SectionHead, Skel, SkeletonRows, SourceGate, StaleBanner, cx, useNow,
} from "./ui.jsx";

/* ───────────────────────── Countdown ───────────────────────── */

export function useCountdown(target) {
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

function CountdownUnit({ value, label }) {
  return (
    <div className="flex min-w-[3.25rem] flex-col items-center rounded-lg bg-white/[0.07] px-2 py-1.5 ring-1 ring-white/10 sm:min-w-[3.75rem]">
      <span className="font-display text-xl font-bold tabular-nums sm:text-2xl">{String(value).padStart(2, "0")}</span>
      <span className="text-[9px] font-semibold uppercase tracking-widest text-white/60">{label}</span>
    </div>
  );
}

export function Countdown({ date }) {
  const cd = useCountdown(date);
  if (cd.done) return null;
  return (
    <div className="flex gap-1.5 sm:gap-2" role="timer" aria-label={`Kick-off in ${cd.d} days ${cd.h} hours ${cd.m} minutes`}>
      {cd.d > 0 && <CountdownUnit value={cd.d} label="Days" />}
      <CountdownUnit value={cd.h} label="Hrs" />
      <CountdownUnit value={cd.m} label="Min" />
      <CountdownUnit value={cd.s} label="Sec" />
    </div>
  );
}

/* ───────────────────────── Hero: next / live match ───────────────────────── */

const pickNext = (data) => {
  if (!data) return { next: null, last: null };
  const live = data.fixtures.find((m) => m.state === "in");
  const next = live ?? data.fixtures.find((m) => !m.postponed) ?? null;
  const last = data.results.find((m) => !m.friendly) ?? data.results[0] ?? null;
  return { next, last };
};

function HeroShell({ children, className }) {
  return (
    <div className={cx("relative overflow-hidden rounded-2xl bg-gradient-to-br from-hero-from via-hero-from to-hero-to text-white", className)}>
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/25 blur-3xl" />
      <div className="relative">{children}</div>
    </div>
  );
}

function HeroSide({ side, isArsenal }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-white p-2 sm:h-20 sm:w-20 sm:p-2.5">
        <Crest src={side?.logo} alt={side?.abbr} className="h-full w-full" />
      </div>
      <span className={cx("line-clamp-2 text-sm font-semibold sm:text-base", isArsenal && "text-white")}>{side?.short ?? side?.name ?? "TBD"}</span>
    </div>
  );
}

/** The next match, prominent but compact. Matchday-aware. */
export function NextMatchHero({ source, onRetry }) {
  const now = useNow(30000);
  if (!source.data) {
    if (source.status === "error")
      return <HeroShell><div className="[&_p]:text-white/80"><ErrorState message={source.error} onRetry={onRetry} title="Couldn’t load fixtures" /></div></HeroShell>;
    return (
      <HeroShell className="p-5 sm:p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="h-3 w-32 animate-pulse rounded bg-white/15" />
          <div className="flex w-full items-center justify-around"><div className="h-16 w-16 animate-pulse rounded-full bg-white/15" /><div className="h-6 w-10 animate-pulse rounded bg-white/15" /><div className="h-16 w-16 animate-pulse rounded-full bg-white/15" /></div>
          <div className="h-10 w-56 animate-pulse rounded bg-white/10" />
        </div>
      </HeroShell>
    );
  }
  const { next, last } = pickNext(source.data);
  if (!next)
    return (
      <HeroShell className="p-6 text-center">
        <Trophy className="mx-auto mb-2 text-gold-light" />
        <p className="font-semibold">No upcoming fixtures announced yet</p>
        {last && <p className="mt-1 text-sm text-white/70">Latest: {last.home.short} {last.home.score}–{last.away.score} {last.away.short} · {fmtDay(last.date)}</p>}
      </HeroShell>
    );

  const inPlay = next.state === "in";
  const today = sameDay(next.date, new Date(now));
  const kickedOff = !inPlay && next.date.getTime() <= now;
  return (
    <HeroShell>
      <a href={`#/matches/${next.id}`} className="block p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-widest">
          {inPlay ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> In play · {next.clock || next.statusDetail}
            </span>
          ) : today ? (
            <span className="rounded-full bg-brand px-2.5 py-1">Matchday</span>
          ) : (
            <span className="rounded-full bg-white/10 px-2.5 py-1">Next match</span>
          )}
          <span className="rounded-full bg-white/10 px-2.5 py-1">{next.competition}</span>
          <span className="rounded-full bg-white/10 px-2.5 py-1">{next.isHome ? "Home" : "Away"}</span>
        </div>

        <div className="mx-auto flex max-w-md items-center gap-2">
          <HeroSide side={next.home} isArsenal={next.home?.id === TEAM_ID} />
          <div className="flex shrink-0 flex-col items-center px-1">
            {inPlay ? (
              <span className="font-display text-4xl font-bold tabular-nums">{next.home.score ?? 0}–{next.away.score ?? 0}</span>
            ) : (
              <>
                <span className="font-display text-2xl font-bold tabular-nums sm:text-3xl">{fmtTime(next.date)}</span>
                <span className="text-[11px] text-white/60">{tzShort(next.date)}</span>
              </>
            )}
          </div>
          <HeroSide side={next.away} isArsenal={next.away?.id === TEAM_ID} />
        </div>

        <div className="mt-4 flex flex-col items-center gap-3">
          {!inPlay && !kickedOff && <Countdown date={next.date} />}
          {kickedOff && <p className="text-sm text-white/80">Kick-off time has passed. Waiting for ESPN to report the match status.</p>}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] text-white/75">
            <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} /> {today ? "Today" : fmtLongDay(next.date)}, {fmtTime(next.date)}</span>
            {next.venue && <span className="inline-flex items-center gap-1.5"><MapPin size={13} /> {next.venue}</span>}
          </div>
          {inPlay && (
            <p className="text-[11px] text-white/60">
              Score from ESPN, re-checked every minute{source.savedAt ? ` · last checked ${fmtTime(source.savedAt)}` : ""}. Not a live stream; it can lag the real match.
            </p>
          )}
          {!inPlay && <p className="text-[11px] text-white/50">Times in your timezone ({userTz})</p>}
        </div>
      </a>
      {last && (
        <a href={`#/matches/${last.id}`} className="flex items-center justify-center gap-2 border-t border-white/10 px-4 py-2.5 text-xs text-white/70 hover:bg-white/5">
          <span>Last result</span>
          <ResultPill r={last.result} className="h-5 w-5 text-[10px]" />
          <span className="font-semibold text-white">{last.home.short} {last.home.score}–{last.away.score} {last.away.short}</span>
          <span className="hidden sm:inline">· {last.compShort} · {fmtDay(last.date)}</span>
        </a>
      )}
    </HeroShell>
  );
}

/* ───────────────────────── Fixture rows ───────────────────────── */

export function MatchRow({ m, dense }) {
  const done = m.state === "post";
  return (
    <li>
      <a href={`#/matches/${m.id}`} className={cx("flex items-center gap-3 transition hover:bg-surface-2", dense ? "px-3 py-2.5" : "px-4 py-3")}>
        {done ? (
          <ResultPill r={m.friendly ? null : m.result} className="h-6 w-6 text-[11px]" />
        ) : (
          <span className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-md text-[10px] font-bold", m.isHome ? "bg-ink text-surface" : "bg-surface-2 text-ink-muted")} title={m.isHome ? "Home" : "Away"}>
            {m.isHome ? "H" : "A"}
          </span>
        )}
        <Crest src={m.opp?.logo} alt={m.opp?.abbr} className={dense ? "h-6 w-6" : "h-7 w-7"} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{m.isHome ? "vs" : "at"} {m.opp?.short ?? m.opp?.name}</p>
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-ink-muted">
            <CompBadge match={m} />
            <span>{done ? fmtDay(m.date) : `${relDay(m.date)} · ${fmtTime(m.date)}`}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          {done ? (
            <span className="font-display text-base font-bold tabular-nums text-ink">
              {m.ars?.score}<span className="text-ink-muted">–</span>{m.opp?.score}
            </span>
          ) : m.state === "in" ? (
            <span className="rounded bg-brand px-1.5 py-0.5 text-[11px] font-bold text-white">{m.ars?.score}–{m.opp?.score} · {m.clock}</span>
          ) : m.postponed ? (
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Postponed</span>
          ) : (
            <span className="text-[11px] text-ink-muted">{tzShort(m.date)}</span>
          )}
        </div>
      </a>
    </li>
  );
}

export function MatchList({ matches, dense, empty = "Nothing to show." }) {
  if (!matches.length) return <EmptyState>{empty}</EmptyState>;
  return <ul className="divide-y divide-line">{matches.map((m) => <MatchRow key={m.id} m={m} dense={dense} />)}</ul>;
}

/** Last N competitive results as W/D/L blocks (friendlies excluded). */
export function FormStrip({ results, n = 5, size = "h-7 w-7 text-xs" }) {
  const form = results.filter((m) => !m.friendly).slice(0, n).reverse();
  return (
    <div className="flex gap-1.5">
      {form.map((m) => (
        <a key={m.id} href={`#/matches/${m.id}`} className="hit" title={`${m.isHome ? "vs" : "at"} ${m.opp?.name} ${m.ars?.score}–${m.opp?.score} (${m.compShort}, ${fmtDay(m.date)})`}>
          <ResultPill r={m.result} className={size} />
        </a>
      ))}
    </div>
  );
}

/* ───────────────────────── League table ───────────────────────── */

const RIVALS = new Set(["367", "363", "360", "382", "364"]); // Spurs, Chelsea, Man Utd, Man City, Liverpool

export function StandingsTable({ source, onRetry, mode = "around", teamId = TEAM_ID }) {
  const [full, setFull] = useState(mode === "full");
  return (
    <SourceGate source={source} onRetry={onRetry} skeleton={<SkeletonRows rows={5} />}>
      {({ rows, season }) => {
        const idx = rows.findIndex((r) => r.id === teamId);
        let shown = rows;
        if (!full && idx >= 0) {
          const start = Math.max(0, Math.min(idx - 2, rows.length - 5));
          shown = rows.slice(start, start + 5);
        }
        return (
          <div>
            <table className="w-full table-fixed text-[13px]">
              <caption className="sr-only">Premier League table {season}</caption>
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-ink-muted">
                  <th scope="col" className="w-8 py-2 pl-3 text-left font-semibold">#</th>
                  <th scope="col" className="py-2 text-left font-semibold">Club</th>
                  <th scope="col" className="w-7 py-2 text-center font-semibold">P</th>
                  <th scope="col" className="hidden w-7 py-2 text-center font-semibold sm:table-cell">W</th>
                  <th scope="col" className="hidden w-7 py-2 text-center font-semibold sm:table-cell">D</th>
                  <th scope="col" className="hidden w-7 py-2 text-center font-semibold sm:table-cell">L</th>
                  <th scope="col" className="w-9 py-2 text-center font-semibold">GD</th>
                  <th scope="col" className="w-10 py-2 pr-3 text-right font-semibold">Pts</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const ars = r.id === teamId;
                  return (
                    <tr key={r.id} className={cx("border-t border-line", ars ? "bg-brand/[0.07] font-semibold text-ink" : "text-ink")} aria-current={ars ? "true" : undefined}>
                      <td className="relative py-2 pl-3 tabular-nums">
                        {r.note && <span className="absolute bottom-1.5 left-0 top-1.5 w-0.5 rounded-r" style={{ background: r.note.color }} title={r.note.label} />}
                        <span className={cx(ars && "text-accent")}>{r.rank}</span>
                      </td>
                      <td className="py-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <Crest src={r.logo} alt={r.abbr} className="h-5 w-5" />
                          <span className={cx("truncate", ars && "text-accent")}>{r.short}</span>
                          {RIVALS.has(r.id) && full && <Star size={9} className="shrink-0 text-gold-ink" aria-label="Rival" />}
                        </span>
                      </td>
                      <td className="py-2 text-center tabular-nums">{r.gp}</td>
                      <td className="hidden py-2 text-center tabular-nums sm:table-cell">{r.w}</td>
                      <td className="hidden py-2 text-center tabular-nums sm:table-cell">{r.d}</td>
                      <td className="hidden py-2 text-center tabular-nums sm:table-cell">{r.l}</td>
                      <td className="py-2 text-center tabular-nums">{signed(r.gd)}</td>
                      <td className="py-2 pr-3 text-right font-bold tabular-nums">{r.pts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2 text-[11px] text-ink-muted">
              <span>{season}</span>
              {mode !== "full" && (
                <button onClick={() => setFull((f) => !f)} className="font-semibold text-accent hover:underline">{full ? "Show around Arsenal" : "Full table"}</button>
              )}
            </div>
            {full && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 pb-3 text-[11px] text-ink-muted">
                {[...new Map(rows.filter((r) => r.note).map((r) => [r.note.label, r.note.color])).entries()].map(([l, c]) => (
                  <span key={l} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-1 rounded-sm" style={{ background: c }} />{l}</span>
                ))}
                <span className="inline-flex items-center gap-1.5"><Star size={9} className="text-gold-ink" /> Big Six rival</span>
              </div>
            )}
          </div>
        );
      }}
    </SourceGate>
  );
}

/* ───────────────────────── Season stats (moved from Stats tab) ───────────────────────── */

function StatTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-xl bg-surface-2/60 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted"><Icon size={12} /> {label}</div>
      <p className="mt-1 font-display text-xl font-bold tabular-nums text-ink">{value ?? "–"}</p>
      {sub && <p className="text-[11px] text-ink-muted">{sub}</p>}
    </div>
  );
}

const wdl = (list) => (list.length ? ["W", "D", "L"].map((r) => list.filter((m) => m.result === r).length).join("-") : null);

export function SeasonStats({ teamSrc, standingsSrc, scheduleSrc }) {
  const row = standingsSrc.data?.rows?.find((r) => r.id === TEAM_ID);
  const s = teamSrc.data?.stats ?? {};
  const gp = s.gamesPlayed ?? row?.gp;
  const w = s.wins ?? row?.w, d = s.ties ?? row?.d, l = s.losses ?? row?.l;
  const gf = s.pointsFor ?? row?.gf, ga = s.pointsAgainst ?? row?.ga;
  const league = (scheduleSrc.data?.results ?? []).filter((m) => m.leagueSlug === "eng.1");
  if (!row && !teamSrc.data) {
    if (standingsSrc.status === "error") return <ErrorState compact message={standingsSrc.error} />;
    return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skel key={i} className="h-[72px] rounded-xl" />)}</div>;
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile icon={Trophy} label="Position" value={ordinal(s.rank ?? row?.rank)} sub={`${s.points ?? row?.pts ?? "–"} pts`} />
        <StatTile icon={Activity} label="Record" value={`${w ?? "–"}-${d ?? "–"}-${l ?? "–"}`} sub={`${gp ?? "–"} played · W-D-L`} />
        <StatTile icon={Target} label="Scored" value={gf} sub={gp ? `${(gf / gp).toFixed(1)} per game` : null} />
        <StatTile icon={Shield} label="Conceded" value={ga} sub={gp ? `${(ga / gp).toFixed(1)} per game` : null} />
        <StatTile icon={ShieldCheck} label="Clean sheets" value={scheduleSrc.data ? league.filter((m) => m.opp?.score === 0).length : "–"} sub="League" />
        <StatTile icon={Goal} label="Goal diff" value={signed(s.pointDifferential ?? row?.gd)} />
        <StatTile icon={Star} label="Win rate" value={gp ? `${Math.round((w / gp) * 100)}%` : "–"} />
        <StatTile icon={MapPin} label="Home" value={wdl(league.filter((m) => m.isHome)) ?? "–"} sub={`Away ${wdl(league.filter((m) => !m.isHome)) ?? "–"}`} />
      </div>
      <p className="text-[11px] text-ink-muted">Premier League only. Home/away records and clean sheets are computed from ESPN results.</p>
    </div>
  );
}

/* ───────────────────────── Match Centre page ───────────────────────── */

const COMP_FILTERS = [
  { id: "all", label: "All" },
  { id: "eng.1", label: "Premier League" },
  { id: "uefa.champions", label: "Champions League" },
  { id: "eng.fa", label: "FA Cup" },
  { id: "eng.league_cup", label: "Carabao Cup" },
  { id: "eng.w.1", label: "Women’s Super League" },
  { id: "uefa.wchampions", label: "Women’s Champions League" },
  { id: "eng.w.fa_cup", label: "Women’s FA Cup" },
  { id: "eng.w.league_cup", label: "Women’s League Cup" },
  { id: "friendly", label: "Friendlies" },
];
const compMatch = (m, f) => (f === "all" ? true : f === "friendly" ? m.friendly : m.leagueSlug === f);

export function MatchCentrePage({ sources, load, prefs, setPrefs, team = "men", ensure }) {
  const womens = team === "women";
  const schedule = womens ? sources.womenSchedule : sources.schedule;
  const standings = womens ? sources.womenStandings : sources.standings;
  const scheduleKey = womens ? "womenSchedule" : "schedule";
  const standingsKey = womens ? "womenStandings" : "standings";
  useEffect(() => { if (womens) { ensure?.("womenSchedule"); ensure?.("womenStandings"); } }, [womens]); // eslint-disable-line react-hooks/exhaustive-deps
  const comp = prefs.matchComp ?? "all";
  const setComp = (v) => setPrefs((p) => ({ ...p, matchComp: v }));
  const [resultsShown, setResultsShown] = useState(10);
  const data = schedule.data;
  const available = useMemo(() => {
    if (!data) return COMP_FILTERS;
    const all = [...data.fixtures, ...data.results];
    return COMP_FILTERS.filter((f) => f.id === "all" || all.some((m) => compMatch(m, f.id)));
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
        <p className="eyebrow text-accent">Match Centre</p>
          <h1 className="text-2xl text-ink sm:text-3xl">{womens ? "Arsenal Women" : "Arsenal Men"}: fixtures, results & table</h1>
        </div>
        <TeamSwitch team={team} hrefFor={(t) => (t === "women" ? "#/matches?team=women" : "#/matches")} />
      </div>
      <NextMatchHero source={schedule} onRetry={() => load(scheduleKey)} />
      {schedule.warnings?.length > 0 && <p className="text-xs text-ink-muted">{schedule.warnings.join(" · ")}</p>}

      <Chips options={available} value={comp} onChange={setComp} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionHead title="Upcoming" />
          <Panel className="overflow-hidden">
            <SourceGate source={schedule} onRetry={() => load(scheduleKey)} skeleton={<SkeletonRows rows={5} />}>
              {({ fixtures }) => <MatchList matches={fixtures.filter((m) => compMatch(m, comp))} empty="No upcoming fixtures in this competition yet." />}
            </SourceGate>
          </Panel>
        </section>
        <section>
          <SectionHead
            title="Results"
            action={data && <FormStrip results={data.results} size="h-6 w-6 text-[11px]" />}
          />
          <Panel className="overflow-hidden">
            <SourceGate source={schedule} onRetry={() => load(scheduleKey)} skeleton={<SkeletonRows rows={5} />}>
              {({ results }) => {
                const list = results.filter((m) => compMatch(m, comp));
                return (
                  <>
                    <MatchList matches={list.slice(0, resultsShown)} empty="No results in this competition yet." />
                    {list.length > resultsShown && (
                      <button onClick={() => setResultsShown((n) => n + 10)} className="w-full border-t border-line py-2.5 text-xs font-semibold text-accent hover:bg-surface-2">
                        Show more results
                      </button>
                    )}
                  </>
                );
              }}
            </SourceGate>
          </Panel>
          <p className="mt-2 text-[11px] text-ink-muted">Form shows the last five competitive matches (friendlies excluded). Tap a match for lineups, events and stats.</p>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <SectionHead title={womens ? "Women’s Super League table" : "Premier League table"} />
          <Panel className="overflow-hidden"><StandingsTable source={standings} onRetry={() => load(standingsKey)} mode="full" teamId={womens ? WOMEN_ID : TEAM_ID} /></Panel>
        </section>
        {!womens && (
          <section className="lg:col-span-2">
            <SectionHead title="Season so far" />
            <SeasonStats teamSrc={sources.team} standingsSrc={standings} scheduleSrc={schedule} />
          </section>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Match detail ───────────────────────── */

const EVENT_ICON = {
  goal: { label: "Goal", el: <Goal size={14} className="text-ink" /> },
  penalty: { label: "Penalty goal", el: <Goal size={14} className="text-ink" /> },
  "own-goal": { label: "Own goal", el: <Goal size={14} className="text-brand" /> },
  yellow: { label: "Yellow card", el: <span className="inline-block h-3.5 w-2.5 rounded-[2px] bg-yellow-400" /> },
  red: { label: "Red card", el: <span className="inline-block h-3.5 w-2.5 rounded-[2px] bg-red-600" /> },
  sub: { label: "Substitution", el: <RefreshCw size={13} className="text-emerald-600" /> },
};

function EventRow({ e, homeId }) {
  const home = e.teamId === homeId;
  const icon = EVENT_ICON[e.kind];
  const body = (
    <div className={cx("min-w-0", home ? "text-right" : "text-left")}>
      <p className="truncate text-[13px] font-semibold text-ink">
        {e.kind === "sub" ? <><span className="text-emerald-700 dark:text-emerald-400">On</span> {e.primary}</> : e.primary}
        {e.kind === "own-goal" && " (OG)"}
        {e.kind === "penalty" && " (pen)"}
      </p>
      {e.secondary && (
        <p className="truncate text-[11px] text-ink-muted">
          {e.kind === "sub" ? `Off ${e.secondary}` : `Assist: ${e.secondary}`}
        </p>
      )}
    </div>
  );
  return (
    <li className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-1.5">
      <div className="flex items-center justify-end gap-2">{home && body}</div>
      <div className="flex w-14 items-center justify-center gap-1.5" title={icon.label}>
        <span className="w-7 text-right text-[11px] font-semibold tabular-nums text-ink-muted">{e.minute}</span>
        <span role="img" aria-label={icon.label}>{icon.el}</span>
      </div>
      <div className="flex items-center gap-2">{!home && body}</div>
    </li>
  );
}

function StatBar({ s, homeId }) {
  const total = (s.home ?? 0) + (s.away ?? 0);
  const pct = total ? ((s.home ?? 0) / total) * 100 : 50;
  const arsHome = s.teamIds[0] === TEAM_ID;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[13px] tabular-nums">
        <span className="font-semibold text-ink">{s.fmt(s.home)}</span>
        <span className="text-[11px] text-ink-muted">{s.label}</span>
        <span className="font-semibold text-ink">{s.fmt(s.away)}</span>
      </div>
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
        <div className={cx("rounded-l-full", arsHome ? "bg-brand" : "bg-ink-muted/50")} style={{ width: `${pct}%` }} />
        <div className={cx("flex-1 rounded-r-full", arsHome ? "bg-ink-muted/50" : "bg-brand")} />
      </div>
    </div>
  );
}

export function MatchDetailPage({ id, schedules, stories, onRetrySchedule, ensure, predictions, squads }) {
  const [menSchedule, womenSchedule] = schedules;
  const match = useMemo(() => {
    for (const s of schedules) {
      const found = s.data && [...s.data.fixtures, ...s.data.results].find((x) => String(x.id) === String(id));
      if (found) return found;
    }
    return null;
  }, [id, menSchedule.data, womenSchedule.data]); // eslint-disable-line react-hooks/exhaustive-deps
  // Not one of the men's matches? Load the women's schedule and look there.
  useEffect(() => { if (!match && menSchedule.data) ensure?.("womenSchedule"); }, [match, menSchedule.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const womensMatch = match?.ars?.id === WOMEN_ID;
  useEffect(() => { if (womensMatch) ensure?.("womenRoster"); }, [womensMatch]); // eslint-disable-line react-hooks/exhaustive-deps
  const schedule = menSchedule;
  const [detail, setDetail] = useState({ status: "idle" });

  useEffect(() => {
    if (!match) return;
    let cancelled = false;
    const run = () => {
      setDetail((d) => ({ ...d, status: d.data ? "refreshing" : "loading" }));
      fetchMatchSummary(match)
        .then((data) => !cancelled && setDetail({ status: "ok", data, at: new Date() }))
        .catch((err) => !cancelled && setDetail((d) => ({ ...d, status: "error", error: err.message })));
    };
    run();
    // Re-check while the match is being played.
    const id2 = match.state === "in" ? setInterval(run, 60e3) : null;
    return () => {
      cancelled = true;
      if (id2) clearInterval(id2);
    };
  }, [match?.id, match?.state]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!match) {
    const womenPending = !womenSchedule.data && womenSchedule.status !== "error";
    if ((!menSchedule.data && menSchedule.status !== "error") || (menSchedule.data && womenPending)) return <SkeletonRows rows={6} />;
    return (
      <div className="space-y-3">
        <a href="#/matches" className="inline-flex items-center gap-1 text-sm font-semibold text-accent"><ArrowLeft size={14} /> Match Centre</a>
        {menSchedule.status === "error" && !menSchedule.data
          ? <ErrorState title="Couldn’t load fixtures" message={menSchedule.error} onRetry={onRetrySchedule} />
          : <ErrorState title="Match not found" message="This match isn’t in Arsenal’s current ESPN schedule." onRetry={onRetrySchedule} />}
      </div>
    );
  }

  const d = detail.data;
  const done = match.state === "post";
  const goals = d?.events.filter((e) => ["goal", "penalty", "own-goal"].includes(e.kind)) ?? [];
  const homeId = match.home?.id;
  const opp = match.opp?.name?.toLowerCase() ?? "";
  const related = (stories ?? []).filter((s) => {
    const t = s.articles.map((a) => a.title.toLowerCase()).join(" ");
    const near = s.date && Math.abs(s.date - match.date) < 4 * 86400e3;
    return near && opp && t.includes(opp.split(" ")[0]);
  }).slice(0, 4);

  return (
    <div className="space-y-5">
      <a href="#/matches" className="inline-flex items-center gap-1 text-sm font-semibold text-accent"><ArrowLeft size={14} /> Match Centre</a>

      <HeroShell className="p-5 sm:p-7">
        <h1 className="sr-only">{match.home.name} v {match.away.name}, {match.competition}</h1>
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-widest">
          <span className="rounded-full bg-white/10 px-2.5 py-1">{match.competition}</span>
          <span className="rounded-full bg-white/10 px-2.5 py-1">{done ? "Full time" : match.state === "in" ? `In play · ${match.clock}` : "Upcoming"}</span>
        </div>
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <HeroSide side={match.home} />
          <div className="shrink-0 px-2 text-center">
            {match.state === "pre" ? (
              <>
                <p className="font-display text-2xl font-bold">{fmtTime(match.date)}</p>
                <p className="text-[11px] text-white/60">{tzShort(match.date)}</p>
              </>
            ) : (
              <p className="font-display text-4xl font-bold tabular-nums sm:text-5xl">{match.home.score ?? 0}–{match.away.score ?? 0}</p>
            )}
            {match.home.shootout != null && <p className="text-[11px] text-white/70">Pens {match.home.shootout}–{match.away.shootout}</p>}
          </div>
          <HeroSide side={match.away} />
        </div>
        {goals.length > 0 && (
          <div className="mx-auto mt-4 grid max-w-lg grid-cols-2 gap-4 text-[12px] text-white/80">
            <ul className="space-y-0.5 text-right">{goals.filter((g) => g.teamId === homeId).map((g) => <li key={g.id}>{g.primary}{g.kind === "penalty" ? " (pen)" : g.kind === "own-goal" ? " (OG)" : ""} {g.minute}</li>)}</ul>
            <ul className="space-y-0.5">{goals.filter((g) => g.teamId !== homeId).map((g) => <li key={g.id}>{g.minute} {g.primary}{g.kind === "penalty" ? " (pen)" : g.kind === "own-goal" ? " (OG)" : ""}</li>)}</ul>
          </div>
        )}
        <div className="mt-4 flex flex-col items-center gap-2 text-[13px] text-white/70">
          {match.state === "pre" && <Countdown date={match.date} />}
          <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} /> {fmtLongDay(match.date)}, {fmtTime(match.date)} {tzShort(match.date)}</span>
          {(d?.venue || match.venue) && <span className="inline-flex items-center gap-1.5"><MapPin size={13} /> {d?.venue || match.venue}</span>}
          {(d?.referee || d?.attendance) && (
            <span className="text-[11px] text-white/50">{[d?.referee && `Referee: ${d.referee}`, d?.attendance && `Attendance: ${d.attendance.toLocaleString()}`].filter(Boolean).join(" · ")}</span>
          )}
          {match.state === "in" && detail.at && <span className="text-[11px] text-white/50">Re-checked every minute · last update {fmtTime(detail.at)}. Not a live stream.</span>}
        </div>
      </HeroShell>

      {detail.status === "loading" && !d && <SkeletonRows rows={6} avatar={false} />}
      {detail.status === "error" && !d && <ErrorState message={detail.error} title="Couldn’t load match details" />}

      {d && match.state !== "pre" && <MatchReport match={match} detail={{ ...d, fetchedAt: detail.at }} related={related} />}
      {match.state !== "post" || predictions?.preds?.[match.id] ? (
        <PredictionBox match={match} predictions={predictions} squad={(womensMatch ? squads?.women : squads?.men) ?? []} events={d?.events} />
      ) : null}

      {d && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section>
            <SectionHead title="Key events" />
            <Panel className="px-3 py-2">
              {d.events.length ? (
                <ul>{d.events.map((e) => <EventRow key={e.id} e={e} homeId={homeId} />)}</ul>
              ) : (
                <EmptyState>{match.state === "pre" ? "Events appear once the match kicks off." : "ESPN hasn’t published match events for this game."}</EmptyState>
              )}
            </Panel>
          </section>
          <section>
            <SectionHead title="Match stats" action={match.state !== "pre" && <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", match.state === "in" ? "bg-brand text-white" : "bg-surface-2 text-ink-muted")}>{match.state === "in" ? "In progress · re-checked each minute" : "Final"}</span>} />
            <Panel className="space-y-3 p-4">
              {d.stats.length ? (
                <>
                  <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                    <span>{match.home.short}</span><span>{match.away.short}</span>
                  </div>
                  {d.stats.map((s) => <StatBar key={s.key} s={s} homeId={homeId} />)}
                  <p className="pt-1 text-[11px] text-ink-muted">Expected goals (xG): not provided by ESPN’s free data, so it isn’t shown.</p>
                </>
              ) : (
                <EmptyState>{match.state === "pre" ? "Stats appear once the match kicks off." : "No team stats published for this match."}</EmptyState>
              )}
            </Panel>
          </section>
          <section className="lg:col-span-2">
            <SectionHead title="Lineups" />
            <Panel className="p-4">
              {d.lineups.length ? (
                <LineupPanel match={match} lineups={d.lineups} events={d.events} state={match.state} />
              ) : (
                <EmptyState>{match.state === "pre" ? "Lineups are usually published about an hour before kick-off." : "Lineups weren’t published for this match."}</EmptyState>
              )}
            </Panel>
          </section>
        </div>
      )}

      {match.state === "pre" && related.length > 0 && (
        <section>
          <SectionHead title="Related coverage" />
          <Panel className="divide-y divide-line px-4">
            {related.map((s) => (
              <a key={s.id} href={s.lead.link} target="_blank" rel="noopener noreferrer" className="group block py-3">
                <p className="text-sm font-semibold text-ink group-hover:text-accent">{s.lead.title}</p>
                <p className="text-[11px] text-ink-muted">{s.lead.source} · {timeAgo(s.date)}{s.outlets.length > 1 ? ` · ${s.outlets.length} outlets` : ""}</p>
              </a>
            ))}
          </Panel>
        </section>
      )}
      <p className="text-[11px] text-ink-muted">Match data from ESPN. Updated {detail.at ? fmtFull(detail.at) : "—"}.</p>
    </div>
  );
}

export { pickNext, HeroShell };
