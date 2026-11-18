import React, { useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, ChevronDown, ExternalLink, Layers, PlayCircle, Search, X } from "lucide-react";
import { CATEGORIES, CATEGORY_SHORT, SORTS, freshness, inCategory } from "../lib/news.js";
import { TIERS } from "../lib/sources.js";
import { fmtFull, timeAgo } from "../lib/format.js";
import { Chips, EmptyState, ErrorState, Panel, Select, Skel, StaleBanner, Thumb, cx, useNow } from "./ui.jsx";

/* ───────────────────────── Badges ───────────────────────── */

const TIER_STYLE = {
  official: "bg-brand text-white",
  journalist: "bg-navy text-white dark:bg-sky-500/20 dark:text-sky-200",
  reliable: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  secondary: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-200",
  speculation: "bg-orange-50 text-orange-800 ring-1 ring-inset ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-200",
  opinion: "bg-surface-2 text-ink-muted ring-1 ring-inset ring-line",
};

export function TierBadge({ tier, className }) {
  const t = TIERS[tier];
  if (!t) return null;
  return (
    <span title={t.label} className={cx("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold", TIER_STYLE[tier], className)}>
      {t.short}
    </span>
  );
}

export function CategoryTag({ cat }) {
  if (!cat || !CATEGORY_SHORT[cat]) return null;
  return <span className="eyebrow text-[10px] text-accent">{CATEGORY_SHORT[cat]}</span>;
}

function FreshnessNote({ date, now }) {
  const f = freshness(date, now);
  if (f === "older") return <span className="rounded bg-surface-2 px-1 text-[10px] text-ink-muted">Older</span>;
  if (f === "stale") return <span className="rounded bg-surface-2 px-1 text-[10px] text-ink-muted">Over a week old</span>;
  return null;
}

function BookmarkButton({ article, bookmarks, className }) {
  if (!bookmarks) return null;
  const on = bookmarks.has(article.link);
  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); bookmarks.toggle(article); }}
      aria-label={on ? "Remove from saved" : "Save article"}
      aria-pressed={on}
      title={on ? "Saved" : "Save for later"}
      className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-full transition hover:bg-surface-2", on ? "text-accent" : "text-ink-muted", className)}
    >
      {on ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
    </button>
  );
}

/** Source line: outlet · credibility · time · journalist / citation notes. */
function Meta({ article, now, showTier = true }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-muted">
      <span className="font-semibold text-ink">{article.source}</span>
      {article.via && <span>via {article.via}</span>}
      {showTier && <TierBadge tier={article.tier} />}
      {article.journalist && <span>by {article.journalist}</span>}
      {!article.journalist && article.author && <span className="hidden sm:inline">by {article.author}</span>}
      <time dateTime={article.date?.toISOString()} title={article.date ? `Published ${fmtFull(article.date)}` : "Publish time unknown"}>
        {article.date ? timeAgo(article.date, now) : "time unknown"}
      </time>
      {article.updated && article.date && article.updated - article.date > 10 * 60e3 && (
        <span title={fmtFull(article.updated)}>· updated {timeAgo(article.updated, now)}</span>
      )}
      <FreshnessNote date={article.date} now={now} />
      {article.cites?.length > 0 && <span className="italic">citing {article.cites.join(", ")}</span>}
    </div>
  );
}

/** The other outlets covering the same story. */
function Coverage({ story, now }) {
  const others = story.articles.slice(1);
  if (!others.length) return null;
  return (
    <ul className="mt-2 space-y-2 border-l-2 border-line pl-3">
      {others.map((a) => (
        <li key={a.link}>
          <a href={a.link} target="_blank" rel="noopener noreferrer" className="group block">
            <p className="text-[13px] font-medium leading-snug text-ink group-hover:text-accent">{a.title}</p>
            <Meta article={a} now={now} />
          </a>
        </li>
      ))}
    </ul>
  );
}

function CoverageToggle({ story, open, setOpen }) {
  const n = story.outlets.length;
  if (story.articles.length < 2) return null;
  const independent = story.independent.length;
  return (
    <button
      onClick={(e) => { e.preventDefault(); setOpen((o) => !o); }}
      aria-expanded={open}
      className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-1 text-[11px] font-semibold text-ink hover:bg-line"
    >
      <Layers size={12} />
      {n > 1 ? `${n} outlets` : `${story.articles.length} articles`}
      {n > 1 && independent < n && <span className="font-normal text-ink-muted">({independent} independent)</span>}
      <ChevronDown size={12} className={cx("transition", open && "rotate-180")} />
    </button>
  );
}

/* ───────────────────────── Story cards ───────────────────────── */

/** Compact list row used across the site. */
export function StoryRow({ story, bookmarks, now, showImage = true, dense }) {
  const [open, setOpen] = useState(false);
  const a = story.lead;
  return (
    <article className={cx("group/row relative", dense ? "py-3" : "py-4")}>
      <div className="flex gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <CategoryTag cat={story.primary} />
          </div>
          <a href={a.link} target="_blank" rel="noopener noreferrer" className="group block">
            <h3 className={cx("font-sans font-semibold leading-snug text-ink group-hover:text-accent", dense ? "text-[14px]" : "text-[15px] sm:text-base")}>
              {a.title}
              <ExternalLink size={12} className="ml-1 inline align-baseline opacity-0 transition group-hover:opacity-60" aria-hidden />
            </h3>
          </a>
          {!dense && story.summary && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">{story.summary}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Meta article={a} now={now} />
            <CoverageToggle story={story} open={open} setOpen={setOpen} />
          </div>
          {open && <Coverage story={story} now={now} />}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {showImage && (
            <a href={a.link} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden>
              <Thumb src={story.image} className={cx("rounded-lg", dense ? "h-16 w-20" : "h-20 w-24 sm:h-24 sm:w-36")}>
                {a.video && <PlayCircle size={18} className="absolute bottom-1 left-1 text-white drop-shadow" />}
              </Thumb>
            </a>
          )}
          <BookmarkButton article={a} bookmarks={bookmarks} />
        </div>
      </div>
    </article>
  );
}

/** Today's top story: the lead of the daily briefing. */
export function FeaturedStory({ story, bookmarks, now }) {
  const [open, setOpen] = useState(false);
  const [noImage, setNoImage] = useState(false);
  if (!story) return null;
  const a = story.lead;
  const showImage = story.image && !noImage;
  return (
    <article className="fade-up overflow-hidden rounded-2xl border border-line bg-surface">
      <div className={cx("grid", showImage && "md:grid-cols-5")}>
        {showImage && (
          <a href={a.link} target="_blank" rel="noopener noreferrer" className="block md:col-span-3" tabIndex={-1} aria-hidden>
            <Thumb src={story.image} priority onBroken={() => setNoImage(true)} className="aspect-[16/9] h-full w-full md:aspect-auto md:min-h-[300px]" />
          </a>
        )}
        <div className={cx("flex flex-col gap-3 p-5 md:p-6", showImage ? "md:col-span-2" : "border-l-4 border-brand")}>
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow text-accent">Top story · {CATEGORY_SHORT[story.primary] ?? "News"}</p>
            <BookmarkButton article={a} bookmarks={bookmarks} className="-mr-2 -mt-1" />
          </div>
          <a href={a.link} target="_blank" rel="noopener noreferrer" className="group">
            <h2 className="text-xl leading-tight text-ink group-hover:text-accent sm:text-2xl">{a.title}</h2>
          </a>
          {story.summary && <p className="text-sm leading-relaxed text-ink-muted">{story.summary}</p>}
          <div className="mt-auto space-y-2">
            <Meta article={a} now={now} />
            <div className="flex flex-wrap items-center gap-2">
              <CoverageToggle story={story} open={open} setOpen={setOpen} />
              <a href={a.link} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-crimson">
                Read at {a.source} <ExternalLink size={12} />
              </a>
            </div>
            {open && <Coverage story={story} now={now} />}
          </div>
        </div>
      </div>
    </article>
  );
}

export function FeaturedSkeleton() {
  return (
    <div className="grid overflow-hidden rounded-2xl border border-line bg-surface md:grid-cols-5">
      <Skel className="aspect-[16/9] rounded-none md:col-span-3 md:aspect-auto md:min-h-[300px]" />
      <div className="space-y-3 p-6 md:col-span-2">
        <Skel className="h-3 w-24" />
        <Skel className="h-6 w-full" />
        <Skel className="h-6 w-4/5" />
        <Skel className="h-3 w-full" />
        <Skel className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function StoryListSkeleton({ rows = 5 }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-4">
          <div className="flex-1 space-y-2"><Skel className="h-2.5 w-16" /><Skel className="h-4 w-full" /><Skel className="h-4 w-3/4" /><Skel className="h-2.5 w-1/3" /></div>
          <Skel className="h-20 w-24 rounded-lg sm:w-36" />
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Feed status ───────────────────────── */

export function FeedStatus({ arsenalNews, worldNews }) {
  const feeds = [...(arsenalNews.data?.feeds ?? [])];
  if (!feeds.length) return null;
  return (
    <details className="text-xs text-ink-muted">
      <summary className="cursor-pointer select-none font-semibold text-ink">
        Sources: {feeds.filter((f) => f.ok).length}/{feeds.length} feeds responding
      </summary>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {feeds.map((f) => (
          <li key={f.id} className="flex items-center gap-2">
            <span className={cx("h-1.5 w-1.5 rounded-full", f.ok ? "bg-emerald-500" : "bg-amber-500")} />
            <span className="font-medium text-ink">{f.name}</span>
            <span>{f.ok ? `${f.count} items` : f.error}</span>
          </li>
        ))}
        {worldNews.data?.feeds?.map((f) => (
          <li key={"w" + f.id} className="flex items-center gap-2">
            <span className={cx("h-1.5 w-1.5 rounded-full", f.ok ? "bg-emerald-500" : "bg-amber-500")} />
            <span className="font-medium text-ink">ESPN {f.id === "pl" ? "Premier League" : "Champions League"}</span>
            <span>{f.ok ? `${f.count} items` : f.error}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 leading-relaxed">
        Arsenal.com has no public news feed, so official club items appear only when an article links to arsenal.com directly.
        Credibility labels describe the outlet, not whether a particular claim is true.
      </p>
    </details>
  );
}

/* ───────────────────────── News page ───────────────────────── */

const SOURCE_FILTERS = [
  { id: "all", label: "All sources" },
  { id: "reliable", label: "Reliable & official only" },
  { id: "noopinion", label: "Hide fan opinion" },
];

const passesSourceFilter = (story, f) =>
  f === "all" ? true
    : f === "reliable" ? ["official", "journalist", "reliable"].includes(story.tier)
      : story.tier !== "opinion";

export function NewsPage({ stories, sources, load, bookmarks, prefs, setPrefs, query, setQuery }) {
  const now = useNow();
  const [limit, setLimit] = useState(20);
  const { arsenalNews, worldNews } = sources;
  const cat = prefs.newsCategory ?? "all";
  const sort = prefs.newsSort ?? "recent";
  const srcFilter = prefs.newsSources ?? "all";
  const set = (k) => (v) => { setPrefs((p) => ({ ...p, [k]: v })); setLimit(20); };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stories
      .filter((s) => (cat === "saved" ? false : inCategory(s, cat)))
      .filter((s) => passesSourceFilter(s, srcFilter))
      .filter((s) => !q || s.articles.some((a) => `${a.title} ${a.summary} ${a.source}`.toLowerCase().includes(q)))
      .sort(SORTS[sort].fn);
  }, [stories, cat, sort, srcFilter, query]);

  const counts = useMemo(() => Object.fromEntries(CATEGORIES.map((c) => [c.id, stories.filter((s) => inCategory(s, c.id)).length])), [stories]);
  const savedList = Object.values(bookmarks.saved).sort((a, b) => (b.savedAt > a.savedAt ? 1 : -1));
  const options = [
    ...CATEGORIES.map((c) => ({ ...c, count: counts[c.id] })),
    { id: "saved", label: "Saved", count: savedList.length },
  ];

  const loading = !arsenalNews.data && (arsenalNews.status === "loading");
  const failed = !arsenalNews.data && arsenalNews.status === "error";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-accent">News</p>
            <h1 className="text-2xl text-ink sm:text-3xl">Arsenal news, de-duplicated</h1>
            <p className="mt-1 text-sm text-ink-muted">One card per story, with every outlet that covered it. Labels show how reliable each source is.</p>
          </div>
        </div>
        <Chips options={options} value={cat} onChange={set("newsCategory")} />
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search news"
              aria-label="Search news"
              className="w-full rounded-full border border-line bg-surface py-1.5 pl-8 pr-8 text-sm text-ink placeholder:text-ink-muted focus:border-ink-muted focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted"><X size={14} /></button>
            )}
          </label>
          <Select label="Sort" value={sort} onChange={set("newsSort")} options={Object.entries(SORTS).map(([id, s]) => ({ id, label: s.label }))} />
          <Select value={srcFilter} onChange={set("newsSources")} options={SOURCE_FILTERS} />
        </div>
      </div>

      <StaleBanner source={arsenalNews} onRetry={() => load("arsenalNews")} />

      <Panel className="px-4 sm:px-5">
        {cat === "saved" ? (
          savedList.length ? (
            <ul className="divide-y divide-line">
              {savedList.map((a) => (
                <li key={a.link} className="flex items-center gap-3 py-3">
                  <a href={a.link} target="_blank" rel="noopener noreferrer" className="group min-w-0 flex-1">
                    <p className="font-semibold leading-snug text-ink group-hover:text-accent">{a.title}</p>
                    <p className="text-[11px] text-ink-muted">{a.source} · saved {timeAgo(new Date(a.savedAt), now)}</p>
                  </a>
                  <BookmarkButton article={a} bookmarks={bookmarks} />
                </li>
              ))}
            </ul>
          ) : <EmptyState>Nothing saved yet. Tap the bookmark on any story to keep it here (stored on this device only).</EmptyState>
        ) : loading ? (
          <StoryListSkeleton rows={6} />
        ) : failed ? (
          <ErrorState message={arsenalNews.error} onRetry={() => load("arsenalNews")} />
        ) : filtered.length ? (
          <>
            <div className="divide-y divide-line">
              {filtered.slice(0, limit).map((s) => <StoryRow key={s.id} story={s} bookmarks={bookmarks} now={now} />)}
            </div>
            {filtered.length > limit && (
              <div className="border-t border-line py-3 text-center">
                <button onClick={() => setLimit((l) => l + 20)} className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold hover:bg-surface-2">
                  Show more ({filtered.length - limit})
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState>{query ? `No stories match “${query}”.` : "No stories in this category right now."}</EmptyState>
        )}
      </Panel>

      <FeedStatus arsenalNews={arsenalNews} worldNews={worldNews} />
    </div>
  );
}
