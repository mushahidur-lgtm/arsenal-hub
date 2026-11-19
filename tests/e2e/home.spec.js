import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CAPTURED_AT, SUMMARY_EVENT_ID, expect, settled, test } from "./support.js";

const fx = (name) => JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures", name), "utf8"));
const CORS = { "access-control-allow-origin": "*", "content-type": "application/json" };

/** Re-time the recorded finished match so it is "in play" or "just finished" at the frozen clock. */
function scheduleWith(minutesAgo, state) {
  const j = fx("schedule.json");
  const ev = j.events.find((e) => String(e.id) === String(SUMMARY_EVENT_ID));
  ev.date = new Date(CAPTURED_AT.getTime() - minutesAgo * 60e3).toISOString();
  if (state === "in") {
    ev.competitions[0].status = { displayClock: "34'", type: { state: "in", completed: false, name: "STATUS_FIRST_HALF", shortDetail: "34'", detail: "34'" } };
  }
  return { status: 200, headers: CORS, body: JSON.stringify(j) };
}
const isMenSchedule = (u) => /\/teams\/359\/schedule$/.test(u.pathname) && u.searchParams.get("fixture") !== "true";

test.describe("home tabs (layout option B)", () => {
  test("defaults to Today, switches tabs through the hash, and survives reload and bad values", async ({ app: page }) => {
    await page.goto("./");
    await settled(page);
    const tablist = page.getByRole("tablist").first(); // the home tab bar is the first tablist on the page
    await expect(tablist.getByRole("tab", { name: "Today" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel", { name: "Today" })).toBeVisible();

    for (const [name, hash] of [["Transfers", /tab=transfers/], ["Fixtures", /tab=fixtures/], ["Table", /tab=table/]]) {
      await tablist.getByRole("tab", { name }).click();
      await expect(page).toHaveURL(hash);
      await expect(tablist.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("tabpanel", { name })).toBeVisible();
    }
    await page.reload();
    await settled(page);
    await expect(page.getByRole("tabpanel", { name: "Table" })).toBeVisible();
    await tablist.getByRole("tab", { name: "Today" }).click();
    await expect(page.getByRole("tabpanel", { name: "Today" })).toBeVisible();
    await page.goto("./#/?tab=nonsense");
    await expect(page.getByRole("tabpanel", { name: "Today" })).toBeVisible();
    void tablist;
    expect(page.problems).toEqual([]);
  });

  test("switching tabs does not jump the page to the top", async ({ app: page }) => {
    await page.goto("./");
    await settled(page);
    await page.evaluate(() => window.scrollTo(0, 400));
    const y = await page.evaluate(() => window.scrollY);
    expect(y).toBeGreaterThan(100);
    await page.getByRole("tablist").first().getByRole("tab", { name: "Fixtures" }).click();
    await expect(page.getByRole("tabpanel", { name: "Fixtures" })).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test("Today leads with a numbered top story and an availability line, not ten stacked sections", async ({ app: page }) => {
    await page.goto("./");
    await settled(page);
    await expect(page.getByText(/^1 of \d+ · Top story/)).toBeVisible();
    await expect(page.getByText(/The top \d+ stories/)).toBeVisible();
    const numbers = await page.locator("ol li").filter({ hasText: /./ }).first().innerText();
    expect(numbers).toBeTruthy();
    await expect(page.getByText(/Availability:/)).toBeVisible();
    // Sections that moved to tabs are not on Today.
    await expect(page.getByRole("heading", { name: "Recent results" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Transfer watch" })).toHaveCount(0);
  });

  test("Transfers tab shows a four-step stepper for each tracked transfer", async ({ app: page }) => {
    await page.goto("./#/?tab=transfers");
    await settled(page);
    const steppers = page.locator('ol[aria-label^="Stage:"]');
    expect(await steppers.count()).toBeGreaterThan(0);
    const first = steppers.first();
    await expect(first.locator("li")).toHaveCount(4);
    await expect(first.locator("li").nth(0)).toContainText("Rumour");
    await expect(first.locator("li").nth(3)).toContainText("Complete");
    await expect(first.locator('li[aria-current="step"]')).toHaveCount(1);
  });

  test("Table tab highlights Arsenal and states the gaps to 2nd place and the top-four line", async ({ app: page }) => {
    await page.goto("./#/?tab=table");
    await settled(page);
    await expect(page.locator('tr[aria-current="true"]')).toContainText("Arsenal");
    await expect(page.getByText("vs 2nd place")).toBeVisible();
    await expect(page.getByText("Top-4 cut-off")).toBeVisible();
    const gaps = await page.locator("dl").filter({ hasText: "vs 2nd place" }).innerText();
    expect(gaps).toMatch(/\d+ pts? (clear|behind)|Level/);
    expect(gaps).not.toMatch(/NaN|undefined/);
  });

  test("results are marked by shape and text as well as colour", async ({ app: page }) => {
    await page.goto("./");
    await settled(page);
    const pills = page.getByRole("img", { name: /^(Win|Draw|Loss)$/ });
    expect(await pills.count()).toBeGreaterThan(0);
    const styles = await pills.evaluateAll((els) => els.map((e) => ({ label: e.getAttribute("aria-label"), text: e.textContent.trim(), shape: getComputedStyle(e).clipPath !== "none" ? "diamond" : getComputedStyle(e).borderRadius })));
    for (const s of styles) expect(s.text).toBe({ Win: "W", Draw: "D", Loss: "L" }[s.label]);
    const wins = styles.filter((s) => s.label === "Win");
    const draws = styles.filter((s) => s.label === "Draw");
    if (wins.length && draws.length) expect(wins[0].shape).not.toBe(draws[0].shape);
  });
});

test.describe("matchday hero", () => {
  test("in play: live score, key events and a lineups link", async ({ app: page, net }) => {
    net.override((u) => isMenSchedule(u), () => scheduleWith(34, "in"));
    await page.goto("./");
    await settled(page);
    await expect(page.getByText(/Live · /)).toBeVisible();
    await expect(page.getByText("Key events")).toBeVisible();
    await expect(page.getByRole("link", { name: /Lineups & live match centre/ })).toHaveAttribute("href", new RegExp(`#/matches/${SUMMARY_EVENT_ID}$`));
    await expect(page.getByText(/Not a live stream/)).toBeVisible();
    expect(await page.locator("main").innerText()).not.toMatch(/NaN|undefined/);
    expect(page.problems).toEqual([]);
  });

  test("after full time: result plus a talking-points card built from the match data", async ({ app: page, net }) => {
    net.override((u) => isMenSchedule(u), () => scheduleWith(150, "post"));
    await page.goto("./");
    await settled(page);
    await expect(page.getByText("Full time", { exact: true })).toBeVisible();
    await expect(page.getByText("Talking points")).toBeVisible();
    const card = page.locator("dl").filter({ has: page.getByText("Possession") }).or(page.locator("dl").filter({ has: page.getByText("Goals") })).first();
    await expect(card).toBeVisible();
    expect(await card.innerText()).not.toMatch(/NaN|undefined|null/);
    await expect(page.getByRole("link", { name: /Lineups & full report/ })).toBeVisible();
  });

  test("hero shows an honest message when match events can't be loaded", async ({ app: page, net }) => {
    net.override((u) => isMenSchedule(u), () => scheduleWith(34, "in"));
    net.override((u) => /\/summary$/.test(u.pathname), () => ({ status: 500, headers: CORS, body: "{}" }));
    await page.goto("./");
    await settled(page);
    await expect(page.getByText(/events couldn.t be loaded/i)).toBeVisible();
    await expect(page.getByText(/Live · /)).toBeVisible();
  });
});

test.describe("sharing metadata", () => {
  test("og tags point at a real image under the deployed base path", async ({ app: page, request }) => {
    await page.goto("./");
    const title = await page.locator('meta[property="og:title"]').getAttribute("content");
    expect(title).toMatch(/Arsenal Hub/);
    const img = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(img).toBe("https://mushahidur-lgtm.github.io/arsenal-hub/og-image.png");
    const local = await request.get("./og-image.png");
    expect(local.status()).toBe(200);
    expect(local.headers()["content-type"]).toContain("image/png");
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveCount(1);
  });
});
