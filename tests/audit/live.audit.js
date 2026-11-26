import { test, expect } from "@playwright/test";

/**
 * Read-only smoke test of a *deployed* site (set AUDIT_BASE to its URL). It only loads pages: it clicks
 * nothing that writes, and it uses the real network, so results can vary with the data providers.
 * What it proves: assets load from the base path, every route renders, and deep links survive a refresh.
 */
const ROUTES = ["", "#/news", "#/matches", "#/transfers", "#/squad", "#/analysis", "#/history", "#/history/records", "#/squad?team=women", "#/?tab=table", "#/definitely-not-a-page"];

test("deployed site: assets, routes and deep links", async ({ page, baseURL }) => {
  const origin = new URL(baseURL).origin;
  const bad = [];
  const errors = [];
  page.on("response", (r) => { if (r.url().startsWith(origin) && r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR|CORS|Cross-Origin/i.test(m.text())) errors.push(m.text()); });

  const results = [];
  for (const hash of ROUTES) {
    await page.goto(hash ? `./${hash}` : "./", { waitUntil: "domcontentloaded" });
    await page.locator("main h1").first().waitFor({ timeout: 30_000 });
    const url = page.url();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("main h1").first().waitFor({ timeout: 30_000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    results.push({ hash: hash || "(home)", sameUrlAfterRefresh: page.url() === url, h1: (await page.locator("main h1").first().innerText()).slice(0, 40), overflow });
  }

  const refs = await page.evaluate(() => [...document.querySelectorAll("script[src],link[href]")].map((e) => e.getAttribute("src") ?? e.getAttribute("href")));
  const local = refs.filter((r) => r && !/^https?:|^data:/.test(r));
  console.log("LIVE", JSON.stringify({ origin, results, localAssetRefs: local, badResponses: bad, errors }, null, 1));

  expect(bad).toEqual([]);
  expect(errors).toEqual([]);
  for (const r of results) {
    expect(r.sameUrlAfterRefresh, r.hash).toBe(true);
    expect(r.overflow, r.hash).toBeLessThanOrEqual(1);
  }
  for (const ref of local) expect(ref).toMatch(/^\/arsenal-hub\//);
});
