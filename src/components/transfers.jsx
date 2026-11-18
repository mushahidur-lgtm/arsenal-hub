import React, { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, FileSignature, Info, Newspaper } from "lucide-react";
import { DIRECTIONS, STATUSES, windowInfo } from "../lib/transfers.js";
import { fmtDay, fmtFull, timeAgo } from "../lib/format.js";
import { Chips, EmptyState, Panel, SectionHead, Skel, Thumb, cx, useNow } from "./ui.jsx";
import { TierBadge } from "./news.jsx";
import { PlayerAvatar } from "./squad.jsx";

const STATUS_STYLE = {
  confirmed: "bg-emerald-600 text-white",
  strong: "bg-ink text-surface",
  medium: "bg-surface-2 text-ink ring-1 ring-inset ring-line",
  weak: "border border-dashed border-ink-muted/40 text-ink-muted",
};

export function StatusBadge({ status, className }) {
  const s = STATUSES[status];
  return (
    <span className={cx("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", STATUS_STYLE[s.tone], className)}>
      {s.label}
    </span>
  );
}

const DIR_ICON = {
  incoming: <ArrowDownLeft size={13} className="text-emerald-600" />,
  outgoing: <ArrowUpRight size={13} className="text-brand" />,
  renewal: <FileSignature size={13} className="text-navy-ink" />,
  general: <Newspaper size={13} className="text-ink-muted" />,
};

const positionGroup = (p) => {
  if (!p?.position) return "unknown";
  const s = p.group ?? p.position;
  if (/goal/i.test(s)) return "GK";
  if (/defen|back/i.test(s)) return "DEF";
  if (/mid/i.test(s)) return "MID";
  return "FWD";
};

/** "Reported by BBC Sport and The Athletic (independently)" */
function Consensus({ e }) {
  const ind = e.independent.length;
  const rel = e.reliableOutlets.length;
  if (e.outlets.length === 1) return <span>Single source: {e.outlets[0]}</span>;
  return (
    <span>
      {e.outlets.length} outlets{rel ? `, ${rel} reliable` : ""}
      {ind < e.outlets.length ? ` · ${ind} reporting independently, others citing them` : " · reporting independently"}
    </span>
  );
}

function TransferCard({ e, now }) {
  const [open, setOpen] = useState(false);
  const p = e.player;
  const articles = [e, ...e.related].flatMap((x) => x.articles);
  const unique = [...new Map(articles.map((a) => [a.link, a])).values()].sort((a, b) => (b.date ?? 0) - (a.date ?? 0));
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        {p ? <PlayerAvatar p={p} className="h-12 w-12" /> : <Thumb src={e.story.image} className="h-12 w-12 rounded-lg" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              {DIR_ICON[e.direction]} {DIRECTIONS[e.direction]}
            </span>
            <StatusBadge status={e.status} />
          </div>
          {p ? (
            <>
              <h3 className="mt-1 truncate text-base font-semibold text-ink">{p.name}</h3>
              <p className="truncate text-xs text-ink-muted">
                {[p.position, p.age && `${p.age} yrs`, p.inSquad ? "Arsenal" : p.club && `Currently: ${p.club}`].filter(Boolean).join(" · ")}
              </p>
            </>
          ) : (
            <h3 className="mt-1 text-sm font-semibold leading-snug text-ink">{e.headline}</h3>
          )}
        </div>
      </div>

      {p && <p className="text-[13px] leading-snug text-ink">{e.headline}</p>}

      {(e.fee || e.contract || (p && e.direction === "incoming")) && (
        <dl className="grid grid-cols-2 gap-2 text-xs">
          {p && e.direction === "incoming" && (
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-ink-muted">Linked move</dt>
              <dd className="font-semibold text-ink">{p.club ? `${p.club} → ` : ""}Arsenal</dd>
            </div>
          )}
          {e.fee && (
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-ink-muted">Reported fee</dt>
              <dd className="font-semibold text-ink">{e.fee.text} <span className="font-normal text-ink-muted">per {e.fee.source}</span></dd>
            </div>
          )}
          {e.contract && (
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-ink-muted">Contract</dt>
              <dd className="font-semibold text-ink">{e.contract.text} <span className="font-normal text-ink-muted">per {e.contract.source}</span></dd>
            </div>
          )}
        </dl>
      )}

      <div className="mt-auto space-y-2 border-t border-line pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-muted">
          <Consensus e={e} />
          <span title={e.updated ? fmtFull(e.updated) : ""}>Updated {e.updated ? timeAgo(e.updated, now) : "—"}</span>
        </div>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent">
          {open ? "Hide" : "Show"} {unique.length} report{unique.length > 1 ? "s" : ""} <ChevronDown size={12} className={cx("transition", open && "rotate-180")} />
        </button>
        {open && (
          <ul className="space-y-2">
            {unique.map((a) => (
              <li key={a.link}>
                <a href={a.link} target="_blank" rel="noopener noreferrer" className="group block">
                  <p className="text-[13px] leading-snug text-ink group-hover:text-accent">{a.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted">
                    <span className="font-semibold text-ink">{a.source}</span>
                    <TierBadge tier={a.tier} />
                    {a.journalist && <span>by {a.journalist}</span>}
                    {!a.journalist && a.author && <span>by {a.author}</span>}
                    <span>{a.date ? fmtDay(a.date) : ""}</span>
                    {a.cites?.length > 0 && <span className="italic">citing {a.cites.join(", ")}</span>}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

function OverviewStat({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={cx("mt-1 font-display text-2xl font-bold tabular-nums", tone)}>{value}</p>
    </div>
  );
}

const DIR_FILTERS = [
  { id: "all", label: "All" },
  { id: "incoming", label: "Incoming" },
  { id: "outgoing", label: "Outgoing" },
  { id: "renewal", label: "Renewals" },
  { id: "general", label: "Window news" },
];
const STATUS_FILTERS = [
  { id: "all", label: "Any status" },
  { id: "confirmed", label: "Confirmed" },
  { id: "rumour", label: "Rumours & reports" },
];
const POS_FILTERS = [
  { id: "all", label: "Any position" },
  { id: "GK", label: "GK" },
  { id: "DEF", label: "DEF" },
  { id: "MID", label: "MID" },
  { id: "FWD", label: "FWD" },
];
const QUALITY_FILTERS = [
  { id: "all", label: "All sources" },
  { id: "reliable", label: "Reliable outlets only" },
];

export function TransfersPage({ entries, loading, failed, prefs, setPrefs, archiveDays }) {
  const now = useNow();
  const f = { dir: "all", status: "all", pos: "all", quality: "all", ...(prefs.transferFilters ?? {}) };
  const set = (k) => (v) => setPrefs((p) => ({ ...p, transferFilters: { ...f, [k]: v } }));
  const win = windowInfo(new Date(now));

  const filtered = useMemo(() => entries
    .filter((e) => f.dir === "all" || e.direction === f.dir)
    .filter((e) => f.status === "all" || (f.status === "confirmed" ? e.status === "confirmed" : e.status !== "confirmed"))
    .filter((e) => f.pos === "all" || positionGroup(e.player) === f.pos)
    .filter((e) => f.quality === "all" || e.reliableOutlets.length > 0)
    .sort((a, b) => STATUSES[b.status].rank - STATUSES[a.status].rank || (b.updated ?? 0) - (a.updated ?? 0)),
  [entries, f.dir, f.status, f.pos, f.quality]);

  const count = (pred) => entries.filter(pred).length;
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-accent">Transfers</p>
        <h1 className="text-2xl text-ink sm:text-3xl">Transfer tracker</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          {win.open ? `The ${win.name} is open until ${fmtDay(win.closes)}.` : `Next: the ${win.name}, opening ${fmtDay(win.opens)}.`}{" "}
          Built from the news feeds, so it only shows what outlets have actually reported.
        </p>
      </div>

      <section>
        <SectionHead title="Activity overview" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <OverviewStat label="Confirmed arrivals" value={count((e) => e.direction === "incoming" && e.status === "confirmed")} tone="text-emerald-700 dark:text-emerald-400" />
          <OverviewStat label="Confirmed departures" value={count((e) => e.direction === "outgoing" && e.status === "confirmed")} tone="text-accent" />
          <OverviewStat label="Rumoured targets" value={count((e) => e.direction === "incoming" && e.status !== "confirmed")} tone="text-ink" />
          <OverviewStat label="Linked with exits" value={count((e) => e.direction === "outgoing" && e.status !== "confirmed")} tone="text-ink" />
          <OverviewStat label="Contract stories" value={count((e) => e.direction === "renewal")} tone="text-navy-ink" />
        </div>
        <p className="mt-2 text-[11px] text-ink-muted">
          Counts cover stories from the last {archiveDays} days that this device has seen. Players named only in passing are listed under “Window news”, not as targets.
        </p>
      </section>

      <div className="space-y-2">
        <Chips options={DIR_FILTERS.map((d) => ({ ...d, count: d.id === "all" ? entries.length : count((e) => e.direction === d.id) }))} value={f.dir} onChange={set("dir")} />
        <div className="flex flex-wrap gap-2">
          <Chips options={STATUS_FILTERS} value={f.status} onChange={set("status")} className="sm:flex-nowrap" />
          <Chips options={POS_FILTERS} value={f.pos} onChange={set("pos")} className="sm:flex-nowrap" />
          <Chips options={QUALITY_FILTERS} value={f.quality} onChange={set("quality")} className="sm:flex-nowrap" />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skel key={i} className="h-48 rounded-xl" />)}</div>
      ) : failed && !entries.length ? (
        <Panel><EmptyState>News feeds are unavailable right now, so there are no transfer reports to show.</EmptyState></Panel>
      ) : filtered.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((e) => <TransferCard key={e.id} e={e} now={now} />)}</div>
      ) : (
        <Panel><EmptyState>No transfer reports match these filters.</EmptyState></Panel>
      )}

      <details className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-muted">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold text-ink"><Info size={14} /> How statuses are decided</summary>
        <ul className="mt-3 space-y-2 text-[13px]">
          <li><StatusBadge status="confirmed" /> The club announced it, or two independent reliable outlets report it as done.</li>
          <li><StatusBadge status="done" /> One reliable outlet reports it as done. Waiting for the club or a second source.</li>
          <li><StatusBadge status="advanced" /> A reliable outlet reports advanced talks, an agreement in principle, or a medical.</li>
          <li><StatusBadge status="strong" /> A reliable outlet reports bids, offers or negotiations.</li>
          <li><StatusBadge status="interest" /> Interest reported. Secondary outlets can’t go higher than this.</li>
          <li><StatusBadge status="monitoring" /> Monitoring or scouting.</li>
          <li><StatusBadge status="speculation" /> Fan sites, hedged wording (“could”, “claims”, quoted rumours), or denials.</li>
        </ul>
        <p className="mt-3 text-[12px]">
          Outlets that cite another outlet’s report aren’t counted as independent. Fees and contract lengths appear only when an outlet states them.
          Player details come from ESPN: the Arsenal squad list, or a single exact-name search match for targets. When there’s no match, no player card is shown.
        </p>
      </details>
    </div>
  );
}

/** Homepage: the most significant transfer items. */
export function TransferWatch({ entries, limit = 4, unavailable }) {
  const top = [...entries]
    .filter((e) => e.direction !== "general" || e.reliableOutlets.length)
    .sort((a, b) => STATUSES[b.status].rank - STATUSES[a.status].rank || (b.updated ?? 0) - (a.updated ?? 0))
    .slice(0, limit);
  if (!top.length) return <EmptyState>{unavailable ? "News feeds unavailable." : "No transfer reports in the feeds right now."}</EmptyState>;
  return (
    <ul className="divide-y divide-line">
      {top.map((e) => (
        <li key={e.id}>
          <a href="#/transfers" className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2">
            {e.player ? <PlayerAvatar p={e.player} className="h-9 w-9" /> : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2">{DIR_ICON[e.direction]}</span>}
            <div className="min-w-0 flex-1">
              <p className={cx("text-[13px] font-semibold text-ink", e.player ? "truncate" : "line-clamp-2 leading-snug")}>{e.player?.name ?? e.headline}</p>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-ink-muted">
                <StatusBadge status={e.status} className="!px-1.5 !text-[9px]" />
                <span className="inline-flex shrink-0 items-center gap-0.5">{DIR_ICON[e.direction]} {DIRECTIONS[e.direction]}</span>
                <span className="truncate">· {e.outlets[0]}{e.outlets.length > 1 ? ` +${e.outlets.length - 1}` : ""}</span>
              </div>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
