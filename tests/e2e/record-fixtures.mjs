/**
 * Re-records the *real* public API responses the e2e suite replays offline.
 *   node tests/e2e/record-fixtures.mjs
 * Nothing here is hand-written data: responses are saved as returned by the providers
 * (only trimmed in size). The capture time is stored so the tests can freeze the clock to it.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
await mkdir(out, { recursive: true });

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const WEB = "https://site.web.api.espn.com/apis";
const get = async (url, as = "json") => {
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (fixture recorder)" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return as === "text" ? res.text() : res.json();
};
const save = (name, data) => writeFile(join(out, name), typeof data === "string" ? data : JSON.stringify(data));
const tryGet = async (name, url, as, trim) => {
  try {
    let d = await get(url, as);
    if (trim) d = trim(d);
    await save(name, d);
    console.log("ok  ", name);
    return d;
  } catch (e) {
    console.log("FAIL", name, e.message);
    return null;
  }
};

const schedule = await tryGet("schedule.json", `${ESPN}/all/teams/359/schedule`);
await tryGet("schedule-fixtures.json", `${ESPN}/all/teams/359/schedule?fixture=true`);
await tryGet("roster.json", `${ESPN}/eng.1/teams/359/roster`);
await tryGet("standings.json", `${WEB}/v2/sports/soccer/eng.1/standings`);
await tryGet("women-roster.json", `${ESPN}/eng.w.1/teams/19973/roster`);
await tryGet("women-schedule.json", `${ESPN}/all/teams/19973/schedule`);
await tryGet("women-schedule-fixtures.json", `${ESPN}/all/teams/19973/schedule?fixture=true`);
await tryGet("women-standings.json", `${WEB}/v2/sports/soccer/eng.w.1/standings`);
await tryGet("espn-news-arsenal.json", `${ESPN}/eng.1/news?team=359`);
await tryGet("espn-news-pl.json", `${ESPN}/eng.1/news`);
await tryGet("espn-news-ucl.json", `${ESPN}/uefa.champions/news`);
await tryGet("feed-bbc.xml", "https://feeds.bbci.co.uk/sport/football/teams/arsenal/rss.xml", "text");
await tryGet("feed-guardian.xml", "https://www.theguardian.com/football/arsenal/rss", "text");
await tryGet("feed-sky.xml", "https://www.skysports.com/rss/11670", "text");

// A finished Arsenal match for the match-detail page.
const done = (schedule?.events ?? []).filter((e) => e.competitions?.[0]?.status?.type?.state === "post").sort((a, b) => new Date(b.date) - new Date(a.date))[0];
if (done) {
  const slug = done.league?.slug ?? "all";
  await tryGet("summary.json", `${ESPN}/${slug}/summary?event=${done.id}`);
  await save("summary-meta.json", { id: done.id, slug });
}
// Season stats for a few players (default league + each competition the response lists),
// saved as stats-<id>-<league|default>.json. One goalkeeper is included on purpose: his stats
// differ from outfield players', which exercises the "missing statistic" paths.
const roster = JSON.parse(await (await import("node:fs/promises")).readFile(join(out, "roster.json"), "utf8"));
const pick = [
  roster.athletes.find((a) => /^F/.test(a.position?.abbreviation ?? "")),
  roster.athletes.find((a) => /^M/.test(a.position?.abbreviation ?? "")),
  roster.athletes.find((a) => /^G/.test(a.position?.abbreviation ?? "")),
].filter(Boolean);
for (const a of pick) {
  const base = `${WEB}/common/v3/sports/soccer/athletes/${a.id}/stats?team=359`;
  const first = await tryGet(`stats-${a.id}-default.json`, base);
  const leagues = (first?.filters ?? []).find((f) => f.name === "league")?.options ?? [];
  for (const o of leagues) await tryGet(`stats-${a.id}-${o.value}.json`, `${base}&league=${o.value}`);
}
await save("stats-players.json", pick.map((a) => ({ id: a.id, name: a.displayName, position: a.position?.abbreviation })));
await save("captured-at.json", { at: new Date().toISOString() });
console.log("captured", new Date().toISOString());
