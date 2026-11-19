import React, { useMemo, useState } from "react";
import { ExternalLink, Info } from "lucide-react";
import { CATEGORIES, ERAS, HISTORY_NOTE, HISTORY_SOURCES, HONOURS, INVINCIBLES, RECORDS, TIMELINE } from "../lib/history.js";
import { Chips, Panel, SectionHead, Select, cx } from "./ui.jsx";

const TABS = [
  { id: "timeline", label: "Timeline" },
  { id: "invincibles", label: "The Invincibles" },
  { id: "records", label: "Records & honours" },
  { id: "eras", label: "Managers & eras" },
];

const CAT_STYLE = {
  club: "bg-ink/5 text-ink dark:bg-white/10",
  trophy: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200",
  stadium: "bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-200",
  people: "bg-violet-100 text-violet-900 dark:bg-violet-500/15 dark:text-violet-200",
  record: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200",
  women: "bg-rose-100 text-rose-900 dark:bg-rose-500/15 dark:text-rose-200",
};

function Timeline({ prefs, setPrefs, focus }) {
  const cat = prefs.historyCat ?? "all";
  const [decade, setDecade] = useState("all");
  const decades = useMemo(() => [...new Set(TIMELINE.map((e) => Math.floor(e.year / 10) * 10))].sort(), []);
  const events = TIMELINE.filter((e) => (cat === "all" || e.cat === cat) && (decade === "all" || Math.floor(e.year / 10) * 10 === Number(decade)));
  return (
    <div className="space-y-4">
      <h2 className="sr-only">Timeline</h2>
      <Chips options={CATEGORIES.map((c) => ({ ...c, count: c.id === "all" ? TIMELINE.length : TIMELINE.filter((e) => e.cat === c.id).length }))} value={cat} onChange={(v) => setPrefs((p) => ({ ...p, historyCat: v }))} />
      <Select value={decade} onChange={setDecade} label="Decade" options={[{ id: "all", label: "All years" }, ...decades.map((d) => ({ id: String(d), label: `${d}s` }))]} />
      {events.length ? (
        <ol className="relative ml-2 space-y-5 border-l-2 border-line pl-5">
          {events.map((e, i) => (
            <li key={`${e.year}-${i}`} id={`y${e.year}`} className={cx("relative", focus === e.year && "rounded-lg bg-brand/[0.06] p-2 -m-2")}>
              <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-surface bg-brand" />
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-base font-bold tabular-nums text-ink">{e.label ?? e.year}</span>
                <span className={cx("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", CAT_STYLE[e.cat])}>{CATEGORIES.find((c) => c.id === e.cat)?.label}</span>
              </div>
              <h3 className="mt-0.5 font-sans text-[15px] font-semibold text-ink">{e.title}</h3>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">{e.text}</p>
            </li>
          ))}
        </ol>
      ) : (
        <Panel><p className="px-4 py-8 text-center text-sm text-ink-muted">No events for this filter.</p></Panel>
      )}
    </div>
  );
}

function Invincibles() {
  const t = INVINCIBLES.table;
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-hero-from via-hero-from to-hero-to p-6 text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand/25 blur-3xl" />
        <p className="eyebrow relative text-gold-light">Premier League {INVINCIBLES.season}</p>
        <h2 className="relative mt-1 text-2xl text-white sm:text-3xl">Played 38. Lost none.</h2>
        <p className="relative mt-2 max-w-2xl text-sm leading-relaxed text-white/80">{INVINCIBLES.summary}</p>
      </div>

      <section>
        <SectionHead title="The season in numbers" />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
          {[["Position", t.position], ["Played", t.played], ["Won", t.won], ["Drawn", t.drawn], ["Lost", t.lost], ["Scored", t.gf], ["Conceded", t.ga], ["Goal diff", `+${t.gd}`], ["Points", t.points]].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-line bg-surface p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{k}</p>
              <p className="mt-1 font-display text-xl font-bold tabular-nums text-ink">{v}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-ink-muted">{t.margin}. Manager: {INVINCIBLES.manager}. Captain: {INVINCIBLES.captain}. {INVINCIBLES.note}</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionHead title="Key players" />
          <Panel className="divide-y divide-line">
            {INVINCIBLES.keyPlayers.map((p) => (
              <div key={p.name} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                <p className="text-sm font-semibold text-ink">{p.name}{p.note && <span className="ml-2 text-xs font-normal text-ink-muted">{p.note}</span>}</p>
                <span className="shrink-0 text-[11px] text-ink-muted">{p.role}</span>
              </div>
            ))}
          </Panel>
        </section>
        <section>
          <SectionHead title="Historic matches" />
          <Panel className="divide-y divide-line">
            {INVINCIBLES.matches.map((m) => (
              <div key={m.date} className="px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{m.date}</p>
                <p className="mt-0.5 text-sm font-semibold text-ink">{m.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">{m.text}</p>
              </div>
            ))}
          </Panel>
        </section>
      </div>
    </div>
  );
}

function Records() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {RECORDS.map((r) => (
          <section key={r.id}>
            <SectionHead title={r.title} />
            <Panel className="divide-y divide-line">
              {r.rows.map(([k, v], i) => (
                <div key={k} className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 text-ink">{r.unit ? <><span className="mr-2 text-ink-muted tabular-nums">{i + 1}</span>{k}</> : k}</span>
                  <span className="shrink-0 text-right font-semibold tabular-nums text-ink">{v}{r.unit ? <span className="ml-1 text-[11px] font-normal text-ink-muted">{r.unit}</span> : null}</span>
                </div>
              ))}
            </Panel>
            <p className="mt-1.5 text-[11px] text-ink-muted">{r.asOf}</p>
          </section>
        ))}
      </div>
      <section>
        <SectionHead title="Trophy roll" />
        <div className="grid gap-3 sm:grid-cols-2">
          {HONOURS.groups.map((g) => (
            <Panel key={g.name} className="p-4">
              <p className="text-sm font-semibold text-ink">{g.name} <span className="ml-1 font-display text-accent">{g.years.length}</span></p>
              <p className="mt-2 flex flex-wrap gap-1.5">{g.years.map((y) => <span key={y} className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] tabular-nums text-ink">{y}</span>)}</p>
            </Panel>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-ink-muted">{HONOURS.cutoff}</p>
      </section>
    </div>
  );
}

function Eras() {
  return (
    <div>
      <h2 className="sr-only">Managers and eras</h2>
    <ol className="space-y-3">
      {ERAS.map((e) => (
        <li key={e.name}>
          <Panel className="p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-ink">{e.name}</h3>
              <span className="text-xs tabular-nums text-ink-muted">{e.years}</span>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{e.text}</p>
          </Panel>
        </li>
      ))}
    </ol>
    </div>
  );
}

export function HistoryPage({ tab, prefs, setPrefs, focus }) {
  const active = TABS.some((t) => t.id === tab) ? tab : "timeline";
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-accent">History</p>
        <h1 className="text-2xl text-ink sm:text-3xl">Arsenal history & records</h1>
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0" role="tablist">
        {TABS.map((t) => (
          <a key={t.id} href={t.id === "timeline" ? "#/history" : `#/history/${t.id}`} role="tab" aria-selected={active === t.id}
            className={cx("shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-semibold transition", active === t.id ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink-muted hover:text-ink")}>
            {t.label}
          </a>
        ))}
      </div>
      {active === "timeline" && <Timeline prefs={prefs} setPrefs={setPrefs} focus={focus} />}
      {active === "invincibles" && <Invincibles />}
      {active === "records" && <Records />}
      {active === "eras" && <Eras />}
      <div className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3 text-[12px] leading-relaxed text-ink-muted">
        <Info size={14} className="mt-0.5 shrink-0" />
        <div>
          <p>{HISTORY_NOTE}</p>
          <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {HISTORY_SOURCES.map((s) => <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">{s.label} <ExternalLink size={11} /></a>)}
          </p>
        </div>
      </div>
    </div>
  );
}
