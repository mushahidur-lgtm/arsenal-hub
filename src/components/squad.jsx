import React, { useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, Goal, Hand, HeartPulse, Star, Target } from "lucide-react";
import { TEAM_ID, WOMEN_ID } from "../lib/data.js";
import { AVAILABILITY, isReportedAbsent, summarizeAvailability } from "../lib/availability.js";
import { loadPlayerBio, loadPlayerPhoto, loadPlayerStats, seasonLine, seasonsOf } from "../lib/playerstats.js";
import { storyMentions } from "../lib/news.js";
import { fmtDate, fmtDay, fmtFull, timeAgo } from "../lib/format.js";
import { Chips, EmptyState, ErrorState, Panel, SectionHead, Select, Skel, SkeletonRows, SourceGate, cx, useNow } from "./ui.jsx";
import { StoryRow } from "./news.jsx";

export const AVAIL_STYLE = {
  clear: { dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" },
  doubtful: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300" },
  injured: { dot: "bg-brand", chip: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300" },
  suspended: { dot: "bg-purple-500", chip: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300" },
  unknown: { dot: "bg-zinc-400", chip: "bg-surface-2 text-ink-muted" },
};
const AVAIL_LABEL = Object.fromEntries(Object.entries(AVAILABILITY).map(([k, v]) => [k, v.label]));

export const teamIdOf = (team) => (team === "women" ? WOMEN_ID : TEAM_ID);

export function PlayerAvatar({ p, className = "h-12 w-12" }) {
  const [broken, setBroken] = useState(false);
  const initials = (p.name ?? "?").split(" ").map((x) => x[0]).slice(0, 2).join("");
  return (
    <div className={cx("relative shrink-0 overflow-hidden rounded-full bg-surface-2", className)}>
      {/* Initials render underneath; the photo covers them only once it loads. */}
      <span className="absolute inset-0 grid place-items-center text-xs font-bold text-ink-muted">{initials}</span>
      {p.photo && !broken && (
        <img src={p.photo} alt={p.name} loading="lazy" decoding="async" onError={() => setBroken(true)}
          className="relative h-full w-full object-cover object-top opacity-0 transition-opacity"
          onLoad={(e) => e.currentTarget.classList.replace("opacity-0", "opacity-100")} />
      )}
    </div>
  );
}

export function SaveStar({ player, team = "men", saved, className }) {
  if (!saved) return null;
  const on = saved.has(player.id);
  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); saved.toggle({ id: player.id, name: player.name, team }); }}
      aria-pressed={on}
      aria-label={on ? `Stop following ${player.name}` : `Follow ${player.name}`}
      title={on ? "Following" : "Follow player"}
      className={cx("hit grid h-8 w-8 shrink-0 place-items-center rounded-full transition hover:bg-surface-2", on ? "text-amber-500" : "text-ink-muted", className)}
    >
      <Star size={16} fill={on ? "currentColor" : "none"} />
    </button>
  );
}

/* ───────────────────────── Squad overview ───────────────────────── */

function PlayerCard({ p, team, saved }) {
  const a = AVAIL_STYLE[p.availability.key] ?? AVAIL_STYLE.unknown;
  const q = team === "women" ? "?team=women" : "";
  return (
    <a href={`#/squad/player/${p.id}${q}`} className="group relative flex items-center gap-3 rounded-xl border border-line bg-surface p-3 transition hover:border-ink-muted/40">
      <PlayerAvatar p={p} className="h-14 w-14" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink group-hover:text-accent">
          {p.jersey && <span className="mr-1.5 tabular-nums text-accent">{p.jersey}</span>}{p.name}
        </p>
        <p className="flex items-center gap-1.5 truncate text-xs text-ink-muted">
          {p.flag && <img src={p.flag} alt="" className="h-3 w-4 rounded-sm object-cover" loading="lazy" />}
          {[p.position, p.nationality, p.age ? `${p.age} yrs` : null].filter(Boolean).join(" · ")}
        </p>
        {p.availability.key !== "clear" && (
          <span className={cx("mt-1.5 inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[10px] font-semibold", a.chip)}>
            <span className={cx("h-1.5 w-1.5 shrink-0 rounded-full", a.dot)} />
            {p.availability.label}{p.availability.detail ? ` · ${p.availability.detail}` : ""}
          </span>
        )}
      </div>
      <SaveStar player={p} team={team} saved={saved} />
    </a>
  );
}

const GROUPS = ["Goalkeepers", "Defenders", "Midfielders", "Forwards", "Other"]; // "Other": ESPN gave no position

/** Counts per availability state, with where the data comes from and when it was fetched. */
export function AvailabilityOverview({ source, team }) {
  const now = useNow();
  if (!source.data) return null;
  const players = source.data.players;
  const counts = players.reduce((acc, p) => ({ ...acc, [p.availability.key]: (acc[p.availability.key] ?? 0) + 1 }), {});
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {["clear", "injured", "suspended", "doubtful", "unknown"].map((k) => (
          <div key={k} className="rounded-xl border border-line bg-surface p-3">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              <span className={cx("h-1.5 w-1.5 rounded-full", AVAIL_STYLE[k].dot)} /> {AVAIL_LABEL[k]}
            </p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">{counts[k] ?? 0}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
        Source: ESPN injury reports for the {team === "women" ? "Women’s" : "Men’s"} squad, fetched {source.savedAt ? timeAgo(source.savedAt, now) : "recently"}.
        “No injury reported” means ESPN’s list has no entry for the player, not that the club has confirmed fitness. “Unknown” means ESPN gave no usable injury data. Reports can lag club announcements, and no return dates are shown because none are reliably published.
      </p>
    </div>
  );
}

/** Compact injury & availability list (homepage + squad page). */
export function AvailabilityList({ source, limit, team, onRetry }) {
  const q = team === "women" ? "?team=women" : "";
  return (
    <SourceGate source={source} onRetry={onRetry} skeleton={<SkeletonRows rows={3} />}>
      {({ players }) => {
        const out = players.filter(isReportedAbsent);
        const unknown = summarizeAvailability(players).counts.unknown;
        if (!out.length) return <EmptyState>ESPN’s roster feed lists no injured, suspended or doubtful players{unknown ? `, and gives no injury data for ${unknown} player${unknown > 1 ? "s" : ""}` : ""}. It can lag club announcements.</EmptyState>;
        return (
          <ul className="divide-y divide-line">
            {out.slice(0, limit).map((p) => (
              <li key={p.id}>
                <a href={`#/squad/player/${p.id}${q}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2">
                  <PlayerAvatar p={p} className="h-8 w-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">{p.name}</p>
                    <p className="truncate text-[11px] text-ink-muted">
                      {[p.availability.detail || p.position, p.availability.updated ? `reported ${fmtDay(p.availability.updated)}` : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", (AVAIL_STYLE[p.availability.key] ?? AVAIL_STYLE.unknown).chip)}>
                    {p.availability.label}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        );
      }}
    </SourceGate>
  );
}

const LEADER_DEFS = [
  { key: "totalGoals", label: "Top scorer", icon: Goal, unit: "goals" },
  { key: "goalAssists", label: "Most assists", icon: HeartPulse, unit: "assists" },
  { key: "shotsOnTarget", label: "Shots on target", icon: Target, unit: "on target" },
  { key: "appearances", label: "Most appearances", icon: Activity, unit: "apps" },
  { key: "saves", label: "Most saves", icon: Hand, unit: "saves", gk: true },
];

export function TopPerformers({ source, onRetry }) {
  return (
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
              <li key={def.key} className="flex items-center gap-3 px-3 py-2.5">
                <PlayerAvatar p={top} className="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted"><def.icon size={11} /> {def.label}</p>
                  <p className="truncate text-sm font-semibold text-ink">{top.name}</p>
                  {runners.length > 0 && <p className="truncate text-[11px] text-ink-muted">Next: {runners.map((r) => `${r.lastName} ${r.stats[def.key]}`).join(" · ")}</p>}
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-bold tabular-nums text-accent">{top.stats[def.key]}</p>
                  <p className="text-[10px] uppercase text-ink-muted">{def.unit}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SourceGate>
  );
}

export function TeamSwitch({ team, hrefFor }) {
  return (
    <div className="inline-flex rounded-full border border-line bg-surface p-0.5 text-xs font-semibold" role="tablist" aria-label="Team">
      {[["men", "Men’s"], ["women", "Women’s"]].map(([id, label]) => (
        <a key={id} href={hrefFor(id)} role="tab" aria-selected={team === id}
          className={cx("hit rounded-full px-3.5 py-1.5 transition", team === id ? "bg-brand text-white" : "text-ink-muted hover:text-ink")}>
          {label}
        </a>
      ))}
    </div>
  );
}

export function SquadPage({ team, source, onRetry, injuryStories, bookmarks, now, prefs, setPrefs, saved }) {
  const pos = prefs.squadPos ?? "All";
  const avail = prefs.squadAvail === "available" ? "clear" : prefs.squadAvail ?? "all"; // "available" was the pre-rename id saved in some browsers
  const set = (k) => (v) => setPrefs((p) => ({ ...p, [k]: v }));
  const womens = team === "women";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-accent">Squad</p>
          <h1 className="text-2xl text-ink sm:text-3xl">{womens ? "Arsenal Women" : "Arsenal Men"} first team</h1>
          <p className="mt-1 text-sm text-ink-muted">Players, availability and season totals from ESPN. Tap a player for the full profile.</p>
        </div>
        <TeamSwitch team={team} hrefFor={(t) => (t === "women" ? "#/squad?team=women" : "#/squad")} />
      </div>

      <AvailabilityOverview source={source} team={team} />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <SourceGate source={source} onRetry={onRetry}
            skeleton={<div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 8 }).map((_, i) => <Skel key={i} className="h-[84px] rounded-xl" />)}</div>}>
            {({ players }) => {
              const counts = players.reduce((acc, p) => ({ ...acc, [p.availability.key]: (acc[p.availability.key] ?? 0) + 1 }), {});
              const filtered = players.filter((p) => (pos === "All" || p.group === pos) && (avail === "all" || p.availability.key === avail));
              const groups = GROUPS.filter((g) => pos === "All" || g === pos);
              return (
                <>
                  <Chips value={pos} onChange={set("squadPos")}
                    options={["All", ...GROUPS].filter((g) => g !== "Other" || players.some((p) => p.group === "Other")).map((g) => ({ id: g, label: g, count: g === "All" ? players.length : players.filter((p) => p.group === g).length }))} />
                  <Chips value={avail} onChange={set("squadAvail")}
                    options={[["all", "Any status"], ["clear", "None reported"], ["doubtful", "Doubtful"], ["injured", "Out"], ["suspended", "Suspended"], ["unknown", "Unknown"]]
                      .filter(([id]) => id === "all" || id === "clear" || counts[id])
                      .map(([id, label]) => ({ id, label, count: id === "all" ? undefined : counts[id] ?? 0 }))} />
                  {groups.map((g) => {
                    const list = filtered.filter((p) => p.group === g);
                    if (!list.length) return null;
                    return (
                      <div key={g}>
                        <h2 className="eyebrow mb-2 text-ink-muted">{g}</h2>
                        <div className="grid gap-2.5 sm:grid-cols-2">{list.map((p) => <PlayerCard key={p.id} p={p} team={team} saved={saved} />)}</div>
                      </div>
                    );
                  })}
                  {!filtered.length && <EmptyState>No players match these filters.</EmptyState>}
                </>
              );
            }}
          </SourceGate>
        </section>
        <aside className="space-y-6">
          <section>
            <SectionHead title="Injuries & doubts" />
            <Panel className="overflow-hidden"><AvailabilityList source={source} team={team} /></Panel>
          </section>
          {!womens && (
            <section>
              <SectionHead title="Injury news" href="#/news?cat=injury" />
              <Panel className="divide-y divide-line px-3">
                {injuryStories.length ? injuryStories.slice(0, 4).map((s) => <StoryRow key={s.id} story={s} bookmarks={bookmarks} now={now} dense showImage={false} />)
                  : <EmptyState>No recent injury reports in the feeds.</EmptyState>}
              </Panel>
            </section>
          )}
          <section>
            <SectionHead title="Top performers" />
            <Panel className="overflow-hidden"><TopPerformers source={source} onRetry={onRetry} /></Panel>
          </section>
        </aside>
      </div>
    </div>
  );
}

/* ───────────────────────── Player profile ───────────────────────── */

/** Metrics worth showing first, in this order; anything else ESPN supplies follows alphabetically. */
const METRIC_ORDER = ["STRT", "G", "A", "SHOT", "SOG", "YC", "RC", "FC", "FA", "OFF"];
const metricRank = (k) => (METRIC_ORDER.includes(k) ? METRIC_ORDER.indexOf(k) : 99);

/** ESPN's glossary uses "Total Goals", "Shots On Goal"; show plainer labels for the common ones. */
const PLAIN = { G: "Goals", A: "Assists", STRT: "Starts", SHOT: "Shots", SOG: "Shots on target", YC: "Yellow cards", RC: "Red cards", FC: "Fouls committed", FA: "Fouls suffered", OFF: "Offsides" };
export const metricName = (k, labels) => PLAIN[k] ?? labels?.[k]?.name ?? k;
export const metricKeys = (keys) => [...keys].sort((a, b) => metricRank(a) - metricRank(b) || a.localeCompare(b));

/** Loads (and refreshes on id change) a player's season stats. */
export function usePlayerStats(id, team) {
  const [state, setState] = useState({ status: "loading" });
  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    setState({ status: "loading" });
    loadPlayerStats(id, teamIdOf(team))
      .then((data) => !cancelled && setState({ status: "ok", data }))
      .catch((e) => !cancelled && setState({ status: "error", error: e.message }));
    return () => { cancelled = true; };
  }, [id, team]);
  return state;
}

const FACTS = (p) => [
  ["Position", p.position],
  ["Shirt number", p.jersey ? `#${p.jersey}` : null],
  ["Nationality", p.nationality],
  ["Age", p.age ? `${p.age}${p.dob ? ` (born ${fmtDate(p.dob, { day: "numeric", month: "long", year: "numeric" })})` : ""}` : null],
  ["Born in", p.birthPlace],
  ["Height", p.height],
  ["Weight", p.weight],
].filter(([, v]) => v);

export function PlayerProfilePage({ id, team, roster, stories, bookmarks, saved, onRetryRoster }) {
  const now = useNow();
  const stats = usePlayerStats(id, team);
  const [bio, setBio] = useState([]);
  const [comp, setComp] = useState("all");
  const [season, setSeason] = useState(null);
  useEffect(() => { loadPlayerBio(id).then(setBio); }, [id]);
  const [photo, setPhoto] = useState(null);
  const playerName = roster.data?.players.find((p) => String(p.id) === String(id));
  useEffect(() => {
    setPhoto(null);
    if (!playerName || playerName.photo) return undefined;
    let cancelled = false;
    loadPlayerPhoto(playerName.name, playerName.dob).then((p) => !cancelled && setPhoto(p));
    return () => { cancelled = true; };
  }, [playerName?.id, playerName?.photo]); // eslint-disable-line react-hooks/exhaustive-deps

  const player = roster.data?.players.find((p) => String(p.id) === String(id));
  const seasons = useMemo(() => seasonsOf(stats.data, comp), [stats.data, comp]);
  useEffect(() => { if (seasons.length && !seasons.includes(season)) setSeason(seasons[0]); }, [seasons]); // eslint-disable-line react-hooks/exhaustive-deps

  const back = <a href={team === "women" ? "#/squad?team=women" : "#/squad"} className="inline-flex items-center gap-1 text-sm font-semibold text-accent"><ArrowLeft size={14} /> Squad</a>;
  if (!player) {
    if (!roster.data && roster.status !== "error") return <div className="space-y-4">{back}<SkeletonRows rows={5} /></div>;
    if (!roster.data) return <div className="space-y-3">{back}<ErrorState title="Couldn’t load the squad" message={roster.error} onRetry={onRetryRoster} /></div>;
    return <div className="space-y-3">{back}<ErrorState title="Player not found" message="This player isn’t in the current squad list from ESPN." onRetry={onRetryRoster} /></div>;
  }

  const a = player.availability;
  const line = stats.data ? seasonLine(stats.data, season, comp) : null;
  const currentLabel = (player.season ?? "").match(/^\d{4}(-\d{2,4})?/)?.[0];
  // Appearances come from the squad feed (Premier League / league season only).
  // Only shown for the league alone, so it never sits beside totals summed across cups.
  const apps = season === currentLabel && comp !== "all" && comp === stats.data?.competitions?.[0]?.slug ? player.stats.appearances : null;
  const news = (stories ?? []).filter((s) => s.scope === "arsenal" && storyMentions(s, player.id)).sort((x, y) => (y.date ?? 0) - (x.date ?? 0)).slice(0, 5);
  const keys = line ? metricKeys(Object.keys(line)) : [];
  const compOptions = [{ id: "all", label: "All competitions" }, ...(stats.data?.competitions ?? []).map((c) => ({ id: c.slug, label: c.name }))];
  const compLabel = compOptions.find((c) => c.id === comp)?.label ?? "";

  return (
    <div className="space-y-6">
      {back}
      <div className="flex flex-wrap items-center gap-4">
        <div className="shrink-0">
          <PlayerAvatar p={photo ? { ...player, photo: photo.src } : player} className="h-24 w-24 sm:h-28 sm:w-28" />
          {photo?.page && <a href={photo.page} target="_blank" rel="noopener noreferrer" className="mt-1 block text-center text-[9px] text-ink-muted hover:underline">Photo: Wikipedia</a>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-accent">{team === "women" ? "Arsenal Women" : "Arsenal"} · {player.position}</p>
          <h1 className="text-2xl text-ink sm:text-3xl">{player.jersey && <span className="mr-2 text-accent">{player.jersey}</span>}{player.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-muted">
            {player.flag && <img src={player.flag} alt="" className="h-3.5 w-5 rounded-sm object-cover" />}
            {[player.nationality, player.age ? `${player.age} years old` : null].filter(Boolean).join(" · ")}
          </p>
        </div>
        <SaveStar player={player} team={team} saved={saved} className="h-10 w-10" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div>
            <SectionHead title="Season statistics" />
            <div className="mb-3 flex flex-wrap gap-2">
              <Select ariaLabel="Competition" value={comp} onChange={(v) => setComp(v)} options={compOptions} />
              {seasons.length > 0 && <Select ariaLabel="Season" value={season ?? ""} onChange={setSeason} options={seasons.map((s) => ({ id: s, label: s }))} />}
            </div>
            <Panel className="p-4">
              {stats.status === "loading" ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skel key={i} className="h-16 rounded-xl" />)}</div>
              ) : stats.status === "error" ? (
                <ErrorState compact message={stats.error} title="Couldn’t load statistics" />
              ) : line ? (
                <>
                  <p className="mb-3 text-xs text-ink-muted">{season} · {compLabel}{comp === "all" ? " (totals summed across the competitions below)" : ""}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {apps != null && <Stat label="Appearances" value={apps} note="League, this season" />}
                    {keys.map((k) => <Stat key={k} label={metricName(k, stats.data.labels)} value={line[k]} />)}
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
                    Not provided by ESPN, so not shown: minutes played, xG/xA, key passes, tackles and interceptions.
                    {apps == null && " Appearances are only available for the current league season."}
                    {stats.data.fetchedAt ? ` Stats fetched ${fmtFull(stats.data.fetchedAt)}.` : ""}
                  </p>
                </>
              ) : (
                <EmptyState>No recorded numbers for this selection.</EmptyState>
              )}
            </Panel>
          </div>

          {stats.data && seasons.length > 0 && (
            <div>
              <SectionHead title={`Career by season · ${compLabel}`} />
              <Panel className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-ink-muted">
                      <th className="py-2 pl-3 text-left font-semibold">Season</th>
                      {["STRT", "G", "A", "SHOT", "SOG", "YC", "RC"].filter((k) => stats.data.labels[k]).map((k) => (
                        <th key={k} className="px-2 py-2 text-right font-semibold" title={metricName(k, stats.data.labels)}>{k === "STRT" ? "Starts" : k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {seasons.map((s) => {
                      const l = seasonLine(stats.data, s, comp) ?? {};
                      return (
                        <tr key={s} className={cx("border-t border-line", s === season && "bg-brand/[0.06]")}>
                          <td className="py-2 pl-3 font-semibold text-ink">{s}</td>
                          {["STRT", "G", "A", "SHOT", "SOG", "YC", "RC"].filter((k) => stats.data.labels[k]).map((k) => <td key={k} className="px-2 py-2 text-right tabular-nums">{l[k] ?? "–"}</td>)}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Panel>
              <p className="mt-1.5 text-[11px] text-ink-muted">G goals · A assists · SHOT shots · SOG shots on target · YC/RC yellow/red cards.</p>
            </div>
          )}

          <div>
            <SectionHead title="Latest news" href="#/news" linkLabel="All news" />
            <Panel className="divide-y divide-line px-4">
              {news.length ? news.map((s) => <StoryRow key={s.id} story={s} bookmarks={bookmarks} now={now} dense />)
                : <EmptyState>No recent stories in the feeds name {player.name}.</EmptyState>}
            </Panel>
          </div>
        </section>

        <aside className="space-y-6">
          <section>
            <SectionHead title="Status" />
            <Panel className="space-y-3 p-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Club</p>
                <p className="text-sm font-semibold text-ink">Arsenal {team === "women" ? "Women" : ""} · first-team squad</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Availability</p>
                <span className={cx("mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", (AVAIL_STYLE[a.key] ?? AVAIL_STYLE.unknown).chip)}>
                  <span className={cx("h-1.5 w-1.5 rounded-full", (AVAIL_STYLE[a.key] ?? AVAIL_STYLE.unknown).dot)} />
                  {a.label}{a.detail ? ` · ${a.detail}` : ""}
                </span>
                <p className="mt-1.5 text-[11px] text-ink-muted">
                  {a.source ?? "ESPN"}{a.updated ? ` · reported ${fmtDay(a.updated)}` : ""}
                  {roster.savedAt ? ` · fetched ${timeAgo(roster.savedAt, now)}` : ""}. No return date is shown because ESPN doesn’t publish a reliable one.
                </p>
              </div>
            </Panel>
          </section>
          <section>
            <SectionHead title="Profile" />
            <Panel className="p-4">
              <dl className="space-y-2.5">
                {FACTS(player).map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <dt className="text-ink-muted">{k}</dt>
                    <dd className="text-right font-semibold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              {bio.length > 0 && (
                <div className="mt-3 border-t border-line pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">National team</p>
                  {bio.slice(0, 3).map((b) => <p key={b.name} className="mt-1 text-[13px] text-ink">{b.name} <span className="text-ink-muted">· {b.seasons}</span></p>)}
                </div>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">A written biography isn’t available from ESPN’s free data, so only verified facts are shown.</p>
            </Panel>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, note }) {
  return (
    <div className="rounded-xl bg-surface-2/60 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-xl font-bold tabular-nums text-ink">{value}</p>
      {note && <p className="text-[10px] text-ink-muted">{note}</p>}
    </div>
  );
}
