import { describe, expect, it } from "vitest";
import { buildStories, playerKeys } from "../../src/lib/news.js";
import { STATUSES, articleLevel, buildTransfers, candidateNames, isDenial, namesToLookUp, subjectKey, timelineOf, windowInfo } from "../../src/lib/transfers.js";
import { NOW, hoursAgo, raw } from "./helpers.js";

const squadPlayers = [
  { id: "1", name: "Bukayo Saka", lastName: "Saka", position: "Forward", group: "Forwards", age: 23 },
  { id: "2", name: "William Saliba", lastName: "Saliba", position: "Defender", group: "Defenders", age: 24 },
];
const squad = playerKeys(squadPlayers);
const outlet = (id, name, tier) => ({ outlet: id, source: name });
const BBC = outlet("bbc", "BBC Sport");
const GUARDIAN = outlet("guardian", "The Guardian");
const FL = outlet("fl", "football.london");

const transfers = (items, ctx = {}) => buildTransfers(buildStories(items, { now: NOW, players: squad }), { squad, ...ctx });
let n = 0;
const art = (title, over = {}) => raw({ title, link: `https://example.test/${++n}`, ...over });

describe("article certainty", () => {
  const level = (title, over = {}) => articleLevel({ ...enrich(title, over) });
  function enrich(title, over) {
    const [s] = buildStories([art(title, over)], { now: NOW });
    return s.lead;
  }
  it("ranks wording from mention to completion", () => {
    expect(level("Arsenal monitor striker")).toBe(2);
    expect(level("Arsenal interested in striker Gyokeres")).toBe(3);
    expect(level("Arsenal submit bid for striker Gyokeres")).toBe(4);
    expect(level("Arsenal in advanced talks for Gyokeres")).toBe(5);
    expect(level("Arsenal complete signing of Gyokeres")).toBe(6);
  });
  it("downgrades hedged and quoted reports", () => {
    expect(level("Arsenal could complete signing of Gyokeres")).toBeLessThanOrEqual(3);
    expect(level("Arsenal 'agree deal' for striker")).toBeLessThanOrEqual(3);
  });
  it("caps what a secondary site or fan opinion can claim", () => {
    expect(level("Arsenal complete signing of Gyokeres", FL)).toBe(3);
    expect(level("Arsenal complete signing of Gyokeres", { outlet: "reddit", source: "r/Gunners" })).toBe(1);
  });
  it("treats denials as non-evidence", () => {
    expect(level("Arsenal dismiss Gyokeres transfer talk")).toBe(1);
    expect(isDenial({ title: "Saka not for sale, says Arsenal" })).toBe(true);
    expect(isDenial({ title: "Arsenal bid for Saka" })).toBe(false);
  });
});

describe("transfer entries", () => {
  it("never reports confirmed from a single reliable outlet", () => {
    const [e] = transfers([art("Arsenal complete signing of Bukayo Saka new deal", BBC)]);
    expect(e.status).toBe("done");
    expect(STATUSES[e.status].label).toBe("Reported complete");
  });
  it("confirms when two independent reliable outlets report completion", () => {
    const [e] = transfers([
      art("Arsenal complete signing of Viktor Gyokeres", { ...BBC, date: hoursAgo(3) }),
      art("Viktor Gyokeres signs for Arsenal", { ...GUARDIAN, date: hoursAgo(2) }),
    ], { lookups: { "viktor gyokeres": { name: "Viktor Gyokeres", club: "Sporting" } } });
    expect(e.status).toBe("confirmed");
    expect(e.player?.club).toBe("Sporting");
  });
  it("confirms from an official club announcement", () => {
    const [e] = transfers([art("Arsenal complete signing of Gyokeres", { link: "https://www.arsenal.com/news/gyokeres", outlet: "arsenal", source: "Arsenal.com" })]);
    expect(e.status).toBe("confirmed");
  });
  it("does not count a citing outlet as independent confirmation", () => {
    const [e] = transfers([
      art("Arsenal complete signing of Viktor Gyokeres", { ...BBC, date: hoursAgo(3) }),
      art("Arsenal sign Gyokeres, says Fabrizio Romano", { ...GUARDIAN, date: hoursAgo(2) }),
    ]);
    expect(e.status).not.toBe("confirmed");
  });
  it("marks a storyline dismissed when the latest report is a denial", () => {
    const [e] = transfers([
      art("Arsenal submit bid for Gyokeres", { ...BBC, date: hoursAgo(20) }),
      art("Arsenal dismiss Gyokeres transfer talk", { ...BBC, date: hoursAgo(2) }),
    ]);
    expect(e.status).toBe("dismissed");
  });
  it("does not dismiss a transfer that already reached 'complete'", () => {
    const [e] = transfers([
      art("Arsenal complete signing of Gyokeres", { ...BBC, date: hoursAgo(20) }),
      art("Arsenal dismiss Gyokeres rumour", { ...BBC, date: hoursAgo(2) }),
    ]);
    expect(e.status).not.toBe("dismissed");
  });
  it("only builds a player card when the player is known; otherwise stays a story with no invented club/fee", () => {
    const [e] = transfers([art("Arsenal submit bid for mystery striker", BBC)]);
    expect(e.player).toBeNull();
    expect(e.fee).toBeNull();
    expect(e.contract).toBeNull();
  });
  it("only states a fee or contract length when the reporting does", () => {
    const [withFee] = transfers([art("Arsenal submit £65m bid for Viktor Gyokeres", BBC)], { lookups: { "viktor gyokeres": { name: "Viktor Gyokeres" } } });
    expect(withFee.fee).toEqual({ text: "£65m", source: "BBC Sport" });
    const [noFee] = transfers([art("Arsenal submit bid for Viktor Gyokeres", GUARDIAN)], { lookups: { "viktor gyokeres": { name: "Viktor Gyokeres" } } });
    expect(noFee.fee).toBeNull();
  });
  it("treats unknown club/age/position as null, not guessed", () => {
    const [e] = transfers([art("Arsenal submit bid for Viktor Gyokeres", BBC)], { lookups: { "viktor gyokeres": { name: "Viktor Gyokeres" } } });
    expect(e.player).toMatchObject({ name: "Viktor Gyokeres", club: null, age: null, position: null, inSquad: false });
  });
  it("ignores lookup misses", () => {
    const [e] = transfers([art("Arsenal submit bid for Viktor Gyokeres", BBC)], { lookups: { "viktor gyokeres": { miss: true } } });
    expect(e.player).toBeNull();
  });
  it("keeps a renewal and an exit rumour for the same squad player separate", () => {
    const out = transfers([
      art("Saka signs new Arsenal contract until 2030", { ...BBC, date: hoursAgo(2) }),
      art("Bukayo Saka exit: Madrid submit bid", { ...GUARDIAN, date: hoursAgo(1) }),
    ]);
    expect(out.map((e) => e.direction).sort()).toEqual(["outgoing", "renewal"]);
  });
  it("merges repeated reports of the same transfer into one entry", () => {
    const out = transfers([
      art("Arsenal submit bid for Viktor Gyokeres", { ...BBC, date: hoursAgo(30) }),
      art("Arsenal interested in Viktor Gyokeres", { ...GUARDIAN, date: hoursAgo(1) }),
    ], { lookups: { "viktor gyokeres": { name: "Viktor Gyokeres" } } });
    expect(out.filter((e) => e.player?.name === "Viktor Gyokeres")).toHaveLength(1);
  });
  it("ignores stories that aren't about transfers and non-Arsenal scopes", () => {
    expect(transfers([art("Arsenal beat Spurs 2-0", BBC), art("Chelsea sign midfielder", { ...BBC, scope: "league" })])).toEqual([]);
  });
  it("returns nothing for no stories", () => {
    expect(buildTransfers([], { squad })).toEqual([]);
    expect(buildTransfers([], {})).toEqual([]);
  });
});

describe("timeline and keys", () => {
  it("builds a dated, source-attributed timeline from real articles only", () => {
    const [e] = transfers([
      art("Arsenal monitor Gyokeres", { ...BBC, date: hoursAgo(30) }),
      art("Arsenal in advanced talks for Gyokeres", { ...GUARDIAN, date: hoursAgo(5) }),
    ], { lookups: { "viktor gyokeres": { name: "Viktor Gyokeres" } } });
    const tl = timelineOf(e);
    expect(tl.map((t) => t.source)).toEqual(["BBC Sport", "The Guardian"]);
    expect(tl.every((t) => t.date instanceof Date && t.link)).toBe(true);
    expect(tl[0].date.getTime()).toBeLessThan(tl[1].date.getTime());
  });
  it("labels denials in the timeline", () => {
    const [e] = transfers([art("Arsenal dismiss Gyokeres transfer talk", BBC)]);
    expect(timelineOf(e)[0].stage).toBe("Denied / dismissed");
  });
  it("builds stable watchlist keys, tolerant of missing player data", () => {
    expect(subjectKey({ player: { name: "Ødegaard" }, direction: "renewal" })).toBe("odegaard|renewal");
    expect(subjectKey({ subject: "Some Name", direction: "incoming" })).toBe("some-name|incoming");
    expect(subjectKey({ headline: "Headline only!", direction: "general" })).toBe("headline-only|general");
  });
  it("extracts candidate names but not clubs or squad players", () => {
    expect(candidateNames("Arsenal eye Viktor Gyokeres from Sporting")).toContain("Viktor Gyokeres");
    expect(candidateNames("Real Madrid want Bukayo Saka", { exclude: new Set(["bukayo saka"]) })).toEqual([]);
    expect(candidateNames("")).toEqual([]);
  });
  it("only looks up names for incoming targets", () => {
    const stories = buildStories([art("Arsenal eyes Viktor Gyokeres", BBC), art("Saka signs new Arsenal contract", GUARDIAN)], { now: NOW, players: squad });
    expect(namesToLookUp(stories, squad)).toEqual(["Viktor Gyokeres"]);
  });
});

describe("transfer window", () => {
  const w = (y, m) => windowInfo(new Date(y, m, 15));
  it("describes the window by month without claiming exact dates", () => {
    expect(w(2025, 0)).toMatchObject({ open: true, name: "January 2025 window" });
    expect(w(2025, 6)).toMatchObject({ open: true, name: "Summer 2025 window" });
    expect(w(2025, 2).open).toBe(false);
    expect(w(2025, 10)).toMatchObject({ open: false, name: "January 2026 window" });
    expect(JSON.stringify(w(2025, 6))).not.toMatch(/\b\d{1,2}(st|nd|rd|th) /);
  });
});
