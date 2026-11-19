import { describe, expect, it } from "vitest";
import { parseRoster } from "../../src/lib/data.js";
import { parsePlayerStats, seasonLine, seasonsOf } from "../../src/lib/playerstats.js";
import { layoutLineup, parseFormation, pitchPoints } from "../../src/lib/pitch.js";
import { CATEGORIES, HISTORY_SOURCES, INVINCIBLES, RECORDS, TIMELINE, searchHistory } from "../../src/lib/history.js";
import { playerKeys } from "../../src/lib/news.js";

const statsJson = {
  categories: [
    {
      displayName: "General",
      names: ["GP", "G", "A"],
      displayNames: ["Games played", "Goals", "Assists"],
      statistics: [
        { season: { year: 2024, displayName: "2024-25" }, stats: ["30", "10", "5"] },
        { season: { year: 2023, displayName: "2023-24" }, stats: ["35", "-", "7"] },
        { season: { displayName: "" }, stats: ["1", "1", "1"] },
      ],
    },
  ],
};

describe("player statistics", () => {
  it("parses seasons and drops non-numeric values rather than turning them into 0 or NaN", () => {
    const { seasons, labels } = parsePlayerStats(statsJson);
    expect(Object.keys(seasons)).toEqual(["2024-25", "2023-24"]);
    expect(seasons["2023-24"]).not.toHaveProperty("G");
    expect(seasons["2024-25"].G).toBe(10);
    expect(labels.G.name).toBe("Goals");
  });
  it("tolerates empty and malformed responses", () => {
    expect(parsePlayerStats(null)).toEqual({ seasons: {}, labels: {} });
    expect(parsePlayerStats({ categories: [{}] })).toEqual({ seasons: {}, labels: {} });
  });
  const stats = {
    data: {
      "eng.1": { "2024-25": { _year: 2024, G: 8, A: 3 }, "2023-24": { _year: 2023, G: 5 } },
      "eng.fa": { "2024-25": { _year: 2024, G: 2 } },
    },
  };
  it("sums a season across competitions and keeps stats a competition lacks absent", () => {
    expect(seasonLine(stats, "2024-25", "all")).toEqual({ G: 10, A: 3 });
    expect(seasonLine(stats, "2023-24", "eng.fa")).toBeNull();
    expect(seasonLine(null, "2024-25")).toBeNull();
  });
  it("never produces NaN when a stat exists for only some competitions", () => {
    const line = seasonLine(stats, "2024-25", "all");
    expect(Object.values(line).every(Number.isFinite)).toBe(true);
  });
  it("lists seasons newest first and respects the competition filter", () => {
    expect(seasonsOf(stats, "all")).toEqual(["2024-25", "2023-24"]);
    expect(seasonsOf(stats, "eng.fa")).toEqual(["2024-25"]);
    expect(seasonsOf(null)).toEqual([]);
  });
});

describe("squad search, filtering and separation", () => {
  const men = parseRoster({ athletes: [
    { id: "1", displayName: "Bukayo Saka", position: { abbreviation: "F" }, jersey: "7" },
    { id: "2", displayName: "Declan Rice", position: { abbreviation: "M" }, jersey: "41" },
  ] }).players;
  const women = parseRoster({ athletes: [{ id: "10", displayName: "Leah Williamson", position: { abbreviation: "D" }, jersey: "6" }] }).players;
  it("keeps the men's and women's rosters independent", () => {
    expect(men.map((p) => p.id)).not.toEqual(expect.arrayContaining(women.map((p) => p.id)));
    expect(women).toHaveLength(1);
  });
  it("builds name-matching keys that skip ambiguous surnames", () => {
    const keys = playerKeys([
      { id: "a", name: "Gabriel Jesus", lastName: "Jesus" },
      { id: "b", name: "Gabriel Martinelli", lastName: "Martinelli" },
      { id: "c", name: "Ben White", lastName: "White" },
      { id: "d", name: "Jamie White", lastName: "White" },
      { id: "e", name: "Raya", lastName: "" },
    ]);
    expect(keys.find((k) => k.id === "c").lastKey).toBeNull(); // ambiguous
    expect(keys.find((k) => k.id === "b").lastKey).toBe("martinelli");
    expect(keys.find((k) => k.id === "e").fullKey).toBeNull(); // single name: never matched loosely
  });
});

describe("pitch layout", () => {
  const p = (position, place, name = position) => ({ position, place, name });
  const eleven = [
    p("G", 1), p("LB", 3), p("CD-L", 4), p("CD-R", 5), p("RB", 2),
    p("CM-L", 6), p("CM-R", 8), p("AM", 10), p("LF", 11), p("CF", 9), p("RF", 7),
  ];
  it("parses plain formations only", () => {
    expect(parseFormation("4-2-3-1")).toEqual([4, 2, 3, 1]);
    expect(parseFormation("4231")).toBeNull();
    expect(parseFormation(null)).toBeNull();
    expect(parseFormation("4-4-2-1-1-1-1")).toBeNull();
  });
  it("places goalkeeper first and honours a matching formation", () => {
    const out = layoutLineup({ formation: "4-3-3", starters: eleven });
    expect(out.exact).toBe(true);
    expect(out.rows[0]).toHaveLength(1);
    expect(out.rows.map((r) => r.length)).toEqual([1, 4, 3, 3]);
  });
  it("falls back to position depth when the formation doesn't match the players", () => {
    const out = layoutLineup({ formation: "4-4-3", starters: eleven });
    expect(out.exact).toBe(false);
    expect(out.rows.flat()).toHaveLength(11);
  });
  it("handles missing or empty lineups", () => {
    expect(layoutLineup(null).rows).toEqual([]);
    expect(layoutLineup({ starters: [] }).rows).toEqual([]);
  });
  it("keeps every point inside the pitch", () => {
    const pts = pitchPoints(layoutLineup({ formation: "4-3-3", starters: eleven }));
    expect(pts).toHaveLength(11);
    expect(pts.every(({ x, y }) => x > 0 && x < 100 && y >= 0 && y <= 100)).toBe(true);
    expect(pitchPoints({ rows: [] })).toEqual([]);
  });
});

describe("history and records", () => {
  it("has well-formed timeline entries, records and honest sourcing", () => {
    expect(TIMELINE.length).toBeGreaterThan(5);
    for (const e of TIMELINE) {
      expect(e.title).toBeTruthy();
      expect(e.text).toBeTruthy();
      expect(e.year ?? e.label).toBeTruthy();
    }
    expect(RECORDS.length).toBeGreaterThan(0);
    expect(CATEGORIES.length).toBeGreaterThan(0);
    expect(HISTORY_SOURCES.length).toBeGreaterThan(0);
    expect(INVINCIBLES.summary).toBeTruthy();
  });
  it("searches case-insensitively, ignores 1-character queries and caps results", () => {
    expect(searchHistory("x")).toEqual([]);
    expect(searchHistory("   ")).toEqual([]);
    expect(searchHistory("zzzzzzzzqq")).toEqual([]);
    expect(searchHistory("invincibles")[0].kind).toBe("invincibles");
    expect(searchHistory("ARSENAL").length).toBeLessThanOrEqual(6);
  });
});
