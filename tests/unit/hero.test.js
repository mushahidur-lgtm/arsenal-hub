import { describe, expect, it } from "vitest";
import { heroMode, keyEvents, talkingPoints } from "../../src/lib/hero.js";

const m = (over) => ({ id: "1", state: "pre", date: new Date("2025-03-01T15:00:00Z"), friendly: false, postponed: false, home: { id: "359", short: "Arsenal" }, away: { id: "9", short: "Spurs" }, ...over });
const T = (iso) => new Date(iso).getTime();

describe("heroMode", () => {
  it("is live when any match is in play", () => {
    const live = m({ state: "in" });
    expect(heroMode({ fixtures: [m(), live], results: [] }, T("2025-03-01T15:30:00Z"))).toEqual({ mode: "live", match: live });
  });
  it("shows full time for a match that finished within the same day, then reverts", () => {
    const done = m({ state: "post" });
    const data = { fixtures: [m({ id: "2", date: new Date("2025-03-08T15:00:00Z") })], results: [done] };
    expect(heroMode(data, T("2025-03-01T17:30:00Z")).mode).toBe("fulltime");
    expect(heroMode(data, T("2025-03-02T09:00:00Z")).mode).toBe("upcoming");
  });
  it("ignores friendlies, postponed and not-yet-played results, and missing data", () => {
    expect(heroMode({ fixtures: [], results: [m({ state: "post", friendly: true })] }, T("2025-03-01T17:00:00Z")).mode).toBe("upcoming");
    expect(heroMode({ fixtures: [], results: [m({ state: "post", postponed: true })] }, T("2025-03-01T17:00:00Z")).mode).toBe("upcoming");
    expect(heroMode({ fixtures: [], results: [m({ state: "post" })] }, T("2025-03-01T10:00:00Z")).mode).toBe("upcoming");
    expect(heroMode(null).mode).toBe("upcoming");
    expect(heroMode({}, 0).mode).toBe("upcoming");
  });
});

describe("keyEvents / talkingPoints", () => {
  const match = m({ state: "post" });
  const summary = {
    events: [
      { kind: "sub", minute: "10'", teamId: "359", primary: "A" },
      { kind: "goal", minute: "23'", teamId: "359", primary: "Saka" },
      { kind: "yellow", minute: "40'", teamId: "9", primary: "X" },
      { kind: "penalty", minute: "80'", teamId: "9", primary: "Son" },
    ],
    stats: [
      { key: "possessionPct", home: 58, away: 42, fmt: (v) => `${v}%` },
      { key: "totalShots", home: 14, away: 8 },
      { key: "shotsOnTarget", home: 6, away: 3 },
    ],
  };
  it("filters substitutions out of key events", () => {
    expect(keyEvents(summary).map((e) => e.kind)).toEqual(["goal", "yellow", "penalty"]);
    expect(keyEvents(summary, 2).map((e) => e.kind)).toEqual(["yellow", "penalty"]);
    expect(keyEvents(null)).toEqual([]);
  });
  it("builds factual lines from the data only", () => {
    const pts = talkingPoints(summary, match);
    expect(pts.map((p) => p.id)).toEqual(["goals", "possession", "shots", "yellows"]);
    expect(pts[0].text).toBe("Saka 23' for Arsenal · Son 80' (pen) for Spurs");
    expect(pts[2].text).toBe("Arsenal 14 (6 on target) – 8 (3 on target) Spurs");
  });
  it("omits lines for missing data and returns nothing without a summary", () => {
    expect(talkingPoints({ events: [], stats: [] }, match)).toEqual([]);
    expect(talkingPoints(null, match)).toEqual([]);
    expect(talkingPoints(summary, null)).toEqual([]);
  });
});
