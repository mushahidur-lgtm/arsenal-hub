import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CAPTURED_AT, STATS_PLAYERS, SUMMARY_EVENT_ID, expect, settled, test } from "./support.js";

const fx = (name) => JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures", name), "utf8"));
const CORS = { "access-control-allow-origin": "*", "content-type": "application/json" };
const json = (body) => ({ status: 200, headers: CORS, body: JSON.stringify(body) });
const menSchedule = (u, fixtureFlag) => /\/teams\/359\/schedule$/.test(u.pathname) && (u.searchParams.get("fixture") === "true") === fixtureFlag;
const refresh = (page) => page.getByRole("button", { name: "Refresh news and data" });

test.describe("Refresh reaches pages that load their own detail data", () => {
  test("match page: Refresh re-requests the match summary", async ({ app: page, net }) => {
    await page.goto(`./#/matches/${SUMMARY_EVENT_ID}`);
    await settled(page);
    const summaries = () => net.requests.filter((u) => /\/summary\?/.test(u)).length;
    const before = summaries();
    expect(before).toBeGreaterThan(0);
    await refresh(page).click();
    await expect.poll(summaries).toBeGreaterThan(before);
    expect(page.problems).toEqual([]);
  });

  test("player page: Refresh bypasses the saved statistics and re-requests them", async ({ app: page, net }) => {
    const p = STATS_PLAYERS[0];
    await page.goto(`./#/squad/player/${p.id}`);
    await settled(page);
    const statRequests = () => net.requests.filter((u) => new RegExp(`/athletes/${p.id}/stats`).test(u)).length;
    const before = statRequests();
    expect(before).toBeGreaterThan(0);
    // A normal revisit within 6h is served from the saved copy: no new request.
    await page.goto("./#/squad");
    await page.goto(`./#/squad/player/${p.id}`);
    await settled(page);
    expect(statRequests()).toBe(before);
    // Refresh must reach the network.
    await refresh(page).click();
    await expect.poll(statRequests).toBeGreaterThan(before);
  });

  test("opening a page doesn't trigger a second, redundant request for its detail data", async ({ app: page, net }) => {
    await page.goto(`./#/matches/${SUMMARY_EVENT_ID}`);
    await settled(page);
    await page.waitForTimeout(1500);
    expect(net.requests.filter((u) => /\/summary\?/.test(u)).length).toBe(1);
  });
});

test.describe("match classification", () => {
  test("a fixture ESPN never updated doesn't block the real next match and is labelled", async ({ app: page, net }) => {
    const j = fx("schedule-fixtures.json");
    const stuck = j.events.find((e) => e.competitions?.[0]?.status?.type?.state === "pre");
    stuck.date = new Date(CAPTURED_AT.getTime() - 2 * 86400e3).toISOString();
    const stuckId = String(stuck.id);
    net.override((u) => menSchedule(u, true), () => json(j));
    await page.goto("./");
    await settled(page);
    // The hero leads with a genuinely upcoming match.
    const hero = page.locator('main a[href^="#/matches/"]').filter({ hasText: /Next match|Matchday/i }).first();
    await expect(hero).toBeVisible();
    expect(await hero.getAttribute("href")).not.toContain(stuckId);
    // On the fixtures list the stale one says so instead of pretending to be upcoming.
    await page.goto("./#/matches");
    await settled(page);
    await expect(page.getByText("Awaiting result").first()).toBeVisible();
  });

  test("a live match with no score data shows dashes, not 0–0", async ({ app: page, net }) => {
    const j = fx("schedule.json");
    const ev = j.events.find((e) => String(e.id) === String(SUMMARY_EVENT_ID));
    ev.date = new Date(CAPTURED_AT.getTime() - 20 * 60e3).toISOString();
    ev.competitions[0].status = { displayClock: "20'", type: { state: "in", completed: false, name: "STATUS_FIRST_HALF", shortDetail: "20'", detail: "20'" } };
    for (const c of ev.competitions[0].competitors) delete c.score;
    net.override((u) => menSchedule(u, false), () => json(j));
    await page.goto("./");
    await settled(page);
    await expect(page.getByText(/Live · /)).toBeVisible();
    const score = page.getByLabel(/^Score /);
    await expect(score).toHaveAttribute("aria-label", "Score – to –");
    await expect(score).toHaveText("– : –");
    expect(await page.locator("main").innerText()).not.toMatch(/\b0–0\b/);
  });

  test("a completed match whose scores are missing shows dashes on the match page", async ({ app: page, net }) => {
    const j = fx("schedule.json");
    const ev = j.events.find((e) => String(e.id) === String(SUMMARY_EVENT_ID));
    for (const c of ev.competitions[0].competitors) delete c.score;
    net.override((u) => menSchedule(u, false), () => json(j));
    await page.goto(`./#/matches/${SUMMARY_EVENT_ID}`);
    await settled(page);
    expect(await page.locator("main").innerText()).not.toMatch(/\b0–0\b/);
  });
});

test.describe("mobile More menu", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("opens, marks the current page, closes on Escape and returns focus", async ({ app: page }) => {
    await page.goto("./#/history");
    await settled(page);
    const nav = page.getByRole("navigation", { name: "Main" }).last();
    const more = nav.getByRole("button", { name: /More/ });
    await expect(more).toHaveAttribute("aria-expanded", "false");
    await more.click();
    await expect(more).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("link", { name: "History" }).last()).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Escape");
    await expect(more).toHaveAttribute("aria-expanded", "false");
    await expect(more).toBeFocused();
  });
  test("choosing a destination closes the menu and navigates", async ({ app: page }) => {
    await page.goto("./");
    await settled(page);
    const nav = page.getByRole("navigation", { name: "Main" }).last();
    await nav.getByRole("button", { name: /More/ }).click();
    await page.getByRole("link", { name: "Analysis" }).last().click();
    await expect(page).toHaveURL(/#\/analysis/);
    await expect(nav.getByRole("button", { name: /More/ })).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("deep links", () => {
  for (const hash of ["#/?tab=table", "#/news?cat=injury", "#/squad?team=women", "#/analysis?a=1&b=2", "#/history/records", "#/constructor", "#/__proto__"]) {
    test(`${hash} opens directly and survives a refresh`, async ({ app: page }) => {
      await page.goto(`./${hash}`);
      await settled(page);
      await expect(page.locator("main h1").first()).toBeVisible();
      const url = page.url();
      await page.reload();
      await settled(page);
      expect(page.url()).toBe(url);
      await expect(page.locator("main h1").first()).toBeVisible();
      expect(page.problems).toEqual([]);
    });
  }
});

test.describe("code-split pages fail gracefully", () => {
  test("a chunk that can't be downloaded shows a reload prompt, and the rest of the site keeps working", async ({ app: page }) => {
    await page.route("**/assets/history-*.js", (route) => route.abort("failed"));
    await page.goto("./#/history");
    await expect(page.getByText("This part of the site couldn’t be loaded")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Reload page" })).toBeVisible();
    await page.getByRole("navigation", { name: "Main" }).first().getByRole("link", { name: "News" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Arsenal news");
  });

  test("a dropped download is retried once and the page then loads", async ({ app: page }) => {
    let attempts = 0;
    await page.route("**/assets/analysis-*.js", (route) => (++attempts === 1 ? route.abort("failed") : route.continue()));
    await page.goto("./#/analysis");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Player comparison", { timeout: 15_000 });
    expect(attempts).toBeGreaterThanOrEqual(2);
  });

  test("while a page's code downloads, a loading placeholder is shown", async ({ app: page }) => {
    // The chunk request is held until the test releases it, so the placeholder state is observable
    // deterministically instead of racing a timer.
    let release;
    const gate = new Promise((r) => { release = r; });
    await page.route("**/assets/history-*.js", async (route) => { await gate; await route.continue(); });
    await page.goto("./#/history");
    await expect(page.locator('[role="status"][aria-label="Loading page"]')).toBeVisible();
    release();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("history");
    await expect(page.locator('[role="status"][aria-label="Loading page"]')).toHaveCount(0);
  });
});
