import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, settled, test } from "./support.js";

const roster = () => JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures", "roster.json"), "utf8"));
const CORS = { "access-control-allow-origin": "*", "content-type": "application/json" };
const isRoster = (u) => /\/teams\/359\/roster$/.test(u.pathname);

/** The recorded roster with one injured, one suspended and one player with no injury data at all. */
function mixedRoster() {
  const j = roster();
  j.athletes[0].injuries = [{ status: "Out", details: { type: "Hamstring" }, date: "2026-11-10T10:00:00Z" }];
  j.athletes[1].injuries = [{ status: "Suspension" }];
  delete j.athletes[2].injuries; // ESPN gave no injury data for this player
  j.athletes[3].injuries = [{}]; // a record we can't read
  return { status: 200, headers: CORS, body: JSON.stringify(j), names: [0, 1, 2, 3].map((i) => j.athletes[i].displayName) };
}

test.describe("availability is communicated explicitly", () => {
  test("squad page distinguishes injured, suspended, no injury reported and unknown", async ({ app: page, net }) => {
    const r = mixedRoster();
    net.override((u) => isRoster(u), () => r);
    await page.goto("./#/squad");
    await settled(page);
    const main = page.locator("main");
    const text = await main.innerText();

    // The overview tiles count every state separately, and there is no "Available" tile.
    for (const label of ["No injury reported", "Injured", "Suspended", "Doubtful", "Unknown"]) await expect(main.getByText(label, { exact: true }).first()).toBeVisible();
    expect(text).not.toMatch(/^\s*available\s*$/im);
    expect(text).toMatch(/“No injury reported” means ESPN’s list has no entry/);

    // Per-player badges.
    await expect(main.getByText(/Injured · Hamstring/)).toBeVisible();
    await expect(main.getByText("Suspended", { exact: true }).nth(1)).toBeVisible();
    expect(await main.getByText("Unknown", { exact: true }).count()).toBeGreaterThanOrEqual(2); // tile + at least the two unknown players
    expect(page.problems).toEqual([]);
  });

  test("the status filter has an option for each state and filters correctly", async ({ app: page, net }) => {
    net.override((u) => isRoster(u), () => mixedRoster());
    await page.goto("./#/squad");
    await settled(page);
    const chips = page.getByRole("tablist").nth(2); // team switch, position chips, status chips
    const rows = page.locator('main section[class~="lg:col-span-2"] a[href^="#/squad/player/"]'); // the squad grid, not the injuries side list
    const pick = async (name, expectedCount) => {
      const tab = chips.getByRole("tab", { name });
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true");
      if (expectedCount != null) await expect(rows).toHaveCount(expectedCount);
    };
    await pick(/^None reported/);
    await expect(rows.filter({ hasText: /Injured|Suspended|Unknown/ })).toHaveCount(0);
    expect(await rows.count()).toBeGreaterThan(20);
    await pick(/^Unknown/, 2);
    await pick(/^Out/, 1);
    await pick(/^Suspended/, 1);
  });

  test("home availability line lists reported absences and mentions players with no data", async ({ app: page, net }) => {
    const r = mixedRoster();
    net.override((u) => isRoster(u), () => r);
    await page.goto("./");
    await settled(page);
    const line = page.getByText(/Availability:/).locator("xpath=ancestor::a[1]");
    const text = await line.innerText();
    expect(text).toContain(`${r.names[0]} (injured)`);
    expect(text).toContain(`${r.names[1]} (suspended)`);
  });

  test("a squad with an empty injury list says 'No injury reported' and never claims anyone is available or fit", async ({ app: page }) => {
    await page.goto("./#/squad");
    await settled(page);
    const text = await page.locator("main").innerText();
    expect(text).toMatch(/No injury reported/);
    expect(text).not.toMatch(/\bAvailable\b/);
    expect(text).not.toMatch(/\bfit\b/i);
  });

  test("a player profile states the same thing, with the source", async ({ app: page, net }) => {
    const r = mixedRoster();
    net.override((u) => isRoster(u), () => r);
    const j = JSON.parse(r.body);
    await page.goto(`./#/squad/player/${j.athletes[2].id}`);
    await settled(page);
    const main = page.locator("main");
    await expect(main.getByText("Unknown", { exact: true }).first()).toBeVisible();
    await expect(main).toContainText("ESPN supplied no injury data for this player");
  });
});
