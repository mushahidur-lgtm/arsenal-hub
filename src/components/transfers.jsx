import React, { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, Eye, EyeOff, FileSignature, Info, Newspaper } from "lucide-react";
import { loadPlayerPhoto } from "../lib/playerstats.js";
import { DIRECTIONS, STATUSES, STEPS, stepOf, subjectKey, timelineOf, windowInfo } from "../lib/transfers.js";
import { fmtDay, fmtFull, timeAgo } from "../lib/format.js";
import { Chips, EmptyState, Panel, SectionError, SectionHead, Skel, SkeletonRows, Thumb, cx, useNow } from "./ui.jsx";
import { TierBadge } from "./news.jsx";
import { PlayerAvatar } from "./squad.jsx";

const STATUS_STYLE = {
  confirmed: "bg-emerald-600 text-white",
  strong: "bg-ink text-surface",
  medium: "bg-surface-2 text-ink ring-1 ring-inset ring-line",
  weak: "border border-dashed border-ink-muted/40 text-ink-muted",
  dismissed: "bg-surface-2 text-ink-muted line-through decoration-ink-muted/50",
};

export function StatusBadge({ status, className }) {
  const s = STATUSES[status];
  return (
    <span className={cx("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", STATUS_STYLE[s.tone], className)}>
      {s.label}
    </span>
  );
}

/** Rumour → Talks → Agreed → Complete. Position comes from the status; the badge says exactly how firm it is. */
export function Stepper({ status, className }) {
  const at = stepOf(status);
  if (at == null) return <p className={cx("text-[11px] text-ink-muted", className)}>Dismissed: no longer being reported as live</p>;
  return (
    <ol className={cx("flex items-center", className)} aria-label={`Stage: ${STEPS[at]}, step ${at + 1} of ${STEPS.length}`}>
      {STEPS.map((label, i) => (
        <li key={label} className="flex min-w-0 flex-1 items-center last:flex-none" aria-current={i === at ? "step" : undefined}>
          <span className="flex flex-col items-start gap-0.5">
            <span className={cx("h-2.5 w-2.5 rounded-full border-2", i < at ? "border-brand bg-brand" : i === at ? "border-brand bg-surface ring-2 ring-brand/30" : "border-line bg-surface")} />
            <span className={cx("text-[9px] font-semibold uppercase tracking-wide", i === at ? "text-accent" : i < at ? "text-ink" : "text-ink-muted")}>{label}</span>
          </span>
          {i < STEPS.length - 1 && <span className={cx("mx-1 mb-3 h-0.5 flex-1 rounded", i < at ? "bg-brand" : "bg-line")} />}
        </li>
      ))}
    </ol>
  );
}

/**
 * Headshot when one exists: ESPN's, or for current squad members a Wikipedia photo that has been
 * matched on name *and* birth year. Rumoured targets keep initials, because a namesake photo would
 * be worse than none.
 */
function TransferAvatar({ p, className }) {
  const [wiki, setWiki] = useState(null);
  useEffect(() => {
    if (p.photo || !p.inSquad) return undefined;
    let off = false;
    loadPlayerPhoto(p.name, p.dob).then((r) => !off && setWiki(r?.src ?? null)).catch(() => {});
    return () => { off = true; };
  }, [p.name, p.photo, p.inSquad]); // eslint-disable-line react-hooks/exhaustive-deps
  return <PlayerAvatar p={{ ...p, photo: p.photo ?? wiki }} className={className} />;
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

const STAGE_DOT = {
  "Official confirmation": "bg-emerald-600",
  "Reported complete": "bg-emerald-500",
  "Denied / dismissed": "bg-zinc-400",
};

/** Verified progression: one row per real article, oldest first, with the stage that headline's wording supports. */
function Timeline({ entry }) {
  const items = timelineOf(entry);
  return (
    <ol className="relative ml-1.5 space-y-3 border-l border-line pl-4">
      {items.map((it) => (
        <li key={it.link} className="relative">
          <span className={cx("absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface", STAGE_DOT[it.stage] ?? "bg-ink-muted")} />
          <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-ink-muted">
            <span className="font-semibold uppercase tracking-wide text-ink">{it.stage}</span>
            <span>{it.date ? fmtDay(it.date) : ""}</span>
          </p>
          <a href={it.link} target="_blank" rel="noopener noreferrer" className="group block">
            <p className="text-[13px] leading-snug text-ink group-hover:text-accent">{it.title}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted">
              <span className="font-semibold text-ink">{it.source}</span>
              <TierBadge tier={it.tier} />
              {it.journalist && <span>by {it.journalist}</span>}
            </p>
          </a>
        </li>
      ))}
      <li className="text-[11px] text-ink-muted">Stages come from each headline’s wording and the outlet’s reliability. Only real articles are listed.</li>
    </ol>
  );
}

const linksOf = (entry) => [...new Set([entry, ...entry.related].flatMap((x) => x.articles).map((a) => a.link))];

function WatchButton({ entry, watch, className }) {
  if (!watch) return null;
  const key = subjectKey(entry);
  const on = watch.has(key);
  return (
    <button
      onClick={() => (on ? watch.remove(key) : watch.add({ key, name: entry.player?.name ?? entry.headline, status: entry.status, links: linksOf(entry) }))}
      aria-pressed={on}
      title={on ? "Remove from watchlist" : "Add to watchlist"}
      className={cx("hit inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition", on ? "border-brand bg-brand/10 text-accent" : "border-line text-ink-muted hover:text-ink", className)}
    >
      {on ? <EyeOff size={12} /> : <Eye size={12} />} {on ? "Watching" : "Watch"}
    </button>
  );
}

function TransferCard({ e, now, watch }) {
  const [open, setOpen] = useState(false);
  const p = e.player;
  const count = linksOf(e).length;
  const item = watch?.list[subjectKey(e)];
  const unseen = item ? linksOf(e).filter((l) => !item.seen.includes(l)).length : 0;
  const changed = item && item.status !== e.status;
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
            {(changed || unseen > 0) && <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">{changed ? "Status changed" : `${unseen} new`}</span>}
          </div>
          {p ? (
            <>
              <h3 className="mt-1 truncate text-base font-semibold text-ink">{p.name}</h3>
              <p className="truncate text-xs text-ink-muted">
                {[p.position, p.age && `${p.age} yrs`, p.inSquad ? "Arsenal" : p.club ? `Currently: ${p.club}` : null].filter(Boolean).join(" · ")}
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="hit inline-flex items-center gap-1 text-[11px] font-semibold text-accent">
            {open ? "Hide" : "Show"} timeline ({count} report{count > 1 ? "s" : ""}) <ChevronDown size={12} className={cx("transition", open && "rotate-180")} />
          </button>
          <WatchButton entry={e} watch={watch} />
        </div>
        {open && <Timeline entry={e} />}
      </div>
    </article>
  );
}

/** One watched subject compared with what the user last saw: status change and new reports. */
function Watchlist({ entries, watch, now }) {
  const byKey = new Map(entries.map((e) => [subjectKey(e), e]));
  const items = Object.entries(watch.list);
  if (!items.length) {
    return <Panel><EmptyState>Your watchlist is empty. Use “Watch” on any transfer card to follow it here. It is stored on this device only.</EmptyState></Panel>;
  }
  return (
    <div className="space-y-3">
      {items.map(([key, item]) => {
        const entry = byKey.get(key);
        if (!entry) {
          return (
            <Panel key={key} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                <p className="text-[12px] text-ink-muted">No recent reports in the feeds. Last status you saw: {STATUSES[item.status]?.label ?? item.status}.</p>
              </div>
              <button onClick={() => watch.remove(key)} className="shrink-0 text-xs font-semibold text-ink-muted hover:text-ink">Remove</button>
            </Panel>
          );
        }
        const links = linksOf(entry);
        const fresh = links.filter((l) => !item.seen.includes(l));
        const changed = item.status !== entry.status;
        const latest = [entry, ...entry.related].flatMap((x) => x.articles).sort((a, b) => (b.date ?? 0) - (a.date ?? 0)).slice(0, 3);
        return (
          <Panel key={key} className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{entry.player?.name ?? entry.headline}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
                  <StatusBadge status={entry.status} />
                  <span>{DIRECTIONS[entry.direction]}</span>
                  <span>Updated {entry.updated ? timeAgo(entry.updated, now) : "—"}</span>
                  <span>Watching since {fmtDay(new Date(item.addedAt))}</span>
                </p>
              </div>
              <div className="flex gap-2">
                {(changed || fresh.length > 0) && (
                  <button onClick={() => watch.markSeen({ key, status: entry.status, links })} className="rounded-full bg-brand px-3 py-1 text-[11px] font-semibold text-white hover:bg-crimson">Mark as seen</button>
                )}
                <button onClick={() => watch.remove(key)} className="rounded-full border border-line px-3 py-1 text-[11px] font-semibold text-ink-muted hover:bg-surface-2">Remove</button>
              </div>
            </div>
            {changed && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                Status changed since you last looked: {STATUSES[item.status]?.label ?? item.status} → {STATUSES[entry.status].label}
              </p>
            )}
            {fresh.length > 0 && <p className="text-[12px] font-semibold text-accent">{fresh.length} new report{fresh.length > 1 ? "s" : ""} since you last looked</p>}
            <ul className="space-y-1.5">
              {latest.map((a) => (
                <li key={a.link}>
                  <a href={a.link} target="_blank" rel="noopener noreferrer" className="block text-[13px] leading-snug text-ink hover:text-accent">
                    {a.title} <span className="text-[11px] text-ink-muted">· {a.source}, {a.date ? timeAgo(a.date, now) : ""}{fresh.includes(a.link) ? " · new" : ""}</span>
                  </a>
                </li>
              ))}
            </ul>
          </Panel>
        );
      })}
    </div>
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
  { id: "dismissed", label: "Dismissed" },
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

export function TransfersPage({ entries, loading, failed, prefs, setPrefs, archiveDays, watch }) {
  const now = useNow();
  const f = { dir: "all", status: "all", pos: "all", quality: "all", ...(prefs.transferFilters ?? {}) };
  const set = (k) => (v) => setPrefs((p) => ({ ...p, transferFilters: { ...f, [k]: v } }));
  const win = windowInfo(new Date(now));
  const watching = f.dir === "watchlist";
  const watchCount = Object.keys(watch?.list ?? {}).length;
  const newInWatch = useMemo(() => entries.filter((e) => {
    const it = watch?.list[subjectKey(e)];
    return it && (it.status !== e.status || linksOf(e).some((l) => !it.seen.includes(l)));
  }).length, [entries, watch?.list]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => entries
    .filter((e) => f.dir === "all" || e.direction === f.dir)
    .filter((e) => f.status === "all" || (f.status === "confirmed" ? e.status === "confirmed" : f.status === "dismissed" ? e.status === "dismissed" : e.status !== "confirmed" && e.status !== "dismissed"))
    .filter((e) => f.pos === "all" || positionGroup(e.player) === f.pos)
    .filter((e) => f.quality === "all" || e.reliableOutlets.length > 0)
    .sort((a, b) => STATUSES[b.status].rank - STATUSES[a.status].rank || (b.updated ?? 0) - (a.updated ?? 0)),
  [entries, f.dir, f.status, f.pos, f.quality]);

  const count = (pred) => entries.filter(pred).length;
  const dirOptions = [
    ...DIR_FILTERS.map((d) => ({ ...d, count: d.id === "all" ? entries.length : count((e) => e.direction === d.id) })),
    { id: "watchlist", label: newInWatch ? `Watchlist · ${newInWatch} new` : "Watchlist", count: watchCount },
  ];
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-accent">Transfers</p>
        <h1 className="text-2xl text-ink sm:text-3xl">Transfer tracker</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          {win.open ? `The ${win.name} is open (${win.timing}; check the official deadline).` : `Next: the ${win.name}, which ${win.timing}.`}{" "}
          Built from the news feeds, so it only shows what outlets have actually reported.
        </p>
      </div>

      <section>
        <SectionHead title="Activity overview" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <OverviewStat label="Confirmed arrivals" value={count((e) => e.direction === "incoming" && e.status === "confirmed")} tone="text-emerald-700 dark:text-emerald-400" />
          <OverviewStat label="Confirmed departures" value={count((e) => e.direction === "outgoing" && e.status === "confirmed")} tone="text-accent" />
          <OverviewStat label="Rumoured targets" value={count((e) => e.direction === "incoming" && e.status !== "confirmed" && e.status !== "dismissed")} tone="text-ink" />
          <OverviewStat label="Linked with exits" value={count((e) => e.direction === "outgoing" && e.status !== "confirmed" && e.status !== "dismissed")} tone="text-ink" />
          <OverviewStat label="Contract stories" value={count((e) => e.direction === "renewal")} tone="text-navy-ink" />
          <OverviewStat label="Dismissed rumours" value={count((e) => e.status === "dismissed")} tone="text-ink-muted" />
        </div>
        <p className="mt-2 text-[11px] text-ink-muted">
          Counts cover stories from the last {archiveDays} days that this device has seen. Players named only in passing are listed under “Window news”, not as targets.
        </p>
      </section>

      <div className="space-y-2">
        <Chips options={dirOptions} value={f.dir} onChange={set("dir")} />
        {!watching && (
          <div className="flex flex-wrap gap-2">
            <Chips options={STATUS_FILTERS} value={f.status} onChange={set("status")} className="sm:flex-nowrap" />
            <Chips options={POS_FILTERS} value={f.pos} onChange={set("pos")} className="sm:flex-nowrap" />
            <Chips options={QUALITY_FILTERS} value={f.quality} onChange={set("quality")} className="sm:flex-nowrap" />
          </div>
        )}
      </div>

      {watching ? (
        <Watchlist entries={entries} watch={watch} now={now} />
      ) : loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skel key={i} className="h-48 rounded-xl" />)}</div>
      ) : failed && !entries.length ? (
        <Panel><EmptyState>News feeds are unavailable right now, so there are no transfer reports to show.</EmptyState></Panel>
      ) : filtered.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((e) => <TransferCard key={e.id} e={e} now={now} watch={watch} />)}</div>
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
          <li><StatusBadge status="speculation" /> Fan sites or hedged wording (“could”, “claims”, quoted rumours).</li>
          <li><StatusBadge status="dismissed" /> The most recent report is a denial or the player ruling it out.</li>
        </ul>
        <p className="mt-3 text-[12px]">
          Outlets that cite another outlet’s report aren’t counted as independent. No confidence percentages are shown: there isn’t enough data to calculate one defensibly.
          Fees and contract lengths appear only when an outlet states them. Destination clubs for departures aren’t extracted, because headlines rarely state them unambiguously.
          Player details come from ESPN: the Arsenal squad list, or a single exact-name search match for targets.
        </p>
      </details>
    </div>
  );
}

/** Homepage: the most significant transfer items. */
export function TransferWatch({ entries, limit = 4, unavailable, loading, onRetry }) {
  const top = [...entries]
    .filter((e) => e.status !== "dismissed" && (e.direction !== "general" || e.reliableOutlets.length))
    .sort((a, b) => STATUSES[b.status].rank - STATUSES[a.status].rank || (b.updated ?? 0) - (a.updated ?? 0))
    .slice(0, limit);
  if (!top.length) {
    if (loading) return <SkeletonRows rows={3} />;
    if (unavailable) return <SectionError what="transfer reports" onRetry={onRetry} />;
    return <EmptyState>No transfer reports in the feeds right now.</EmptyState>;
  }
  return (
    <ul className="divide-y divide-line">
      {top.map((e) => (
        <li key={e.id}>
          <a href="#/transfers" className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2">
            {e.player ? <TransferAvatar p={e.player} className="h-10 w-10" /> : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2">{DIR_ICON[e.direction]}</span>}
            <div className="min-w-0 flex-1">
              <p className={cx("text-[13px] font-semibold text-ink", e.player ? "truncate" : "line-clamp-2 leading-snug")}>{e.player?.name ?? e.headline}</p>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-ink-muted">
                <StatusBadge status={e.status} className="!px-1.5 !text-[9px]" />
                <span className="inline-flex shrink-0 items-center gap-0.5">{DIR_ICON[e.direction]} {DIRECTIONS[e.direction]}</span>
                <span className="truncate">· {e.outlets[0]}{e.outlets.length > 1 ? ` +${e.outlets.length - 1}` : ""}</span>
              </div>
              <Stepper status={e.status} className="mt-2" />
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
