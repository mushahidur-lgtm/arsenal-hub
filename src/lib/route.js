/**
 * Hash routing. The whole app lives behind `#/…` so it works on a static host (GitHub Pages)
 * without server rewrites, and every deep link survives a refresh.
 *
 *   #/                       home            #/?tab=transfers      a home tab
 *   #/news?cat=injury        news            #/squad/player/123    a player ("?team=women")
 *   #/matches/401879232      a match         #/analysis?a=1&b=2    comparison
 */
export const PAGES = ["home", "news", "matches", "transfers", "squad", "analysis", "history"];

// Tab ids from earlier versions of the site
const LEGACY = new Map([["overview", "home"], ["fixtures", "matches"], ["stats", "matches"]]); // a Map, so "#/constructor" or "#/__proto__" can't resolve to an Object.prototype member

// A hand-typed or truncated link such as #/%E0%A4%A is not valid percent-encoding;
// decodeURIComponent would throw and blank the whole app, so keep the raw segment instead.
const safeDecode = (p) => {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
};

/** "#/squad/player/1?team=women" → { page: "squad", parts: ["player", "1"], query: URLSearchParams }. Never throws. */
export function parseHash(hash = "") {
  const raw = String(hash ?? "").replace(/^#\/?/, "");
  const q = raw.indexOf("?");
  const path = q === -1 ? raw : raw.slice(0, q);
  const qs = q === -1 ? "" : raw.slice(q + 1);
  const parts = path.split("/").filter(Boolean).map(safeDecode);
  const first = parts[0] ?? "";
  const page = LEGACY.get(first) ?? (PAGES.includes(first) ? first : "home");
  return { page, parts: parts.slice(1), query: new URLSearchParams(qs) };
}

/** The hash for a home tab ("today" is the bare home route). */
export const homeTabHash = (tab) => (tab === "today" ? "#/" : `#/?tab=${tab}`);
