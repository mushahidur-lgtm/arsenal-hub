/**
 * Per-player season statistics from ESPN's athlete stats API.
 *
 * ESPN provides, per season and competition: starts, goals, assists, shots,
 * shots on target, fouls committed/suffered, yellow/red cards, offsides (and
 * goalkeeper numbers for keepers). It does NOT provide minutes, xG/xA, key
 * passes, tackles or interceptions, so none of those are ever shown.
 */
import { TEAM_ID, URLS, competitionOf, fetchJSON, isFriendlySlug } from "./data.js";
import { boundedPut, readJSON, writeJSON } from "./storage.js";
import { FetchError } from "./errors.js";
import { arr, isObj } from "./validate.js";

const KEY = "afc-pstats-v1";
const TTL = 6 * 3600e3;
const PSTATS_MAX = 40; // players whose statistics are kept on this device (oldest dropped first)
const PHOTO_MAX = 150;

const seasonLabel = (season) => {
  const m = String(season?.displayName ?? "").match(/^\d{4}(?:-\d{2,4})?/);
  return m ? m[0] : String(season?.year ?? "");
};

/** ESPN athlete /stats response → { seasons: { [label]: { [ABBR]: number } }, labels } */
export function parsePlayerStats(json) {
  // An empty/absent body just means "no statistics"; any other non-object is a malformed response.
  if (json != null && !isObj(json)) throw new FetchError("Unexpected response format (player statistics)", "data");
  const out = {};
  const labels = {};
  for (const cat of arr(json?.categories).filter(isObj)) {
    const names = arr(cat.names);
    names.forEach((abbr, i) => {
      labels[abbr] = { name: cat.displayNames?.[i] ?? abbr, desc: cat.descriptions?.[i] ?? "", group: cat.displayName };
    });
    for (const row of arr(cat.statistics).filter(isObj)) {
      const season = seasonLabel(row.season);
      if (!season) continue;
      out[season] ??= { _year: row.season?.year ?? 0 };
      names.forEach((abbr, i) => {
        // A missing or non-numeric value stays absent: it is never turned into 0.
        const raw = arr(row.stats)[i];
        const v = raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "") ? NaN : Number(raw);
        if (Number.isFinite(v)) out[season][abbr] = v;
      });
    }
  }
  return { seasons: out, labels };
}

/**
 * All seasons and competitions for one player. Competitions are discovered from
 * the response's own league filter (friendlies excluded), so nothing about which
 * cups exist is hard-coded. Cached for 6h.
 * Returns { competitions: [{slug,name}], data: {slug: {season: {ABBR: n}}}, labels, fetchedAt }.
 */
export async function loadPlayerStats(id, teamId = TEAM_ID) {
  const cacheKey = `${id}@${teamId}`;
  const cache = readJSON(KEY, {});
  const hit = cache[cacheKey];
  if (isObj(hit) && isObj(hit.v) && Number.isFinite(hit.at) && Date.now() - hit.at < TTL) return { ...hit.v, fetchedAt: new Date(hit.at) };

  const first = await fetchJSON(URLS.playerStats(id, teamId));
  const leagueFilter = arr(first?.filters).find((f) => isObj(f) && f.name === "league");
  const defaultLeague = leagueFilter?.value;
  const options = arr(leagueFilter?.options).filter(isObj).filter(
    (o) => !isFriendlySlug(o.value) && !/friendly|emirates_cup|community|charity/i.test(o.value)
  );
  const slugs = [...new Set([defaultLeague, ...options.map((o) => o.value)].filter(Boolean))];
  const nameOf = (slug) => {
    const o = options.find((x) => x.value === slug);
    return o?.shortDisplayName ?? o?.displayValue ?? competitionOf(slug).name;
  };

  const results = await Promise.allSettled(
    slugs.map((slug) => (slug === defaultLeague ? Promise.resolve(first) : fetchJSON(URLS.playerStats(id, teamId, slug))))
  );
  const data = {};
  const labels = {};
  const competitions = [];
  results.forEach((r, i) => {
    if (r.status !== "fulfilled") return;
    const { seasons, labels: l } = parsePlayerStats(r.value);
    // Skip competitions where the player has no recorded numbers at all.
    const has = Object.values(seasons).some((s) => Object.entries(s).some(([k, v]) => k !== "_year" && v > 0));
    if (!has) return;
    data[slugs[i]] = seasons;
    Object.assign(labels, l);
    const known = competitionOf(slugs[i]);
    competitions.push({ slug: slugs[i], name: known.name === "Match" ? nameOf(slugs[i]) : known.name });
  });
  const value = { competitions, data, labels };
  boundedPut(cache, cacheKey, { at: Date.now(), v: value }, PSTATS_MAX);
  writeJSON(KEY, cache);
  return { ...value, fetchedAt: new Date() };
}

/** National-team history (ESPN bio). Optional: returns [] on any failure. */
export async function loadPlayerBio(id) {
  try {
    const j = await fetchJSON(URLS.playerBio(id), { proxy: false, timeoutMs: 8000 });
    return arr(j?.teamHistory).filter(isObj).map((t) => ({ name: t.displayName, seasons: t.seasons, logo: t.logo }));
  } catch {
    return [];
  }
}

const PHOTO_KEY = "afc-photos-v1";

/**
 * A player photo from Wikipedia (Wikimedia Commons licence, credited on the page).
 * Used only when the article is clearly a footballer and, if we know the player's
 * birth year, it matches the article's "(born YYYY)", so a namesake is never shown.
 * Cached for 30 days (misses for 7).
 */
export async function loadPlayerPhoto(name, dob) {
  const cache = readJSON(PHOTO_KEY, {});
  const hit = cache[name];
  if (hit && Date.now() - hit.at < (hit.src ? 30 : 7) * 86400e3) return hit.src ? hit : null;
  const year = dob instanceof Date && !Number.isNaN(dob.getTime()) ? dob.getFullYear() : null;
  let found = null;
  for (const title of [name, `${name} (footballer)`]) {
    try {
      const j = await fetchJSON(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`, { proxy: false, timeoutMs: 8000 });
      if (j?.type !== "standard" || !/footballer|soccer/i.test(j.description ?? "") || !j.thumbnail?.source) continue;
      const born = (j.description.match(/born (\d{4})/) ?? [])[1];
      if (year && born && Number(born) !== year) continue;
      found = { src: j.thumbnail.source, page: j.content_urls?.desktop?.page ?? null };
      break;
    } catch { /* try next title */ }
  }
  boundedPut(cache, name, { at: Date.now(), ...(found ?? {}) }, PHOTO_MAX);
  writeJSON(PHOTO_KEY, cache);
  return found;
}

/** Seasons present in a loaded stats object for the chosen competition ("all" = any), newest first. */
export function seasonsOf(stats, comp = "all") {
  if (!stats) return [];
  const slugs = comp === "all" ? Object.keys(stats.data) : [comp];
  const set = new Map();
  for (const s of slugs) for (const [label, row] of Object.entries(stats.data[s] ?? {})) set.set(label, row._year ?? 0);
  return [...set.entries()].sort((a, b) => b[1] - a[1]).map(([l]) => l);
}

/** One season's numbers for a competition, or summed across all competitions. */
export function seasonLine(stats, season, comp = "all") {
  if (!stats) return null;
  const slugs = comp === "all" ? Object.keys(stats.data) : [comp];
  const rows = slugs.map((s) => stats.data[s]?.[season]).filter(Boolean);
  if (!rows.length) return null;
  const out = {};
  for (const r of rows) for (const [k, v] of Object.entries(r)) if (k !== "_year") out[k] = (out[k] ?? 0) + v;
  return out;
}
