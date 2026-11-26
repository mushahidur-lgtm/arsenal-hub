import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { SUMMARY_EVENT_ID, defaultResponse } from "../e2e/support.js";

const OUT = process.env.AUDIT_OUT ?? "audit/after";
mkdirSync(OUT, { recursive: true });
const report = { consoleErrors: [], overflow: [], brokenImages: [], checks: [] };
const note = (name, pass, detail = "") => report.checks.push({ name, pass, detail });

const BLOCK = /site\.api\.espn\.com|site\.web\.api\.espn\.com|api\.rss2json\.com|feeds\.bbci\.co\.uk|www\.theguardian\.com|www\.skysports\.com|nytimes\.com|football\.london|arseblog|reddit\.com|allorigins|codetabs/;

/** Replays recorded real responses; with `blocked`, the data hosts are unreachable (and so is the dev proxy). */
async function network(context, blocked = false) {
  await context.route((u) => !["localhost", "127.0.0.1"].includes(u.hostname) || u.pathname.includes("__proxy"), (route) => {
    const request = route.request();
    const u = new URL(request.url());
    if (blocked && (BLOCK.test(u.hostname) || u.pathname.includes("__proxy"))) return route.abort("failed");
    const r = defaultResponse(u, request);
    if (r) return route.fulfill(r);
    return route.abort("blockedbyclient");
  });
}

const ROUTES = [
  ["home", ""], ["home-transfers", "#/?tab=transfers"], ["home-fixtures", "#/?tab=fixtures"], ["home-table", "#/?tab=table"],
  ["news", "#/news"], ["matches", "#/matches"], ["transfers", "#/transfers"], ["squad", "#/squad"],
  ["match-page", `#/matches/${SUMMARY_EVENT_ID}`], ["player-page", "#/squad/player/280555"],
];
const VIEWPORTS = { "375": { width: 375, height: 812 }, "1280": { width: 1280, height: 800 } };

for (const scheme of ["light", "dark"]) {
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    test(`screenshots ${scheme} ${vpName}px`, async ({ browser }) => {
      const context = await browser.newContext({ viewport, colorScheme: scheme });
      await network(context);
      const page = await context.newPage();
      page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text())) report.consoleErrors.push(`${scheme}/${vpName}: ${m.text()}`); });
      page.on("pageerror", (e) => report.consoleErrors.push(`${scheme}/${vpName}: pageerror ${e.message}`));
      for (const [name, hash] of ROUTES) {
        await page.goto(hash ? `./${hash}` : "./");
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(700);
        await page.screenshot({ path: join(OUT, `${name}-${vpName}-${scheme}.png`), fullPage: true });
        const m = await page.evaluate(() => ({
          over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc).map((i) => i.currentSrc.slice(0, 90)),
        }));
        if (m.over > 1) report.overflow.push(`${name} ${vpName} ${scheme}: +${m.over}px`);
        for (const b of m.broken) report.brokenImages.push(`${name} ${vpName} ${scheme}: ${b}`);
      }
      await context.close();
    });
  }
}

test("interactions at 375px", async ({ browser }) => {
  const context = await browser.newContext({ viewport: VIEWPORTS["375"] });
  await network(context);
  const page = await context.newPage();
  await page.goto("./");
  await page.waitForLoadState("networkidle");

  // Countdown ticks (real clock).
  const secs = async () => (await page.locator('[role="timer"]').first().innerText().catch(() => "")).replace(/\s+/g, " ");
  const a = await secs();
  await page.waitForTimeout(2300);
  const b = await secs();
  note("countdown present and ticking", !!a && a !== b, `${a} -> ${b}`);

  // News filters (full news page).
  await page.goto("./#/news");
  await page.waitForLoadState("networkidle");
  for (const label of ["All news", "Match news", "Transfers", "Injuries"]) {
    const chip = page.getByRole("tab", { name: new RegExp(`^${label}`) });
    const expected = Number((await chip.innerText()).replace(/\D+/g, "")) || 0;
    await chip.click();
    const shown = await page.locator("main article").count();
    note(`news filter ${label}`, shown > 0 && shown <= Math.max(expected, 20), `chip=${expected} cards=${shown}`);
  }

  // Home "Latest" filter chips.
  await page.goto("./");
  await page.waitForLoadState("networkidle");
  for (const label of ["All", "Match", "Transfers", "Injuries"]) {
    const chip = page.getByRole("tab", { name: label, exact: true }).last();
    if (await chip.count()) { await chip.click(); note(`home filter ${label}`, true); } else note(`home filter ${label}`, false, "chip not found");
  }

  // Clear history (needs something in "recently visited").
  await page.goto("./#/squad/player/280555");
  await page.waitForLoadState("networkidle");
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.waitForTimeout(800);
  await page.goto("./#/");
  await page.waitForLoadState("networkidle");
  const clear = page.getByRole("button", { name: "Clear history" });
  if (await clear.count()) {
    await clear.click();
    note("Clear history empties recently visited", (await page.getByText("Recently visited").count()) === 0);
  } else note("Clear history", false, "button not found after visiting a player");

  // Theme toggle.
  const html = page.locator("html");
  const before = await html.evaluate((e) => e.classList.contains("dark"));
  await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).click();
  const after = await html.evaluate((e) => e.classList.contains("dark"));
  note("theme toggle flips dark class", before !== after, `${before} -> ${after}`);
  await context.close();
});

test("blocked data sources: error and stale states, never 0 injured", async ({ browser }) => {
  // 1) Nothing cached, everything blocked.
  let context = await browser.newContext({ viewport: VIEWPORTS["375"] });
  await network(context, true);
  let page = await context.newPage();
  await page.goto("./");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(7000); // proxy budget
  const homeText = await page.locator("main").innerText();
  await page.screenshot({ path: join(OUT, "blocked-home-375.png"), fullPage: true });
  note("blocked/no cache: home shows an error with Retry", /Couldn.t load/.test(homeText));
  note("blocked/no cache: home never claims nobody is injured", !/lists nobody injured|lists no injured/.test(homeText));
  await page.goto("./#/squad");
  await page.waitForTimeout(6000);
  const squadText = await page.locator("main").innerText();
  await page.screenshot({ path: join(OUT, "blocked-squad-375.png"), fullPage: true });
  note("blocked/no cache: squad shows error + Retry", /Couldn.t load/.test(squadText) && (await page.getByRole("button", { name: /retry/i }).count()) > 0);
  note("blocked/no cache: squad shows no counts or 'fetched'", !/fetched|INJURED\s*\n?\s*0/i.test(squadText));
  await context.close();

  // 2) Warm cache, then block and reload.
  context = await browser.newContext({ viewport: VIEWPORTS["375"] });
  await network(context);
  page = await context.newPage();
  await page.goto("./#/squad");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => {
    const all = JSON.parse(localStorage.getItem("afc-cache-v2"));
    for (const k of Object.keys(all)) all[k].savedAt = new Date(Date.now() - 3 * 3600e3).toISOString();
    localStorage.setItem("afc-cache-v2", JSON.stringify(all));
  });
  await context.unrouteAll();
  await network(context, true);
  await page.reload();
  await page.waitForTimeout(7000);
  const stale = await page.locator("main").innerText();
  await page.screenshot({ path: join(OUT, "stale-squad-375.png"), fullPage: true });
  note("stale: says last updated 3h ago", /Last updated 3h ago/.test(stale), (stale.match(/Last updated[^\n]*/) ?? [""])[0]);
  note("stale: never says fetched just now", !/fetched just now/.test(stale));
  await page.goto("./");
  await page.waitForTimeout(6000);
  await page.screenshot({ path: join(OUT, "stale-home-375.png"), fullPage: true });
  await context.close();
});

test.afterAll(() => {
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log("REPORT", JSON.stringify({ consoleErrors: report.consoleErrors.length, overflow: report.overflow, brokenImages: report.brokenImages.length, failedChecks: report.checks.filter((c) => !c.pass) }, null, 1));
  expect(true).toBe(true);
});
