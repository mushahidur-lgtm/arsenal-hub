import React, { useState } from "react";
import { Activity, Goal, Hand, HeartPulse, Target } from "lucide-react";
import { Chips, EmptyState, Panel, SectionHead, Skel, SkeletonRows, SourceGate, cx } from "./ui.jsx";
import { StoryRow } from "./news.jsx";

export const AVAIL_STYLE = {
  available: { dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" },
  doubtful: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300" },
  injured: { dot: "bg-brand", chip: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300" },
};

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

function PlayerCard({ p }) {
  const a = AVAIL_STYLE[p.availability.key];
  const st = p.stats;
  const line = p.group === "Goalkeepers"
    ? [["Apps", st.appearances], ["Saves", st.saves], ["GA", st.goalsConceded]]
    : [["Apps", st.appearances], ["G", st.totalGoals], ["A", st.goalAssists]];
  return (
    <a href={p.link} target="_blank" rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-3 transition hover:border-ink-muted/40">
      <PlayerAvatar p={p} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">
          <span className="mr-1 tabular-nums text-accent">{p.jersey}</span>{p.name}
        </p>
        <p className="flex items-center gap-1.5 truncate text-xs text-ink-muted">
          {p.flag && <img src={p.flag} alt="" className="h-3 w-4 rounded-sm object-cover" loading="lazy" />}
          {p.position}{p.age ? ` · ${p.age}` : ""}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {p.availability.key !== "available" && (
            <span className={cx("inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[10px] font-semibold", a.chip)} title={p.availability.detail}>
              <span className={cx("h-1.5 w-1.5 shrink-0 rounded-full", a.dot)} />
              {p.availability.label}{p.availability.detail ? ` · ${p.availability.detail}` : ""}
            </span>
          )}
          <span className="text-[10px] tabular-nums text-ink-muted">{line.map(([k, v]) => `${k} ${v ?? 0}`).join(" · ")}</span>
        </div>
      </div>
    </a>
  );
}

const GROUPS = ["Goalkeepers", "Defenders", "Midfielders", "Forwards"];

/** Compact injury & availability list (homepage + squad page). */
export function AvailabilityList({ source, limit }) {
  return (
    <SourceGate source={source} skeleton={<SkeletonRows rows={3} />}>
      {({ players }) => {
        const out = players.filter((p) => p.availability.key !== "available");
        if (!out.length) return <EmptyState>ESPN lists no injured or doubtful players.</EmptyState>;
        return (
          <ul className="divide-y divide-line">
            {out.slice(0, limit).map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                <PlayerAvatar p={p} className="h-8 w-8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{p.name}</p>
                  <p className="truncate text-[11px] text-ink-muted">{p.availability.detail || p.position}</p>
                </div>
                <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", AVAIL_STYLE[p.availability.key].chip)}>
                  {p.availability.label}
                </span>
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

export function SquadPage({ source, onRetry, injuryStories, bookmarks, now, prefs, setPrefs }) {
  const pos = prefs.squadPos ?? "All";
  const avail = prefs.squadAvail ?? "all";
  const set = (k) => (v) => setPrefs((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-accent">Squad</p>
        <h1 className="text-2xl text-ink sm:text-3xl">First-team squad & availability</h1>
        <p className="mt-1 text-sm text-ink-muted">Availability from ESPN injury reports. Stats are Premier League season totals.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <SourceGate source={source} onRetry={onRetry}
            skeleton={<div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 8 }).map((_, i) => <Skel key={i} className="h-[74px] rounded-xl" />)}</div>}>
            {({ players }) => {
              const counts = players.reduce((acc, p) => ({ ...acc, [p.availability.key]: (acc[p.availability.key] ?? 0) + 1 }), {});
              const filtered = players.filter((p) => (pos === "All" || p.group === pos) && (avail === "all" || p.availability.key === avail));
              const groups = GROUPS.filter((g) => pos === "All" || g === pos);
              return (
                <>
                  <Chips value={pos} onChange={set("squadPos")}
                    options={["All", ...GROUPS].map((g) => ({ id: g, label: g, count: g === "All" ? players.length : players.filter((p) => p.group === g).length }))} />
                  <Chips value={avail} onChange={set("squadAvail")}
                    options={[["all", "Any status"], ["available", "Available"], ["doubtful", "Doubtful"], ["injured", "Out"]].map(([id, label]) => ({ id, label, count: id === "all" ? undefined : counts[id] ?? 0 }))} />
                  {groups.map((g) => {
                    const list = filtered.filter((p) => p.group === g);
                    if (!list.length) return null;
                    return (
                      <div key={g}>
                        <h3 className="eyebrow mb-2 text-ink-muted">{g}</h3>
                        <div className="grid gap-2.5 sm:grid-cols-2">{list.map((p) => <PlayerCard key={p.id} p={p} />)}</div>
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
            <Panel className="overflow-hidden"><AvailabilityList source={source} /></Panel>
          </section>
          <section>
            <SectionHead title="Injury news" href="#/news?cat=injury" />
            <Panel className="divide-y divide-line px-3">
              {injuryStories.length ? injuryStories.slice(0, 4).map((s) => <StoryRow key={s.id} story={s} bookmarks={bookmarks} now={now} dense showImage={false} />)
                : <EmptyState>No recent injury reports in the feeds.</EmptyState>}
            </Panel>
          </section>
          <section>
            <SectionHead title="Top performers" />
            <Panel className="overflow-hidden"><TopPerformers source={source} onRetry={onRetry} /></Panel>
          </section>
        </aside>
      </div>
    </div>
  );
}
