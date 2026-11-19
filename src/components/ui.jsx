import React, { useEffect, useState } from "react";
import { AlertTriangle, ChevronRight, RefreshCw } from "lucide-react";
import { timeAgo } from "../lib/format.js";

export const cx = (...c) => c.filter(Boolean).join(" ");

/** Keeps one broken page from blanking the whole app: shows a message and a way back. */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-8 text-center">
        <AlertTriangle className="mx-auto mb-2 text-amber-500" />
        <p className="font-semibold text-ink">This page hit a problem</p>
        <p className="mt-1 text-sm text-ink-muted">{String(this.state.error?.message ?? this.state.error)}</p>
        <a href="#/" className="mt-4 inline-block rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white">Back to home</a>
      </div>
    );
  }
}

/** Re-render every `ms` so relative times ("5m ago") stay true. */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** A quiet surface. Used sparingly; most homepage sections are open layouts. */
export function Panel({ className, children, as: Tag = "section" }) {
  return <Tag className={cx("rounded-2xl border border-line bg-surface text-ink", className)}>{children}</Tag>;
}

/** Section heading with optional "see all" link and right-side actions. */
export function SectionHead({ eyebrow, title, href, linkLabel = "See all", action, className }) {
  return (
    <div className={cx("mb-3 flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow text-accent">{eyebrow}</p>}
        <h2 className="truncate text-lg text-ink sm:text-xl">{title}</h2>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        {href && (
          <a href={href} className="inline-flex items-center gap-0.5 text-xs font-semibold text-accent hover:underline">
            {linkLabel} <ChevronRight size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

export const Skel = ({ className }) => <div className={cx("animate-pulse rounded-md bg-surface-2", className)} />;

export function SkeletonRows({ rows = 4, avatar = true }) {
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

export function ErrorState({ message, onRetry, compact, title = "Couldn’t load live data" }) {
  return (
    <div className={cx("flex flex-col items-center justify-center gap-2 text-center", compact ? "p-4" : "p-8")}>
      <AlertTriangle className="text-amber-500" size={compact ? 20 : 26} />
      <p className="text-sm font-medium">{title}</p>
      {message && <p className="max-w-sm text-xs text-ink-muted">{message}</p>}
      {onRetry && (
        <button onClick={onRetry} className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:bg-surface-2">
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ children }) {
  return <p className="px-4 py-8 text-center text-sm text-ink-muted">{children}</p>;
}

/** "Couldn’t load <section> — Retry", compact enough to sit inside any card. */
export function SectionError({ what, error, onRetry }) {
  return <ErrorState compact title={`Couldn’t load ${what}`} message={error} onRetry={onRetry} />;
}

/** Cached data older than this is labelled with its age even while a refresh is running. */
const STALE_LABEL_AFTER_MS = 2 * 60e3;

/**
 * Shown when older (cached) data is on screen: either a refresh failed, or the saved copy is
 * still being shown while a refresh runs. Always says how old the data is.
 */
export function StaleBanner({ source, onRetry }) {
  const age = source.savedAt ? Date.now() - new Date(source.savedAt).getTime() : null;
  const showing = source.data && (source.status === "cached" || source.status === "refreshing");
  if (showing && age != null && age > STALE_LABEL_AFTER_MS) {
    return (
      <p className="flex items-center gap-1.5 text-[11px] text-ink-muted" role="status">
        <RefreshCw size={11} className="shrink-0" /> Last updated {timeAgo(new Date(source.savedAt))} · refreshing…
      </p>
    );
  }
  if (source.status !== "error" || !source.data) return null;
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
      <span className="flex items-center gap-1.5">
        <AlertTriangle size={12} className="shrink-0" /> Refresh failed. Last updated {source.savedAt ? timeAgo(new Date(source.savedAt)) : "earlier"}.
      </span>
      {onRetry && <button onClick={onRetry} className="font-semibold underline">Retry</button>}
    </div>
  );
}

/** Renders skeleton / error / content depending on a source's state. */
export function SourceGate({ source, onRetry, skeleton, children }) {
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

export function Crest({ src, alt, className = "h-8 w-8" }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken)
    return (
      <span className={cx("grid shrink-0 place-items-center rounded-full bg-surface-2 text-[10px] font-bold text-ink-muted", className)}>
        {(alt || "?").slice(0, 3).toUpperCase()}
      </span>
    );
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setBroken(true)} className={cx("shrink-0 object-contain", className)} />;
}

/** Lazy image with a neutral placeholder when missing/broken. */
export function Thumb({ src, alt = "", className, children, priority, onBroken }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => { if (broken) onBroken?.(); }, [broken]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={cx("relative overflow-hidden bg-surface-2", className)}>
      {src && !broken ? (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchpriority={priority ? "high" : undefined}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-surface-2 to-line">
          <ArsenalMark className="h-7 w-7 opacity-25" />
        </div>
      )}
      {children}
    </div>
  );
}

/** Simple cannon-ish mark for placeholders (not the club crest). */
export function ArsenalMark({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm-4.5 10.2h7.3a1.6 1.6 0 1 1 0 3.2H8.2a.7.7 0 0 1-.7-.7v-2.5Zm9.6-.6a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Z" />
    </svg>
  );
}

const RESULT_STYLE = {
  W: "bg-emerald-600 text-white",
  D: "bg-zinc-400 text-white dark:bg-zinc-500",
  L: "bg-brand text-white",
};
const RESULT_WORD = { W: "Win", D: "Draw", L: "Loss" };

export function ResultPill({ r, className = "h-6 w-6 text-xs" }) {
  return (
    <span aria-label={RESULT_WORD[r] ?? "No result"} className={cx("grid shrink-0 place-items-center rounded-md font-bold", RESULT_STYLE[r] ?? "bg-surface-2", className)}>
      {r ?? "–"}
    </span>
  );
}

export function CompBadge({ match, className }) {
  const tone = match.friendly
    ? "bg-surface-2 text-ink-muted"
    : /champions/i.test(match.competition)
      ? "bg-navy/10 text-navy-ink dark:bg-sky-400/10"
      : /premier/i.test(match.competition)
        ? "bg-ink/5 text-ink dark:bg-white/10"
        : "bg-gold/15 text-gold-ink";
  return (
    <span className={cx("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", tone, className)} title={match.competition}>
      {match.compShort}
    </span>
  );
}

/** Segmented control / filter chips. */
export function Chips({ options, value, onChange, className, size = "sm" }) {
  return (
    <div className={cx("no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0", className)} role="tablist">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={cx(
              "shrink-0 whitespace-nowrap rounded-full border font-semibold transition max-lg:min-h-11",
              size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
              active ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink-muted hover:text-ink"
            )}
          >
            {o.label}
            {o.count != null && <span className={cx("ml-1.5 tabular-nums", active ? "text-white" : "")}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Native select styled to match. */
export function Select({ value, onChange, options, label, ariaLabel, className }) {
  return (
    <label className={cx("inline-flex items-center gap-1.5 text-xs text-ink-muted", className)}>
      {label && <span className="hidden sm:inline">{label}</span>}
      <select
        aria-label={ariaLabel ?? label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink focus:outline-none max-lg:min-h-11"
      >
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  );
}
