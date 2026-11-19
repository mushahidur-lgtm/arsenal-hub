import { describe, expect, it } from "vitest";
import { tableGaps } from "../../src/lib/standings.js";
import { STEPS, stepOf } from "../../src/lib/transfers.js";

const table = (pts) => pts.map((p, i) => ({ id: `t${i + 1}`, rank: i + 1, pts: p }));

describe("tableGaps", () => {
  it("leader: lead over 2nd and cushion over 5th", () => {
    expect(tableGaps(table([27, 22, 21, 18, 16, 10]), "t1")).toEqual({ rank: 1, second: 5, topFour: 11, inside: true });
  });
  it("outside the top four: deficit to 4th (negative) and to 2nd", () => {
    expect(tableGaps(table([30, 28, 25, 22, 19, 17]), "t6")).toEqual({ rank: 6, second: -11, topFour: -5, inside: false });
  });
  it("2nd place has no gap to itself", () => {
    expect(tableGaps(table([30, 28, 25, 22, 19]), "t2").second).toBeNull();
  });
  it("is null, never NaN, when the table is short, empty or lacks points", () => {
    expect(tableGaps([], "t1")).toEqual({ second: null, topFour: null, inside: null, rank: null });
    expect(tableGaps(null, "t1").rank).toBeNull();
    expect(tableGaps(table([10, 9]), "t1")).toMatchObject({ second: 1, topFour: null });
    expect(tableGaps([{ id: "t1", rank: 1 }], "t1").rank).toBeNull();
    expect(tableGaps(table([5, 4, 3, 2, 1]), "missing").rank).toBeNull();
  });
});

describe("transfer stepper", () => {
  it("places every status on one of four steps; dismissed has none", () => {
    expect(STEPS).toEqual(["Rumour", "Talks", "Agreed", "Complete"]);
    expect(["speculation", "monitoring", "interest"].map(stepOf)).toEqual([0, 0, 0]);
    expect(stepOf("strong")).toBe(1);
    expect(stepOf("advanced")).toBe(2);
    expect(stepOf("done")).toBe(3);
    expect(stepOf("confirmed")).toBe(3);
    expect(stepOf("dismissed")).toBeNull();
    expect(stepOf("nonsense")).toBeNull();
  });
});
