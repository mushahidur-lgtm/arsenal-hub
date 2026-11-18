/**
 * Small localStorage helpers. Storage can be unavailable (private mode,
 * blocked site data), so every access is guarded and the app works without it.
 */
import { useCallback, useEffect, useState } from "react";

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
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
  const prev = readJSON(ARCHIVE_KEY, []).map((i) => ({
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
