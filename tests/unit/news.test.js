import { describe, expect, it } from "vitest";
import { cleanAuthor, buildStories, clusterArticles, enrichArticle, fanTalk, freshness, inCategory, isArsenalRelevant, pickBriefing, pickFeatured, playerKeys, canonicalUrl, SORTS, fold } from "../../src/lib/news.js";
import { decode, parseDate, parseEspnNews, parseRss2Json, parseRssXml, stripHtml, upgradeImage } from "../../src/lib/feeds.js";
import { outletForUrl } from "../../src/lib/sources.js";
import { NOW, hoursAgo, raw } from "./helpers.js";

const build = (items, ctx = {}) => buildStories(items, { now: NOW, ...ctx });

describe("source credibility", () => {
  it("assigns tiers from the outlet", () => {
    const [bbc, fan] = [raw(), raw({ link: "https://reddit.com/r/Gunners/x", outlet: "reddit", source: "r/Gunners", title: "Arsenal fans react" })].map((r) => enrichArticle(r));
    expect(bbc.tier).toBe("reliable");
    expect(fan.tier).toBe("opinion");
  });
  it("treats any arsenal.com link as official, even when it arrives via another outlet", () => {
    const a = enrichArticle(raw({ link: "https://www.arsenal.com/news/x", outlet: "reddit", source: "r/Gunners" }));
    expect(a.tier).toBe("official");
    expect(a.source).toBe("Arsenal.com");
    expect(a.via).toBe("r/Gunners");
  });
  it("upgrades a reliable outlet to journalist when a known reporter wrote it", () => {
    const a = enrichArticle(raw({ author: "David Ornstein", title: "Arsenal agree deal" }));
    expect(a.tier).toBe("journalist");
    expect(a.journalist).toBe("David Ornstein");
  });
  it("falls back to secondary for unknown outlets", () => {
    expect(enrichArticle(raw({ outlet: "mystery", source: "Mystery" })).tier).toBe("secondary");
  });
  it("records which sources an article is merely citing", () => {
    expect(enrichArticle(raw({ title: "Arsenal want striker, says Fabrizio Romano" })).cites).toContain("Fabrizio Romano");
  });
  it("maps URLs to outlets without false positives", () => {
    expect(outletForUrl("https://www.arsenal.com/news/a")).toBe("arsenal");
    expect(outletForUrl("https://notarsenal.com/news")).toBeNull();
    expect(outletForUrl("not a url")).toBeNull();
    expect(outletForUrl(undefined)).toBeNull();
  });
  it("cleans bylines", () => {
    expect(cleanAuthor("x@y.com (Tom Canton)")).toBe("Tom Canton");
    expect(cleanAuthor("BBC Sport")).toBe("");
    expect(cleanAuthor("by Jane Doe")).toBe("Jane Doe");
    expect(cleanAuthor(undefined)).toBe("");
  });
});

describe("duplicate detection and story grouping", () => {
  it("collapses the same URL (www, trailing slash, case) into one story", () => {
    const stories = build([
      raw({ link: "https://www.bbc.co.uk/sport/x/" }),
      raw({ link: "https://bbc.co.uk/sport/X", id: "2" }),
    ]);
    expect(stories).toHaveLength(1);
    expect(canonicalUrl("https://www.bbc.co.uk/sport/x/")).toBe(canonicalUrl("https://bbc.co.uk/sport/x"));
  });
  it("groups the same event reported by two outlets and counts both outlets", () => {
    const stories = build([
      raw({ title: "Saka signs new Arsenal contract", link: "https://www.bbc.co.uk/1", date: hoursAgo(3) }),
      raw({ title: "Arsenal confirm Saka signs new contract", link: "https://www.theguardian.com/1", outlet: "guardian", source: "The Guardian", date: hoursAgo(2) }),
    ]);
    expect(stories).toHaveLength(1);
    expect(stories[0].outlets.sort()).toEqual(["BBC Sport", "The Guardian"]);
  });
  it("does not merge different events that share only a club or a person", () => {
    const stories = build([
      raw({ title: "Arsenal injury: Saka hamstring scan result", link: "https://www.bbc.co.uk/a" }),
      raw({ title: "Arsenal reach agreement over Saka contract", link: "https://www.theguardian.com/b", outlet: "guardian", source: "The Guardian" }),
    ]);
    expect(stories).toHaveLength(2);
  });
  it("does not merge stories published days apart", () => {
    const stories = build([
      raw({ title: "Arsenal sign new striker Gyokeres deal", link: "https://www.bbc.co.uk/a", date: hoursAgo(1) }),
      raw({ title: "Arsenal sign new striker Gyokeres deal", link: "https://www.theguardian.com/b", outlet: "guardian", source: "The Guardian", date: hoursAgo(24 * 10) }),
    ]);
    expect(stories).toHaveLength(2);
  });
  it("keeps different squad players apart", () => {
    const squad = playerKeys([
      { id: "1", name: "Bukayo Saka", lastName: "Saka" },
      { id: "2", name: "Martin Odegaard", lastName: "Ødegaard" },
    ]);
    const stories = build(
      [
        raw({ title: "Saka injury worry for Arsenal", link: "https://www.bbc.co.uk/a" }),
        raw({ title: "Odegaard injury worry for Arsenal", link: "https://www.theguardian.com/b", outlet: "guardian", source: "The Guardian" }),
      ],
      { players: squad }
    );
    expect(stories).toHaveLength(2);
  });
  it("matches accented names via folding", () => {
    expect(fold("Ødegaard")).toBe("odegaard");
    expect(fold("Gabriel Magalhães")).toBe("gabriel magalhaes");
  });
  it("clusterArticles tolerates articles with no date", () => {
    const a = enrichArticle(raw({ date: null, link: "https://x.test/1", title: "Arsenal news one" }));
    const b = enrichArticle(raw({ date: null, link: "https://x.test/2", title: "Totally different words here" }));
    expect(() => clusterArticles([a, b])).not.toThrow();
  });
});

describe("filtering and relevance", () => {
  it("drops off-topic items from Arsenal feeds but keeps league news in its own scope", () => {
    const stories = build([
      raw({ title: "Chelsea sign midfielder", link: "https://www.bbc.co.uk/off", excerpt: "Nothing relevant" }),
      raw({ title: "Chelsea sign midfielder", link: "https://espn.test/league", scope: "league", outlet: "espn", source: "ESPN" }),
      raw({ title: "Arteta press conference", link: "https://www.bbc.co.uk/on" }),
    ]);
    expect(stories.map((s) => s.lead.link).sort()).toEqual(["https://espn.test/league", "https://www.bbc.co.uk/on"]);
  });
  it("recognises Arsenal relevance by squad name even without the club's name", () => {
    const squad = playerKeys([{ id: "1", name: "Bukayo Saka", lastName: "Saka" }]);
    expect(isArsenalRelevant({ title: "Bukayo Saka scores", excerpt: "" }, { players: squad })).toBe(true);
    expect(isArsenalRelevant({ title: "Someone else scores", excerpt: "" }, { players: squad })).toBe(false);
  });
  it("skips malformed items rather than throwing", () => {
    const stories = build([null, undefined, {}, { title: "no link" }, { link: "https://x.test" }, raw()]);
    expect(stories).toHaveLength(1);
  });
  it("handles articles with an invalid or missing date", () => {
    const stories = build([raw({ date: null, link: "https://www.bbc.co.uk/nodate" }), raw({ date: new Date("x"), link: "https://www.bbc.co.uk/baddate", title: "Arteta update on squad" })]);
    expect(stories.length).toBeGreaterThan(0);
    for (const s of stories) expect(Number.isFinite(s.score)).toBe(true);
  });
  it("category filters", () => {
    const stories = build([
      raw({ title: "Arsenal sign defender in £50m deal", link: "https://www.bbc.co.uk/t" }),
      raw({ title: "Arsenal beat Spurs 2-0 in derby", link: "https://www.theguardian.com/m", outlet: "guardian", source: "The Guardian" }),
      raw({ title: "Premier League table preview", link: "https://espn.test/pl", scope: "league", outlet: "espn", source: "ESPN" }),
    ]);
    const titles = (cat) => stories.filter((s) => inCategory(s, cat)).map((s) => s.lead.title);
    expect(titles("transfer")).toContain("Arsenal sign defender in £50m deal");
    expect(titles("match")).toEqual(["Arsenal beat Spurs 2-0 in derby"]);
    expect(titles("pl")).toContain("Premier League table preview");
    expect(titles("all")).not.toContain("Premier League table preview");
  });
  it("sorts by recency and by relevance", () => {
    const stories = build([
      raw({ title: "Arsenal older story about training", link: "https://www.bbc.co.uk/old", date: hoursAgo(30) }),
      raw({ title: "Arsenal newer story about tactics", link: "https://www.theguardian.com/new", outlet: "guardian", source: "The Guardian", date: hoursAgo(1) }),
    ]);
    expect([...stories].sort(SORTS.recent.fn)[0].lead.link).toContain("new");
    expect([...stories].sort(SORTS.relevant.fn)[0].lead.link).toContain("new");
  });
  it("fan opinion never leads the featured story or the briefing, and is surfaced separately", () => {
    const stories = build([
      raw({ title: "Arsenal fans debate Arteta tactics", link: "https://reddit.test/1", outlet: "reddit", source: "r/Gunners", date: hoursAgo(0.5) }),
      raw({ title: "Arteta gives injury update before Spurs", link: "https://www.bbc.co.uk/inj", date: hoursAgo(5) }),
    ]);
    expect(pickFeatured(stories, NOW).tier).not.toBe("opinion");
    expect(pickBriefing(stories, NOW).every((s) => s.tier !== "opinion")).toBe(true);
    expect(fanTalk(stories)).toHaveLength(1);
  });
  it("briefing returns nothing (not fabricated filler) when there are no stories", () => {
    expect(pickBriefing([], NOW)).toEqual([]);
    expect(pickFeatured([], NOW)).toBeNull();
  });
  it("freshness labels", () => {
    expect(freshness(hoursAgo(1), NOW)).toBe("new");
    expect(freshness(hoursAgo(20), NOW)).toBe("recent");
    expect(freshness(hoursAgo(24 * 4), NOW)).toBe("older");
    expect(freshness(hoursAgo(24 * 30), NOW)).toBe("stale");
    expect(freshness(null, NOW)).toBe("unknown");
  });
});

describe("feed parsing", () => {
  it("parses rss2json items and normalises the UTC date", () => {
    const items = parseRss2Json({ items: [{ title: "Arsenal win", link: "https://x.test/1", pubDate: "2025-01-10 08:30:00", description: "<p>Great <b>win</b></p>" }] }, "bbc");
    expect(items[0].date.toISOString()).toBe("2025-01-10T08:30:00.000Z");
    expect(items[0].excerpt).toBe("Great win");
    expect(items[0].source).toBe("BBC Sport");
  });
  it.each([null, undefined, {}, { items: null }, { items: "x" }])("parseRss2Json(%j) reports an unexpected structure", (input) => {
    expect(() => parseRss2Json(input, "bbc")).toThrow(/Unexpected response format/);
  });
  it("an empty items array is a valid, empty feed", () => {
    expect(parseRss2Json({ items: [] }, "bbc")).toEqual([]);
  });
  it("gives null for unparseable or missing publication dates", () => {
    expect(parseDate("not a date")).toBeNull();
    expect(parseDate("")).toBeNull();
    expect(parseDate(undefined)).toBeNull();
    expect(parseDate("Fri, 10 Jan 2025 08:30:00 GMT").toISOString()).toBe("2025-01-10T08:30:00.000Z");
  });
  it("parses raw RSS XML and rejects malformed XML", () => {
    const xml = `<?xml version="1.0"?><rss><channel><item><title>Arsenal v Spurs</title><link>https://x.test/a</link><pubDate>Fri, 10 Jan 2025 08:30:00 GMT</pubDate><description>Preview</description></item></channel></rss>`;
    const items = parseRssXml(xml, "bbc");
    expect(items).toHaveLength(1);
    expect(items[0].link).toBe("https://x.test/a");
    expect(() => parseRssXml("<rss><item>", "bbc")).toThrow(/parsed/);
  });
  it("parses Atom entries and empty feeds", () => {
    const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Gunners post</title><link href="https://x.test/p"/><published>2025-01-10T08:30:00Z</published></entry></feed>`;
    expect(parseRssXml(atom, "reddit")[0].link).toBe("https://x.test/p");
    expect(parseRssXml("<rss><channel></channel></rss>", "bbc")).toEqual([]);
  });
  it("unwraps r/Gunners link posts to the real article", () => {
    const html = '<a href="https://www.arsenal.com/news/z">[link]</a>';
    const items = parseRss2Json({ items: [{ title: "Official news", link: "https://reddit.com/r/Gunners/c/1", pubDate: "2025-01-10 08:30:00", content: html }] }, "reddit");
    expect(items[0].link).toBe("https://www.arsenal.com/news/z");
    expect(items[0].discussion).toBe("https://reddit.com/r/Gunners/c/1");
  });
  it("parses ESPN news and tolerates missing fields", () => {
    const items = parseEspnNews({ articles: [{ id: 1, headline: "H", links: { web: { href: "https://espn.test/1" } }, published: "2025-01-10T08:30:00Z" }, { headline: "No link" }] });
    expect(items[0]).toMatchObject({ title: "H", link: "https://espn.test/1", source: "ESPN" });
    expect(items).toHaveLength(1); // an article with no web link can't be linked to, so it is skipped
    expect(() => parseEspnNews(null)).toThrow(/Unexpected response format/);
    expect(parseEspnNews({ articles: [] })).toEqual([]);
  });
  it("decodes entities and strips HTML", () => {
    expect(decode("Ben White&rsquo;s &amp; &#163;50m &#x2014;")).toBe("Ben White’s & £50m —");
    expect(stripHtml("<p>a&nbsp;<b>b</b></p>")).toBe("a b");
    expect(upgradeImage("https://ichef.bbci.co.uk/ace/standard/240/x.jpg")).toContain("/800/");
    expect(upgradeImage(null)).toBeNull();
  });
});
