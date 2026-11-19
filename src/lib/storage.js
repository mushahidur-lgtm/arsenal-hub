/**
 * Small localStorage helpers. Storage can be unavailable (private mode,
 * blocked site data), so every access is guarded and the app works without it.
 */
import { useCallback, useEffect, useState } from "react";

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** True when `value` has the same basic shape as `fallback` (array / object / primitive). */
function sameShape(value, fallback) {
  if (Array.isArray(fallback)) return Array.isArray(value);
  if (isPlainObject(fallback)) return isPlainObject(value);
  if (fallback === null || fallback === undefined) return true;
  return typeof value === typeof fallback;
}

/**
 * Reads and parses a stored value. Anything unusable (missing, unparseable, or a
 * different shape than the caller expects, e.g. `null` or a string where an
 * object is needed) yields `fallback`, so corrupted storage can never crash a hook.
 */
export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    return sameShape(parsed, fallback) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

/** useState that survives reloads. */
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => readJSON(key, initial));
  useEffect(() => writeJSON(key, value), [key, value]);
  return [value, setValue];
}

/** Saved articles: { [link]: { title, link, source, date, image, savedAt } } */
export function useBookmarks() {
  const [saved, setSaved] = usePersistentState("afc-saved-v1", {});
  const toggle = useCallback((a) => {
    setSaved((s) => {
      const next = { ...s };
      if (next[a.link]) delete next[a.link];
      else next[a.link] = { title: a.title, link: a.link, source: a.source, date: a.date, image: a.image, savedAt: new Date().toISOString() };
      return next;
    });
  }, [setSaved]);
  const has = useCallback((link) => !!saved[link], [saved]);
  return { saved, toggle, has };
}

const ARCHIVE_KEY = "afc-news-archive-v1";
const ARCHIVE_DAYS = 21;
const ARCHIVE_MAX = 400;

/**
 * Feeds only carry their latest ~10 items, so stories seen on earlier visits
 * are kept on this device for a few weeks. This gives the transfer tracker and
 * news search a longer memory than any single feed.
 */
export function mergeWithArchive(items) {
  const cutoff = Date.now() - ARCHIVE_DAYS * 86400e3;
  const prev = readJSON(ARCHIVE_KEY, []).filter(isPlainObject).map((i) => ({
    ...i,
    date: i.date ? new Date(i.date) : null,
    updated: i.updated ? new Date(i.updated) : null,
    image: i.image ? i.image.replace(/&amp;/g, "&") : null,
  }));
  const byLink = new Map();
  for (const i of prev) if (i.link && i.date && i.date.getTime() > cutoff) byLink.set(i.link, { ...i, archived: true });
  for (const i of items) if (i.link) byLink.set(i.link, i); // fresh copy wins
  const merged = [...byLink.values()].sort((a, b) => (b.date ?? 0) - (a.date ?? 0)).slice(0, ARCHIVE_MAX);
  writeJSON(ARCHIVE_KEY, merged.map(({ archived, ...rest }) => rest));
  return merged;
}

/* ───────────────────────── Personal data (this device only) ───────────────────────── */

/** Players the user follows across the site: { [playerId]: { name, team, savedAt } } */
export function useSavedPlayers() {
  const [saved, setSaved] = usePersistentState("afc-players-v1", {});
  const toggle = useCallback((p) => {
    setSaved((s) => {
      const next = { ...s };
      if (next[p.id]) delete next[p.id];
      else next[p.id] = { name: p.name, team: p.team ?? "men", savedAt: new Date().toISOString() };
      return next;
    });
  }, [setSaved]);
  return { saved, toggle, has: (id) => !!saved[id] };
}

/**
 * Transfer watchlist: { [subjectKey]: { name, addedAt, status, seen: [links] } }.
 * `status` and `seen` are the snapshot from the last time the user looked, so the
 * Watchlist can say "status changed since you last checked" and flag new reports.
 */
export function useWatchlist() {
  const [list, setList] = usePersistentState("afc-watchlist-v1", {});
  const add = useCallback((entry) => {
    setList((l) => (l[entry.key] ? l : {
      ...l,
      [entry.key]: { name: entry.name, addedAt: new Date().toISOString(), status: entry.status, seen: entry.links },
    }));
  }, [setList]);
  const remove = useCallback((key) => setList((l) => { const n = { ...l }; delete n[key]; return n; }), [setList]);
  const markSeen = useCallback((entry) => {
    setList((l) => (l[entry.key] ? { ...l, [entry.key]: { ...l[entry.key], status: entry.status, seen: entry.links, checkedAt: new Date().toISOString() } } : l));
  }, [setList]);
  return { list, add, remove, markSeen, has: (key) => !!list[key] };
}

/** Fan predictions: { [matchId]: { result, home, away, scorer, madeAt, label } } — opinions, never forecasts. */
export function usePredictions() {
  const [preds, setPreds] = usePersistentState("afc-predictions-v1", {});
  const save = useCallback((id, p) => setPreds((s) => ({ ...s, [id]: { ...p, madeAt: new Date().toISOString() } })), [setPreds]);
  const clear = useCallback((id) => setPreds((s) => { const n = { ...s }; delete n[id]; return n; }), [setPreds]);
  return { preds, save, clear };
}

/** Recently opened pages (players, matches, stories): newest first, capped. */
export function useRecents() {
  const [recents, setRecents] = usePersistentState("afc-recents-v1", []);
  const push = useCallback((item) => {
    setRecents((r) => (r[0]?.href === item.href ? r : [{ ...item, at: new Date().toISOString() }, ...r.filter((x) => x.href !== item.href)].slice(0, 12)));
  }, [setRecents]);
  const clear = useCallback(() => setRecents([]), [setRecents]);
  return { recents, push, clear };
}
