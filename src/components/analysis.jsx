import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { seasonLine, seasonsOf } from "../lib/playerstats.js";
import { Chips, EmptyState, ErrorState, Panel, SectionHead, Select, Skel, cx } from "./ui.jsx";
import { PlayerAvatar, TeamSwitch, metricKeys, metricName, usePlayerStats } from "./squad.jsx";

const POS_FILTERS = [
  { id: "all", label: "All" },
  { id: "Goalkeepers", label: "GK" },
  { id: "Defenders", label: "DEF" },
  { id: "Midfielders", label: "MID" },
  { id: "Forwards", label: "FWD" },
];

/** Searchable player picker with a position filter. Works as an inline panel so it's usable on a phone. */
function PlayerPicker({ label, players, value, onChange, exclude, tone }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pos, setPos] = useState("all");
  const ref = useRef(null);
  const selected = players.find((p) => String(p.id) === String(value));
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const list = players
    .filter((p) => String(p.id) !== String(exclude))
    .filter((p) => pos === "all" || p.group === pos)
    .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div ref={ref} className="relative">
      <p className={cx("mb-1 text-[10px] font-semibold uppercase tracking-wide", tone)}>{label}</p>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-2.5 text-left hover:border-ink-muted/40">
        {selected ? <PlayerAvatar p={selected} className="h-11 w-11" /> : <span className="h-11 w-11 rounded-full bg-surface-2" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{selected?.name ?? "Choose a player"}</span>
          <span className="block truncate text-[11px] text-ink-muted">{selected ? `${selected.position}${selected.jersey ? ` · #${selected.jersey}` : ""}` : "Search the squad"}</span>
        </span>
        <ChevronDown size={16} className={cx("text-ink-muted transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute inset-x-0 z-20 mt-1 max-h-[26rem] overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
          <div className="space-y-2 border-b border-line p-2.5">
            <label className="relative block">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players" aria-label={`Search ${label}`}
                className="w-full rounded-full border border-line bg-surface py-1.5 pl-8 pr-3 text-sm text-ink focus:outline-none" />
            </label>
            <div className="no-scrollbar flex gap-1 overflow-x-auto">
              {POS_FILTERS.map((f) => (
                <button key={f.id} onClick={() => setPos(f.id)}
                  className={cx("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", pos === f.id ? "bg-brand text-white" : "bg-surface-2 text-ink-muted")}>{f.label}</button>
              ))}
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {list.map((p) => (
              <li key={p.id}>
                <button onClick={() => { onChange(String(p.id)); setOpen(false); setQ(""); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-2">
                  <PlayerAvatar p={p} className="h-8 w-8" />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{p.name}</span>
                  <span className="text-[11px] text-ink-muted">{p.position}</span>
                </button>
              </li>
            ))}
            {!list.length && <li className="px-3 py-4 text-center text-sm text-ink-muted">No players match.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Derived metrics with one clear definition each; only built when both inputs exist. */
const DERIVED = [
  { key: "G/STRT", name: "Goals per start", from: ["G", "STRT"], note: "goals ÷ starts (substitute appearances excluded)" },
  { key: "A/STRT", name: "Assists per start", from: ["A", "STRT"], note: "assists ÷ starts (substitute appearances excluded)" },
  { key: "SOG/SHOT", name: "Shot accuracy", from: ["SOG", "SHOT"], note: "shots on target ÷ shots", pct: true },
];

function withDerived(line) {
  const out = { ...line };
  for (const d of DERIVED) {
    const [n, m] = d.from;
    if (line[m] > 0 && line[n] != null) out[d.key] = d.pct ? Math.round((line[n] / line[m]) * 100) : Math.round((line[n] / line[m]) * 100) / 100;
  }
  return out;
}

const COLORS = { a: "var(--ars-red)", b: "var(--ars-navy)" };

/** Radar of up to 6 shared metrics, each axis scaled to the larger of the two players. */
function Radar({ axes, a, b, nameA, nameB }) {
  const size = 280, c = size / 2, r = 98;
  const pt = (i, f) => {
    const ang = (-90 + (360 / axes.length) * i) * (Math.PI / 180);
    return [c + Math.cos(ang) * r * f, c + Math.sin(ang) * r * f];
  };
  const poly = (vals) => axes.map((ax, i) => pt(i, ax.max ? vals[ax.key] / ax.max : 0).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[320px]" role="img" aria-label={`Radar comparison of ${nameA} and ${nameB}`}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={axes.map((_, i) => pt(i, f).join(",")).join(" ")} fill="none" stroke="var(--line)" strokeWidth="1" />
      ))}
      {axes.map((ax, i) => {
        const [x, y] = pt(i, 1);
        const [lx, ly] = pt(i, 1.2);
        return (
          <g key={ax.key}>
            <line x1={c} y1={c} x2={x} y2={y} stroke="var(--line)" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="9.5" fill="var(--ink-muted)" fontWeight="600">{ax.label}</text>
          </g>
        );
      })}
      <polygon points={poly(a)} fill={COLORS.a} fillOpacity="0.22" stroke={COLORS.a} strokeWidth="2" />
      <polygon points={poly(b)} fill={COLORS.b} fillOpacity="0.22" stroke={COLORS.b} strokeWidth="2" />
    </svg>
  );
}

function MetricRow({ label, a, b, pct }) {
  const total = (a ?? 0) + (b ?? 0);
  const pa = total ? (a / total) * 100 : 50;
  const lead = a === b ? null : a > b ? "a" : "b";
  const fmt = (v) => (pct ? `${v}%` : v);
  const diff = Math.round(Math.abs(a - b) * 100) / 100;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm tabular-nums">
        <span className={cx("font-display text-base font-bold", lead === "a" ? "text-accent" : "text-ink")}>{fmt(a)}</span>
        <span className="text-center text-[11px] text-ink-muted">{label}{lead && <span className="ml-1.5 font-semibold text-ink">({lead === "a" ? "◀" : "▶"} +{pct ? `${diff}pp` : diff})</span>}</span>
        <span className={cx("font-display text-base font-bold", lead === "b" ? "text-navy-ink" : "text-ink")}>{fmt(b)}</span>
      </div>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-surface-2">
        <div className="rounded-l-full" style={{ width: `${pa}%`, background: COLORS.a, opacity: lead === "b" ? 0.45 : 1 }} />
        <div className="flex-1 rounded-r-full" style={{ background: COLORS.b, opacity: lead === "a" ? 0.45 : 1 }} />
      </div>
    </div>
  );
}

export function ComparePage({ team, roster, onRetry, ids, setIds, prefs, setPrefs }) {
  const players = roster.data?.players ?? [];
  const [idA, idB] = ids;
  const sa = usePlayerStats(idA, team);
  const sb = usePlayerStats(idB, team);
  const comp = prefs.compareComp ?? "all";
  const [season, setSeason] = useState(null);

  const pa = players.find((p) => String(p.id) === String(idA));
  const pb = players.find((p) => String(p.id) === String(idB));
  const both = sa.status === "ok" && sb.status === "ok";

  const compOptions = useMemo(() => {
    const map = new Map();
    for (const s of [sa.data, sb.data]) for (const c of s?.competitions ?? []) map.set(c.slug, c.name);
    return [{ id: "all", label: "All competitions" }, ...[...map.entries()].map(([id, label]) => ({ id, label }))];
  }, [sa.data, sb.data]);
  const activeComp = compOptions.some((o) => o.id === comp) ? comp : "all";
  const seasons = useMemo(() => {
    const sA = new Set(seasonsOf(sa.data, activeComp));
    // Only seasons both players have, so the comparison is like-for-like.
    return seasonsOf(sb.data, activeComp).filter((s) => sA.has(s));
  }, [sa.data, sb.data, activeComp]);
  useEffect(() => { if (seasons.length && !seasons.includes(season)) setSeason(seasons[0]); }, [seasons]); // eslint-disable-line react-hooks/exhaustive-deps

  const labels = { ...(sa.data?.labels ?? {}), ...(sb.data?.labels ?? {}) };
  const lineA = both && season ? seasonLine(sa.data, season, activeComp) : null;
  const lineB = both && season ? seasonLine(sb.data, season, activeComp) : null;
  const dA = lineA ? withDerived(lineA) : null;
  const dB = lineB ? withDerived(lineB) : null;
  const shared = dA && dB ? metricKeys(Object.keys(dA).filter((k) => dB[k] != null && k !== "_year")) : [];
  const raw = shared.filter((k) => !DERIVED.some((d) => d.key === k));
  const derived = shared.filter((k) => DERIVED.some((d) => d.key === k));
  const radarKeys = ["G", "A", "SHOT", "SOG", "STRT", "FA", "FC"].filter((k) => raw.includes(k)).slice(0, 6);
  const axes = radarKeys.map((k) => ({ key: k, label: metricName(k, labels).replace("Shots on target", "On target").replace("Fouls ", "Fouls "), max: Math.max(dA[k], dB[k]) }));
  const samePos = pa && pb && pa.group === pb.group;
  const set = (i) => (v) => setIds(i === 0 ? [v, idB] : [idA, v]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-accent">Analysis</p>
          <h1 className="text-2xl text-ink sm:text-3xl">Player comparison</h1>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">Pick two players from the same squad and compare one season in one competition, using the same definitions for both.</p>
        </div>
        <TeamSwitch team={team} hrefFor={(t) => (t === "women" ? "#/analysis?team=women" : "#/analysis")} />
      </div>

      {roster.status === "error" && !roster.data ? (
        <ErrorState message={roster.error} onRetry={onRetry} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <PlayerPicker label="Player 1" players={players} value={idA} onChange={set(0)} exclude={idB} tone="text-accent" />
            <PlayerPicker label="Player 2" players={players} value={idB} onChange={set(1)} exclude={idA} tone="text-navy-ink" />
          </div>

          {!idA || !idB ? (
            <Panel><EmptyState>Choose two players to compare.</EmptyState></Panel>
          ) : sa.status === "loading" || sb.status === "loading" ? (
            <div className="space-y-3"><Skel className="h-12 rounded-xl" /><Skel className="h-64 rounded-xl" /></div>
          ) : sa.status === "error" || sb.status === "error" ? (
            <ErrorState message={sa.error ?? sb.error} title="Couldn’t load player statistics" />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Select ariaLabel="Competition" value={activeComp} onChange={(v) => setPrefs((p) => ({ ...p, compareComp: v }))} options={compOptions} />
                {seasons.length > 0 && <Select ariaLabel="Season" value={season ?? ""} onChange={setSeason} options={seasons.map((s) => ({ id: s, label: s }))} />}
              </div>

              {!seasons.length || !dA ? (
                <Panel><EmptyState>These two players have no season in common for this competition.</EmptyState></Panel>
              ) : (
                <div className="grid gap-6 lg:grid-cols-5">
                  <section className="lg:col-span-3">
                    <SectionHead title={`${season} · ${compOptions.find((o) => o.id === activeComp)?.label}`} />
                    <Panel className="p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2"><PlayerAvatar p={pa} className="h-9 w-9" /><span className="truncate text-sm font-semibold text-accent">{pa?.name}</span></div>
                        <div className="flex min-w-0 flex-row-reverse items-center gap-2"><PlayerAvatar p={pb} className="h-9 w-9" /><span className="truncate text-sm font-semibold text-navy-ink">{pb?.name}</span></div>
                      </div>
                      <div className="space-y-3.5">
                        {raw.map((k) => <MetricRow key={k} label={metricName(k, labels)} a={dA[k]} b={dB[k]} />)}
                        {derived.map((k) => {
                          const d = DERIVED.find((x) => x.key === k);
                          return <MetricRow key={k} label={d.name} a={dA[k]} b={dB[k]} pct={d.pct} />;
                        })}
                      </div>
                      {!shared.length && <EmptyState>No statistic is available for both players.</EmptyState>}
                      {derived.length > 0 && (
                        <p className="mt-3 text-[11px] text-ink-muted">Derived: {DERIVED.filter((d) => derived.includes(d.key)).map((d) => `${d.name} = ${d.note}`).join("; ")}.</p>
                      )}
                    </Panel>
                  </section>
                  <section className="lg:col-span-2">
                    <SectionHead title="Profile shape" />
                    <Panel className="p-4">
                      {axes.length >= 4 ? (
                        <>
                          <Radar axes={axes} a={dA} b={dB} nameA={pa?.name} nameB={pb?.name} />
                          <div className="mt-2 flex justify-center gap-4 text-[11px] font-semibold">
                            <span className="inline-flex items-center gap-1.5 text-accent"><span className="h-2 w-2 rounded-full" style={{ background: COLORS.a }} />{pa?.name}</span>
                            <span className="inline-flex items-center gap-1.5 text-navy-ink"><span className="h-2 w-2 rounded-full" style={{ background: COLORS.b }} />{pb?.name}</span>
                          </div>
                          <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">Each axis is scaled to the higher of the two players, so it shows who leads on what, not an overall rating.{!samePos && " The players play different positions, so raw counts aren’t like-for-like."}</p>
                        </>
                      ) : (
                        <EmptyState>Not enough shared statistics for a meaningful radar (needs at least four).</EmptyState>
                      )}
                    </Panel>
                  </section>
                </div>
              )}

              <Panel className="p-4 text-[13px] leading-relaxed text-ink-muted">
                <p className="font-semibold text-ink">What this data can and can’t show</p>
                <p className="mt-1">
                  ESPN’s free player data covers starts, goals, assists, shots, shots on target, fouls, cards and offsides (plus goalkeeper numbers for keepers).
                  Minutes played, per-90 rates, expected goals/assists, key passes, tackles and interceptions are not provided, so they are not shown or estimated.
                </p>
              </Panel>
            </>
          )}
        </>
      )}
    </div>
  );
}
