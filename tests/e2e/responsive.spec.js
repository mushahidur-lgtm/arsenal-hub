import { SUMMARY_EVENT_ID, STATS_PLAYERS, expect, settled, test } from "./support.js";

/** Phase 5: the layouts the brief names, checked for overflow, navigation and tap targets. */
const VIEWPORTS = {
  "small mobile 320x568": { width: 320, height: 568 },
  "mobile 390x844": { width: 390, height: 844 },
  "large mobile 430x932": { width: 430, height: 932 },
  "tablet 768x1024": { width: 768, height: 1024 },
  "laptop 1366x768": { width: 1366, height: 768 },
  "desktop 1920x1080": { width: 1920, height: 1080 },
};

const ROUTES = [
  ["home", ""],
  ["news", "#/news"],
  ["matches", "#/matches"],
  ["match detail", `#/matches/${SUMMARY_EVENT_ID}`],
  ["transfers", "#/transfers"],
  ["squad", "#/squad"],
  ["women's squad", "#/squad?team=women"],
  ["player profile", "#/squad/player/280555"],
  ["comparison", `#/analysis?a=${STATS_PLAYERS[0].id}&b=${STATS_PLAYERS[1].id}`],
  ["history", "#/history"],
  ["records", "#/history/records"],
];

for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`viewport ${vpName}`, () => {
    test.use({ viewport });

    test("no page is wider than the screen", async ({ app: page }) => {
      const overflow = [];
      for (const [name, hash] of ROUTES) {
        await page.goto(hash ? `./${hash}` : "./");
        await settled(page);
        await page.waitForTimeout(400);
        const m = await page.evaluate(() => {
          const de = document.documentElement;
          // Elements poking outside the viewport (ignoring ones inside intentional horizontal scrollers).
          const offenders = [];
          for (const el of document.body.querySelectorAll("*")) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.right <= de.clientWidth + 1) continue;
            let p = el.parentElement;
            let scroller = false;
            while (p && p !== document.body) {
              const o = getComputedStyle(p).overflowX;
              if (o === "auto" || o === "scroll" || o === "hidden") { scroller = true; break; }
              p = p.parentElement;
            }
            if (!scroller && getComputedStyle(el).position !== "fixed") offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} right=${Math.round(r.right)}`);
          }
          return { scrollW: de.scrollWidth, clientW: de.clientWidth, offenders: offenders.slice(0, 5) };
        });
        if (m.scrollW > m.clientW + 1 || m.offenders.length) overflow.push(`${name}: scrollWidth ${m.scrollW} > ${m.clientW}; ${m.offenders.join(" | ")}`);
      }
      expect(overflow).toEqual([]);
      expect(page.problems).toEqual([]);
    });

    test("navigation matches the screen size and every section is reachable", async ({ app: page }) => {
      await page.goto("./");
      await settled(page);
      const wide = viewport.width >= 1024;
      const mains = page.getByRole("navigation", { name: "Main" });
      if (wide) {
        await expect(mains.first()).toBeVisible();
        await mains.first().getByRole("link", { name: "Squad" }).click();
      } else {
        // Bottom navigation on small screens.
        const bottom = mains.last();
        await expect(bottom).toBeVisible();
        const box = await bottom.boundingBox();
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
        await bottom.getByRole("link", { name: "Squad" }).click();
      }
      await expect(page).toHaveURL(/#\/squad$/);
      // Secondary sections live behind "More" on small screens.
      if (!wide) {
        await mains.last().getByRole("button", { name: /More/ }).click();
        await page.getByRole("link", { name: "History" }).last().click();
        await expect(page).toHaveURL(/#\/history/);
      }
    });

    test("tap targets in navigation and key controls are large enough", async ({ app: page }) => {
      if (viewport.width >= 1024) test.skip(true, "touch targets only matter on touch-sized layouts");
      await page.goto("./");
      await settled(page);
      const small = [];
      const targets = page.getByRole("navigation", { name: "Main" }).last().locator("a, button");
      for (const el of await targets.all()) {
        const b = await el.boundingBox();
        if (b && (b.width < 44 || b.height < 44)) small.push(`${(await el.innerText()).trim() || "icon"} ${Math.round(b.width)}x${Math.round(b.height)}`);
      }
      for (const name of ["Search", "Refresh news and data", /Switch to/]) {
        const b = await page.getByRole("button", { name }).first().boundingBox();
        if (b && (b.width < 36 || b.height < 36)) small.push(`${name} ${Math.round(b.width)}x${Math.round(b.height)}`);
      }
      expect(small, "controls below the touch-target minimum").toEqual([]);
    });
  });
}

test.describe("modal and dropdown positioning on a small phone", () => {
  test.use({ viewport: VIEWPORTS["small mobile 320x568"] });

  test("search dialog stays inside the viewport", async ({ app: page }) => {
    await page.goto("./");
    await settled(page);
    await page.getByRole("button", { name: "Search" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Search" });
    await dialog.getByRole("textbox").fill("Arsenal");
    const panel = dialog.locator("> div").first();
    const b = await panel.boundingBox();
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(320 + 1);
    expect(b.y + b.height).toBeLessThanOrEqual(568 + 1);
  });

  test("comparison picker dropdown fits the screen and the compare table doesn't overflow", async ({ app: page }) => {
    await page.goto("./#/analysis");
    await settled(page);
    await page.getByRole("button", { name: /Choose a player/ }).first().click();
    const list = page.getByRole("textbox", { name: "Search Player 1" }).locator("xpath=ancestor::div[contains(@class,'absolute')]");
    const b = await list.boundingBox();
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(321);
  });

  test("lineup pitch fits the screen", async ({ app: page }) => {
    await page.goto(`./#/matches/${SUMMARY_EVENT_ID}`);
    await settled(page);
    const pitch = page.locator("svg").filter({ has: page.locator("circle, ellipse") }).first();
    if (!(await pitch.count())) test.skip(true, "no lineup published for the recorded match");
    const b = await pitch.boundingBox();
    expect(b.x + b.width).toBeLessThanOrEqual(321);
  });
});
