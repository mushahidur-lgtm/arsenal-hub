import { beforeEach, describe, expect, it } from "vitest";
import { parseEvent, parseRoster, parseSchedules, parseStandings, parseSummary, parseTeam } from "../../src/lib/parsers.js";
import { parsePlayerStats, seasonLine } from "../../src/lib/playerstats.js";
import { parseEspnNews, parseRss2Json, parseRssXml } from "../../src/lib/feeds.js";
import { FetchError } from "../../src/lib/errors.js";
import { getDiagnostics, resetDiagnostics } from "../../src/lib/diagnostics.js";
import { arr, date, expectArray, expectObject, num, str } from "../../src/lib/validate.js";
import { espnEvent } from "./helpers.js";

beforeEach(() => resetDiagnostics());

describe("validation helpers", () => {
  it("num: finite numbers only; blank, boolean and non-numeric are null, never 0", () => {
    for (const bad of [null, undefined, "", "   ", "abc", NaN, Infinity, true, false, {}, []]) expect(num(bad), String(bad)).toBeNull();
    expect(num("3")).toBe(3);
    expect(num({ value: 4 })).toBe(4);
    expect(num({ displayValue: "5" })).toBe(5);
    expect(num(0)).toBe(0); // a real zero stays a zero
  });
  it("date: valid Date or null", () => {
    expect(date("2025-01-01T00:00:00Z")).toBeInstanceOf(Date);
    for (const bad of [null, undefined, "", "nope", new Date("x"), {}]) expect(date(bad), String(bad)).toBeNull();
  });
  it("str / arr", () => {
    expect(str("x")).toBe("x");
    expect(str(12)).toBe("12");
    for (const bad of [null, undefined, "", "  ", {}, [], NaN]) expect(str(bad)).toBeNull();
    expect(arr("x")).toEqual([]);
    expect(arr([1])).toEqual([1]);
  });
  it("expectObject / expectArray raise a classified data error", () => {
    for (const fn of [() => expectObject([], "x"), () => expectObject(null, "x"), () => expectArray({}, "x")]) {
      try { fn(); throw new Error("did not throw"); } catch (e) { expect(e).toBeInstanceOf(FetchError); expect(e.kind).toBe("data"); }
    }
  });
});

describe("fixtures: unexpected ESPN shapes", () => {
  it("parseEvent returns null for records it can't use and never throws", () => {
    for (const bad of [null, undefined, "x", 5, [], {}, { date: "2025-01-01" }]) expect(parseEvent(bad), JSON.stringify(bad)).toBeNull();
  });
  it("tolerates missing nested ESPN properties", () => {
    const e = { id: 7, date: "2025-03-01T15:00:00Z", competitions: [{ competitors: [{ team: {} }, { team: { id: 359 } }] }] };
    const m = parseEvent(e);
    expect(m).toMatchObject({ id: "7", state: "pre", venue: null, statusDetail: null, result: null });
    expect(m.home.name).toBe("TBD");
    expect(m.home.score).toBeNull();
  });
  it("competitions / competitors of the wrong type are treated as empty", () => {
    expect(() => parseEvent({ id: 1, date: "2025-03-01T15:00:00Z", competitions: "x" })).not.toThrow();
    expect(() => parseEvent({ id: 1, date: "2025-03-01T15:00:00Z", competitions: [{ competitors: { a: 1 } }] })).not.toThrow();
    expect(parseEvent({ id: 1, date: "2025-03-01T15:00:00Z", competitions: [{ competitors: null }] }).sideCount).toBe(0);
  });
  it("an unknown status state defaults to 'pre' rather than propagating junk", () => {
    expect(parseEvent(espnEvent({ state: "weird" })).state).toBe("pre");
  });
  it("invalid match dates: events are skipped and counted, valid ones survive", () => {
    const events = [espnEvent({ id: "a", date: "not-a-date" }), espnEvent({ id: "b", date: null }), espnEvent({ id: "c", date: 12345678901234567890 }), espnEvent({ id: "ok", date: "2025-03-01T15:00:00Z" })];
    const out = parseSchedules([{ events }]);
    expect(out.results.map((m) => m.id).concat(out.fixtures.map((m) => m.id))).toEqual(["ok"]);
    expect(out.dropped).toBe(3);
    expect(getDiagnostics().dropped.schedule).toBe(3);
  });
  it("skips events with no id or fewer than two teams, keeps the rest", () => {
    const noTeams = { id: "x", date: "2025-03-01T15:00:00Z", competitions: [{ competitors: [] }] };
    const out = parseSchedules([{ events: [noTeams, { date: "2025-03-01T15:00:00Z" }, null, espnEvent({ id: "ok" })] }]);
    expect(out.results.map((m) => m.id)).toEqual(["ok"]);
    expect(out.dropped).toBe(3);
  });
  it("dates are always real Dates on everything that survives", () => {
    const out = parseSchedules([{ events: [espnEvent({ id: "1" }), espnEvent({ id: "2", state: "pre", date: "2025-04-01T12:00Z" })] }]);
    for (const m of [...out.results, ...out.fixtures]) expect(Number.isNaN(m.date.getTime())).toBe(false);
  });
});

describe("squad and player information", () => {
  const ath = (over) => ({ id: "1", displayName: "A Player", position: { abbreviation: "M" }, ...over });
  it("skips athletes with no id or name, keeps the others", () => {
    const { players } = parseRoster({ athletes: [ath(), { displayName: "No id" }, { id: "9" }, null, "x", ath({ id: "2", displayName: "B" })] });
    expect(players.map((p) => p.id)).toEqual(["1", "2"]);
    expect(getDiagnostics().dropped.roster).toBe(4);
  });
  it("numeric strings become numbers; junk becomes null, never 0 or NaN", () => {
    const [p] = parseRoster({ athletes: [ath({ age: "27", dateOfBirth: "not a date", jersey: 8, displayHeight: "", displayWeight: undefined })] }).players;
    expect(p.age).toBe(27);
    expect(parseRoster({ athletes: [ath({ age: "abc" })] }).players[0].age).toBeNull();
    expect(parseRoster({ athletes: [ath({ age: "" })] }).players[0].age).toBeNull();
    expect(p.dob).toBeNull();
    expect(p.jersey).toBe("8");
    expect(p.height).toBeNull();
    expect(p.weight).toBeNull();
  });
  it("a missing position is 'Other', not a guessed position", () => {
    expect(parseRoster({ athletes: [ath({ position: undefined })] }).players[0]).toMatchObject({ group: "Other", position: "" });
    expect(parseRoster({ athletes: [ath({ position: {} })] }).players[0].group).toBe("Other");
  });
  it("wrongly-typed nested data doesn't throw", () => {
    const weird = ath({ statistics: "x", links: "x", birthPlace: "x", headshot: 5, flag: [], injuries: "x" });
    expect(() => parseRoster({ athletes: [weird] })).not.toThrow();
    const p = parseRoster({ athletes: [weird] }).players[0];
    expect(p.stats).toEqual({});
    expect(p.photo).toBeNull();
    expect(p.availability.key).toBe("unknown");
  });
});

describe("league standings", () => {
  const entry = (id, stats) => ({ team: { id, displayName: `T${id}` }, stats });
  it("skips entries without a team id and keeps missing columns undefined, never 0", () => {
    const { rows } = parseStandings({ children: [{ standings: { entries: [entry(1, [{ name: "rank", value: 1 }, { name: "points", value: "n/a" }]), { stats: [] }, null, entry(2, "x")] } }] });
    expect(rows.map((r) => r.id)).toEqual(["1", "2"]);
    expect(rows[0].pts).toBeUndefined();
    expect(rows[0].gp).toBeUndefined();
    expect(getDiagnostics().dropped.standings).toBe(2);
  });
  it("accepts numeric strings in displayValue", () => {
    const { rows } = parseStandings({ standings: { entries: [entry(1, [{ name: "points", displayValue: "27" }])] } });
    expect(rows[0].pts).toBe(27);
  });
});

describe("match details", () => {
  it("rejects a non-object; tolerates every optional part being wrong", () => {
    for (const bad of [null, "x", []]) expect(() => parseSummary(bad)).toThrow(/Unexpected response format/);
    const out = parseSummary({ boxscore: { teams: "x" }, rosters: {}, keyEvents: "x", leaders: 5, header: [] });
    expect(out).toMatchObject({ stats: [], lineups: [], events: [], leaders: [] });
  });
  it("team stats that aren't numeric are left out rather than shown as zero", () => {
    const team = (id, v) => ({ team: { id }, statistics: [{ name: "possessionPct", displayValue: v }, { name: "totalShots", displayValue: "4" }] });
    const out = parseSummary({ boxscore: { teams: [team("1", "n/a"), team("2", "40")] } });
    expect(out.stats.map((s) => s.key)).toEqual(["totalShots"]);
  });
  it("skips malformed events and roster entries", () => {
    const out = parseSummary({
      keyEvents: [null, "x", { scoringPlay: true, clock: { displayValue: "5'" }, team: { id: 1 }, participants: [{ athlete: { displayName: "Scorer" } }] }, { type: { type: "unknown" } }],
      rosters: [{ team: { id: 1 }, roster: [null, { starter: true }, { starter: true, athlete: { id: 9, displayName: "P" } }] }],
    });
    expect(out.events).toHaveLength(1);
    expect(out.events[0]).toMatchObject({ kind: "goal", primary: "Scorer", minute: "5'" });
    expect(out.lineups[0].starters).toHaveLength(1);
  });
  it("parseTeam rejects non-objects and tolerates a bare object", () => {
    expect(() => parseTeam(null)).toThrow(/Unexpected response format/);
    expect(parseTeam({})).toMatchObject({ name: null, record: null });
  });
});

describe("player statistics: missing values are never zero", () => {
  const json = (stats) => ({ categories: [{ displayName: "G", names: ["GP", "G", "A"], statistics: [{ season: { year: 2024, displayName: "2024-25" }, stats }] }] });
  it.each([[["10", "-", "5"]], [["10", "", "5"]], [["10", null, "5"]], [["10", "n/a", "5"]], [["10", undefined, "5"]], [["10", {}, "5"]]])("%j leaves G absent", (stats) => {
    const { seasons } = parsePlayerStats(json(stats));
    expect(seasons["2024-25"]).not.toHaveProperty("G");
    expect(seasons["2024-25"].GP).toBe(10);
  });
  it("a genuine 0 is kept", () => {
    expect(parsePlayerStats(json(["10", "0", "5"])).seasons["2024-25"].G).toBe(0);
  });
  it("shorter stats arrays and wrong types don't throw", () => {
    expect(() => parsePlayerStats(json(["10"]))).not.toThrow();
    expect(() => parsePlayerStats({ categories: [null, { names: "x", statistics: "x" }, { names: ["A"], statistics: [null, { season: {} }] }] })).not.toThrow();
  });
  it("rejects a non-object body but treats an empty body as 'no statistics'", () => {
    for (const bad of ["x", 5, []]) expect(() => parsePlayerStats(bad)).toThrow(/Unexpected response format/);
    expect(parsePlayerStats(null)).toEqual({ seasons: {}, labels: {} });
    expect(parsePlayerStats({})).toEqual({ seasons: {}, labels: {} });
  });
  it("seasonLine doesn't invent a stat for a competition that lacks it", () => {
    const stats = { data: { a: { s: { _year: 1, G: 2 } }, b: { s: { _year: 1, A: 1 } } } };
    expect(seasonLine(stats, "s", "all")).toEqual({ G: 2, A: 1 });
    expect(seasonLine(stats, "s", "b")).toEqual({ A: 1 });
  });
});

describe("RSS parsing failures", () => {
  const rssItem = (over = {}) => ({ title: "Arsenal win", link: "https://x.test/1", pubDate: "2025-01-10 08:30:00", description: "d", ...over });
  it("rss2json: skips items without a title or link; keeps the rest", () => {
    const out = parseRss2Json({ items: [rssItem(), rssItem({ title: "" }), rssItem({ link: undefined }), null, "x", rssItem({ link: "https://x.test/2" })] }, "bbc");
    expect(out.map((i) => i.link)).toEqual(["https://x.test/1", "https://x.test/2"]);
    expect(getDiagnostics().dropped.rss).toBe(4);
  });
  it("rss2json: odd field types don't throw and don't invent values", () => {
    const [i] = parseRss2Json({ items: [rssItem({ enclosure: "x", thumbnail: 5, author: {}, guid: null, pubDate: "garbage" })] }, "bbc");
    expect(i.date).toBeNull();
    expect(i.author).toBe("");
  });
  it.each([[""], ["   "], [null], [undefined], [42]])("raw XML: %j is rejected as empty", (xml) => {
    expect(() => parseRssXml(xml, "bbc")).toThrow(/Feed was empty/);
  });
  it("raw XML: malformed XML is a data error", () => {
    for (const bad of ["<rss><item>", "<rss><channel><item></channel>", "not xml at all"]) {
      try { parseRssXml(bad, "bbc"); throw new Error("did not throw"); } catch (e) { expect(e).toBeInstanceOf(FetchError); expect(e.kind).toBe("data"); }
    }
  });
  it("raw XML: a well-formed document that isn't a feed (e.g. an HTML error page) is rejected", () => {
    expect(() => parseRssXml("<html><body><h1>Error 502</h1></body></html>", "bbc")).toThrow(/not an RSS or Atom feed/);
    expect(() => parseRssXml("<?xml version='1.0'?><error>nope</error>", "bbc")).toThrow(/not an RSS or Atom feed/);
  });
  it("raw XML: items without a title or link are skipped; an empty channel is valid", () => {
    const xml = "<rss><channel><item><title>Ok</title><link>https://x.test/a</link></item><item><title></title><link>https://x.test/b</link></item><item><title>No link</title></item></channel></rss>";
    expect(parseRssXml(xml, "bbc").map((i) => i.link)).toEqual(["https://x.test/a"]);
    expect(parseRssXml("<rss><channel></channel></rss>", "bbc")).toEqual([]);
  });
  it("ESPN news: wrong structure throws; incomplete articles are skipped and counted", () => {
    for (const bad of [null, [], {}, { articles: {} }]) expect(() => parseEspnNews(bad)).toThrow(/Unexpected response format/);
    const out = parseEspnNews({ articles: [{ headline: "H", links: { web: { href: "https://e.test/1" } } }, { headline: "no link" }, { links: { web: { href: "https://e.test/2" } } }, null] });
    expect(out).toHaveLength(1);
    expect(getDiagnostics().dropped["espn-news"]).toBe(3);
  });
});
