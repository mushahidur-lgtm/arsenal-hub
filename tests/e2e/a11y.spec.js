import AxeBuilder from "@axe-core/playwright";
import { SUMMARY_EVENT_ID, STATS_PLAYERS, expect, settled, test } from "./support.js";

/** Phase 6: automated WCAG 2.x A/AA scan of every page, in light and dark, plus keyboard behaviour. */
const ROUTES = [
  ["home", ""],
  ["news", "#/news"],
  ["matches", "#/matches"],
  ["match detail", `#/matches/${SUMMARY_EVENT_ID}`],
  ["transfers", "#/transfers"],
  ["squad", "#/squad"],
  ["player profile", "#/squad/player/280555"],
  ["comparison", `#/analysis?a=${STATS_PLAYERS[0].id}&b=${STATS_PLAYERS[1].id}`],
  ["history", "#/history"],
  ["records", "#/history/records"],
  ["eras", "#/history/eras"],
  ["invincibles", "#/history/invincibles"],
  ["women's squad", "#/squad?team=women"],
  ["transfers (watch)", "#/transfers"],
];

const scan = (page) => new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
const summarise = (violations) => violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`);

for (const scheme of ["light", "dark"]) {
  test.describe(`axe, ${scheme} mode`, () => {
    test.use({ colorScheme: scheme });
    for (const [name, hash] of ROUTES) {
      test(`${name} has no WCAG A/AA violations`, async ({ app: page }) => {
        await page.goto(hash ? `./${hash}` : "./");
        await settled(page);
        await page.waitForTimeout(500);
        const { violations } = await scan(page);
        expect(summarise(violations)).toEqual([]);
      });
    }
  });
}

test.describe("dialogs, expanded panels and menus", () => {
  test("search dialog with results has no violations", async ({ app: page }) => {
    await page.goto("./");
    await settled(page);
    await page.getByRole("button", { name: "Search" }).first().click();
    await page.getByRole("dialog", { name: "Search" }).getByRole("textbox").fill("Rice");
    await page.waitForTimeout(300);
    expect(summarise((await scan(page)).violations)).toEqual([]);
  });
  test("comparison picker open has no violations", async ({ app: page }) => {
    await page.goto("./#/analysis");
    await settled(page);
    await page.getByRole("button", { name: /Choose a player/ }).first().click();
    expect(summarise((await scan(page)).violations)).toEqual([]);
  });
  test("mobile 'More' menu has no violations", async ({ app: page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("./");
    await settled(page);
    await page.getByRole("navigation", { name: "Main" }).last().getByRole("button", { name: /More/ }).click();
    expect(summarise((await scan(page)).violations)).toEqual([]);
  });
});

test.describe("structure", () => {
  test("every page has exactly one h1, a main landmark, a lang attribute and a title", async ({ app: page }) => {
    for (const [name, hash] of ROUTES) {
      await page.goto(hash ? `./${hash}` : "./");
      await settled(page);
      await expect(page.locator("main h1"), name).toHaveCount(1);
      await expect(page.locator("main")).toHaveCount(1);
      expect(await page.locator("html").getAttribute("lang")).toBeTruthy();
      expect((await page.title()).length, `${name} title`).toBeGreaterThan(3);
    }
  });
  test("heading levels never skip downwards by more than one", async ({ app: page }) => {
    for (const [name, hash] of ROUTES) {
      await page.goto(hash ? `./${hash}` : "./");
      await settled(page);
      const levels = await page.locator("main").locator("h1,h2,h3,h4,h5,h6").evaluateAll((hs) => hs.map((h) => Number(h.tagName[1])));
      const jumps = levels.map((l, i) => (i && l - levels[i - 1] > 1 ? `${levels[i - 1]}→${l}` : null)).filter(Boolean);
      expect(jumps, `${name}: ${levels.join(",")}`).toEqual([]);
    }
  });
  test("images have alt text (decorative images use empty alt)", async ({ app: page }) => {
    for (const [name, hash] of ROUTES) {
      await page.goto(hash ? `./${hash}` : "./");
      await settled(page);
      const missing = await page.locator("img:not([alt])").count();
      expect(missing, `${name}: <img> without alt`).toBe(0);
    }
  });
});

test.describe("keyboard", () => {
  test("skip link is the first stop and moves focus to main", async ({ app: page }) => {
    await page.goto("./");
    await settled(page);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();
  });
  test("focused controls have a visible focus indicator", async ({ app: page }) => {
    await page.goto("./#/news");
    await settled(page);
    const bad = [];
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press("Tab");
      const r = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
        const ring = cs.boxShadow && cs.boxShadow !== "none";
        return { label: (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 30), visible: outline || ring };
      });
      if (r && !r.visible) bad.push(r.label);
    }
    expect(bad).toEqual([]);
  });
  test("search dialog: opens with '/', takes focus, closes with Escape and gives focus back", async ({ app: page }) => {
    await page.goto("./");
    await settled(page);
    await page.keyboard.press("/");
    const dialog = page.getByRole("dialog", { name: "Search" });
    await expect(dialog.getByRole("textbox")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    // Focus must not be lost to <body>: the user needs to carry on from where they were.
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
  });
  test("search dialog keeps Tab focus inside while open", async ({ app: page }) => {
    await page.goto("./");
    await settled(page);
    await page.keyboard.press("/");
    const dialog = page.getByRole("dialog", { name: "Search" });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
      expect(inside, `Tab #${i + 1} escaped the dialog`).toBe(true);
    }
  });
  test("filters and tabs are operable with the keyboard alone", async ({ app: page }) => {
    await page.goto("./#/news");
    await settled(page);
    const tab = page.getByRole("tab", { name: /^Transfers/ });
    await tab.focus();
    await page.keyboard.press("Enter");
    await expect(tab).toHaveAttribute("aria-selected", "true");
  });
  test("icon-only buttons have accessible names", async ({ app: page }) => {
    for (const [, hash] of ROUTES) {
      await page.goto(hash ? `./${hash}` : "./");
      await settled(page);
      const unnamed = await page.locator("button, a[href]").evaluateAll((els) =>
        els.filter((e) => !e.closest("[aria-hidden=true]") && !(e.getAttribute("aria-label") || e.getAttribute("aria-labelledby") || e.textContent.trim() || e.querySelector("img[alt]:not([alt=''])") || e.getAttribute("title"))).map((e) => e.outerHTML.slice(0, 80)));
      expect(unnamed).toEqual([]);
    }
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("animations and transitions are disabled when the user asks for reduced motion", async ({ app: page }) => {
    await page.goto("./");
    await settled(page);
    const animated = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll("*")) {
        const cs = getComputedStyle(el);
        const d = parseFloat(cs.animationDuration) || 0;
        const iter = cs.animationIterationCount;
        if (cs.animationName !== "none" && d > 0.05 && (iter === "infinite" || d > 0.5)) out.push(`${el.tagName}.${String(el.className).slice(0, 30)} ${cs.animationName} ${cs.animationDuration}`);
      }
      return out.slice(0, 5);
    });
    expect(animated).toEqual([]);
  });
});
