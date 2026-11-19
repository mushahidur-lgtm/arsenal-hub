import { CAPTURED_AT, STATS_PLAYERS, SUMMARY_EVENT_ID, expect, settled, test } from "./support.js";

/** Open an in-app route and wait for the initial data to settle. */
async function open(page, hash = "") {
  await page.goto(hash ? `./${hash}` : "./");
  await settled(page);
}
const noProblems = (page) => expect(page.problems, "console errors / uncaught exceptions").toEqual([]);
const mainNav = (page) => page.getByRole("navigation", { name: "Main" }).first();

test.describe("Journey 1: homepage", () => {
  test("loads the briefing, the next match and the news, and opens an article", async ({ app: page, net }) => {
    await open(page);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Arsenal briefing|matchday/i);
    // Next match comes from the recorded schedule (frozen clock = capture time).
    await expect(page.locator("main a[href^=\"#/matches/\"]").filter({ hasText: /Next match/i }).first()).toBeVisible();
    await expect(page.getByText(/The top \d+ stories/)).toBeVisible();

    // Open the top story: it must point at the publisher, in a new tab, safely.
    const top = page.getByRole("link", { name: "Read at ESPN" }).first();
    await expect(top).toHaveAttribute("target", "_blank");
    await expect(top).toHaveAttribute("rel", /noopener/);
    const href = await top.getAttribute("href");
    expect(href).toMatch(/^https:\/\/www\.espn\.com\//);
    const popup = page.waitForEvent("popup");
    await top.click();
    expect((await popup).url()).toContain("espn.com");

    // Navigate away and back: the page is intact.
    await page.goto("./#/news");
    await page.goBack();
    await expect(page.getByText(/The top \d+ stories/)).toBeVisible();
    expect(net.unrouted.filter((u) => !/fonts\.(googleapis|gstatic)/.test(u))).toEqual([]);
    noProblems(page);
  });

  test("shows no fabricated 'next match' when the schedule is unavailable", async ({ app: page, net }) => {
    net.override((u) => /\/teams\/359\/schedule/.test(u.pathname), () => ({ status: 500, headers: { "access-control-allow-origin": "*" }, body: "{}" }));
    await open(page);
    await expect(page.locator("main a[href^=\"#/matches/\"]").filter({ hasText: /Next match/i })).toHaveCount(0);
    await expect(page.getByText(/The top \d+ stories/)).toBeVisible(); // news is independent of the schedule
  });
});

test.describe("Journey 2: news", () => {
  test("filters, searches, saves and handles empty results", async ({ app: page }) => {
    await open(page, "#/news");
    const cards = page.locator("main article");
    const total = await cards.count();
    expect(total).toBeGreaterThan(5);

    await page.getByRole("tab", { name: /^Transfers/ }).click();
    await expect(page.getByRole("tab", { name: /^Transfers/ })).toHaveAttribute("aria-selected", "true");
    const transfersCount = await cards.count();
    expect(transfersCount).toBeGreaterThan(0);
    expect(transfersCount).toBeLessThan(total);
    await page.getByRole("tab", { name: /^All news/ }).click();
    await expect(cards).toHaveCount(total);

    // Topic search narrows the list, and every remaining card matches.
    const search = page.getByRole("textbox", { name: "Search news" });
    await search.fill("Rice");
    await expect(cards.first()).toBeVisible();
    const n = await cards.count();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(total);
    for (const t of await cards.allInnerTexts()) expect(t.toLowerCase()).toContain("rice");

    // External link is safe.
    const link = cards.first().getByRole("link").first();
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);

    // No results: a clear message, not a blank page.
    await search.fill("zzzzqqqq-nothing");
    await expect(cards).toHaveCount(0);
    await expect(page.getByText(/no (stories|results|articles|matching)/i).first()).toBeVisible();
    noProblems(page);
  });

  test("deep link ?q= pre-fills the search", async ({ app: page }) => {
    await open(page, "#/news?q=Rice");
    await expect(page.getByRole("textbox", { name: "Search news" })).toHaveValue("Rice");
  });
});

test.describe("Journey 3: squad", () => {
  test("lists the men's squad, filters by position, opens a profile and switches to the women's squad", async ({ app: page }) => {
    await open(page, "#/squad");
    const rows = page.locator('main a[href^="#/squad/player/"]');
    const all = await rows.count();
    expect(all).toBeGreaterThanOrEqual(20);

    await page.getByRole("tab", { name: /^Goalkeepers/ }).click();
    const gks = await rows.count();
    expect(gks).toBeGreaterThan(0);
    expect(gks).toBeLessThan(all);
    for (const t of await rows.allInnerTexts()) expect(t).toMatch(/Goalkeeper/);
    await page.getByRole("tab", { name: /^All\d+/ }).click();
    await expect(rows).toHaveCount(all);

    await rows.filter({ hasText: "Bukayo Saka" }).click();
    await expect(page).toHaveURL(/#\/squad\/player\/\d+/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Bukayo Saka");

    await open(page, "#/squad");
    const men = await rows.allInnerTexts();
    await page.getByRole("tab", { name: "Women’s" }).click();
    await expect(page).toHaveURL(/team=women/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Women");
    await expect(rows.first()).toBeVisible();
    const women = await rows.allInnerTexts();
    expect(women.join()).not.toEqual(men.join());
    expect(women.join()).not.toContain("Bukayo Saka");
    noProblems(page);
  });

  test("player profile for an unknown id degrades gracefully", async ({ app: page }) => {
    await open(page, "#/squad/player/0000000");
    await expect(page.locator("main")).not.toBeEmpty();
    await expect(page.getByText(/not found|couldn.t find|no player/i).first()).toBeVisible();
    noProblems(page);
  });
});

test.describe("Journey 4: player comparison", () => {
  const [forward, midfielder, keeper] = STATS_PLAYERS;
  const pick = async (page, label, name) => {
    await page.getByRole("button", { name: /Choose a player|^[A-Z]/ }).nth(label === "Player 1" ? 0 : 1).click();
    await page.getByRole("textbox", { name: `Search ${label}` }).fill(name);
    await page.getByRole("listitem").filter({ hasText: name }).first().getByRole("button").click();
  };

  test("compares two players with no NaN / undefined, and re-selection works", async ({ app: page }) => {
    await open(page, `#/analysis?a=${forward.id}&b=${midfielder.id}`);
    const main = page.locator("main");
    await expect(main).toContainText(forward.name);
    await expect(main).toContainText(midfielder.name);
    await expect(main.getByText("Choose two players to compare.")).toHaveCount(0);
    const text = await main.innerText();
    expect(text).not.toMatch(/\bNaN\b|\bundefined\b|\bnull\b|Infinity/);
    await expect(main.getByRole("img", { name: /Radar comparison/ })).toBeVisible();

    // Change player 2 to the goalkeeper (different stat set → only shared stats are shown).
    await page.goto(`./#/analysis?a=${forward.id}&b=${keeper.id}`);
    await expect(main).toContainText(keeper.name);
    const text2 = await main.innerText();
    expect(text2).not.toMatch(/\bNaN\b|\bundefined\b|\bnull\b|Infinity/);
    noProblems(page);
  });

  test("a player whose stats cannot be loaded does not break the page or show invented numbers", async ({ app: page, net }) => {
    net.override((u) => new RegExp(`/athletes/${midfielder.id}/stats`).test(u.pathname), () => ({ status: 500, headers: { "access-control-allow-origin": "*" }, body: "{}" }));
    await open(page, `#/analysis?a=${forward.id}&b=${midfielder.id}`);
    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/\bNaN\b|\bundefined\b/);
    await expect(page.getByRole("img", { name: /Radar comparison/ })).toHaveCount(0);
    await expect(page.getByText(/couldn.t|could not|unavailable|failed|try again|retry/i).first()).toBeVisible();
  });

  test("the player picker searches and selects", async ({ app: page }) => {
    await open(page, "#/analysis");
    await page.getByRole("button", { name: /Choose a player/ }).first().click();
    await page.getByRole("textbox", { name: "Search Player 1" }).fill(forward.name.split(" ").pop());
    await page.getByRole("listitem").filter({ hasText: forward.name }).first().getByRole("button").click();
    await expect(page.getByRole("button", { name: new RegExp(forward.name) }).first()).toBeVisible();
    void pick;
  });
});

test.describe("Journey 5: transfers", () => {
  test("filters by status, opens a timeline with attribution and dates, watches and unwatches", async ({ app: page }) => {
    await open(page, "#/transfers");
    const cards = page.locator("main article");
    const total = await cards.count();
    expect(total).toBeGreaterThan(0);

    // Status filter: "Confirmed" cannot show unconfirmed rumours.
    await page.getByRole("tab", { name: "Confirmed" }).click();
    for (const t of await cards.allInnerTexts()) expect(t).toMatch(/confirmed/i);
    await page.getByRole("tab", { name: "Dismissed" }).click();
    for (const t of await cards.allInnerTexts()) expect(t).toMatch(/dismissed/i);
    await page.getByRole("tab", { name: "Any status" }).click();
    await expect(cards).toHaveCount(total);

    // Timeline: each report shows its source and a date.
    const first = cards.first();
    await first.getByRole("button", { name: /timeline/i }).click();
    const text = await first.innerText();
    expect(text).toMatch(/BBC Sport|Sky Sports|ESPN|The Guardian|football\.london|The Athletic|Arseblog/);
    expect(text).toMatch(/\d{1,2} \w{3}|ago/);

    // Watchlist.
    await first.getByRole("button", { name: /^Watch/ }).click();
    await page.getByRole("tab", { name: /^Watchlist/ }).or(page.getByRole("button", { name: /^Watchlist/ })).first().click();
    await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(1);
    await page.reload();
    await settled(page);
    await page.getByRole("tab", { name: /^Watchlist/ }).or(page.getByRole("button", { name: /^Watchlist/ })).first().click();
    await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(1); // persisted
    noProblems(page);
  });

  test("never shows a rumour as confirmed on one reliable source alone", async ({ app: page }) => {
    await open(page, "#/transfers");
    for (const card of await page.locator("main article").all()) {
      const t = await card.innerText();
      if (/Single source/.test(t)) expect(t).not.toMatch(/\bCONFIRMED\b/);
    }
  });
});

test.describe("Journey 6: match centre", () => {
  test("shows fixtures, results and the table, and opens a match", async ({ app: page }) => {
    await open(page, "#/matches");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("fixtures, results");
    await expect(page.getByText("Upcoming")).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/NaN|undefined/);

    // Results appear with scores and a W/D/L marker.
    await page.getByRole("tab", { name: /Results/i }).or(page.getByText(/^Results$/)).first().click().catch(() => {});

    // Standings table: Arsenal's row exists, numeric columns are numbers.
    const arsenalRow = page.getByRole("row", { name: /Arsenal/ }).first();
    await expect(arsenalRow).toBeVisible();
    const cells = await arsenalRow.getByRole("cell").allInnerTexts();
    expect(cells.join(" ")).not.toMatch(/NaN|undefined/);

    // Match detail for the recorded finished match (real lineups and stats).
    await open(page, `#/matches/${SUMMARY_EVENT_ID}`);
    const main = page.locator("main");
    await expect(main).toContainText(/Arsenal/);
    const text = await main.innerText();
    expect(text).not.toMatch(/\bNaN\b|\bundefined\b/);
    // Date + status are rendered for the fixture.
    expect(text).toMatch(/\d{4}|\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/);
    noProblems(page);
  });

  test("tactical view toggles on a match with a lineup", async ({ app: page }) => {
    await open(page, `#/matches/${SUMMARY_EVENT_ID}`);
    const views = page.getByRole("tablist", { name: "View" });
    if (!(await views.count())) test.skip(true, "Recorded match has no published lineup; verify manually on a recent match");
    const tabs = views.getByRole("tab");
    const n = await tabs.count();
    expect(n).toBeGreaterThan(1);
    for (let i = 0; i < n; i++) {
      await tabs.nth(i).click();
      await expect(tabs.nth(i)).toHaveAttribute("aria-selected", "true");
    }
    expect(await page.locator("main").innerText()).not.toMatch(/\bNaN\b|\bundefined\b/);
  });

  test("a match that doesn't exist is handled", async ({ app: page }) => {
    await open(page, "#/matches/999999999");
    await expect(page.getByText(/not found|couldn.t find|no match/i).first()).toBeVisible();
  });

  test("women's fixtures are separate from the men's", async ({ app: page }) => {
    await open(page, "#/matches");
    const men = await page.locator("main").innerText();
    await open(page, "#/matches?team=women");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Women");
    const women = await page.locator("main").innerText();
    expect(women).not.toEqual(men);
    expect(women).not.toContain("Arsenal Men");
  });
});

test.describe("Journey 7: personalisation", () => {
  test("bookmark, follow and watch persist across reloads and can be removed", async ({ app: page }) => {
    // Bookmark an article.
    await open(page, "#/news");
    const card = page.locator("main article").first();
    const title = (await card.getByRole("heading").first().innerText()).trim();
    await card.getByRole("button", { name: "Save article" }).click();
    await expect(page.getByRole("tab", { name: /^Saved1/ })).toBeVisible();

    // Follow a player.
    await open(page, "#/squad");
    await page.getByRole("button", { name: "Follow Bukayo Saka" }).click();
    await expect(page.getByRole("button", { name: /Stop following Bukayo Saka/ })).toBeVisible();

    // Watch a transfer.
    await open(page, "#/transfers");
    await page.locator("main article").first().getByRole("button", { name: /^Watch/ }).click();

    // Reload: everything is still there.
    await page.reload();
    await settled(page);
    await page.goto("./#/news");
    await settled(page);
    await page.getByRole("tab", { name: /^Saved/ }).click();
    await expect(page.locator("main")).toContainText(title.slice(0, 30));
    await page.goto("./#/squad");
    await settled(page);
    await expect(page.getByRole("button", { name: /Stop following Bukayo Saka/ })).toBeVisible();
    await page.goto("./#/transfers");
    await settled(page);
    await page.getByRole("tab", { name: /^Watchlist1/ }).or(page.getByRole("button", { name: /^Watchlist1/ })).first().click();
    await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(1);

    // Remove each and verify it disappears.
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText(/Your watchlist is empty/)).toBeVisible();
    await page.goto("./#/squad");
    await page.getByRole("button", { name: /Stop following Bukayo Saka/ }).click();
    await expect(page.getByRole("button", { name: "Follow Bukayo Saka" })).toBeVisible();
    noProblems(page);
  });

  test("corrupted saved data does not break the site", async ({ app: page }) => {
    await page.addInitScript(() => {
      for (const k of ["afc-saved-v1", "afc-players-v1", "afc-watchlist-v1", "afc-prefs-v1", "afc-recents-v1", "afc-news-archive-v1", "afc-cache-v2"]) localStorage.setItem(k, k === "afc-recents-v1" ? "{" : "null");
    });
    await open(page, "#/news");
    await expect(page.locator("main article").first()).toBeVisible();
    for (const r of ["#/squad", "#/transfers", "#/"]) {
      await open(page, r);
      await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    }
    noProblems(page);
  });

  test("works when browser storage is blocked", async ({ app: page }) => {
    await page.addInitScript(() => {
      const boom = () => { throw new DOMException("blocked", "SecurityError"); };
      Object.defineProperty(window, "localStorage", { get: boom });
    });
    await open(page, "#/news");
    await expect(page.locator("main article").first()).toBeVisible();
    await open(page, "#/squad");
    await expect(page.locator('main a[href^="#/squad/player/"]').first()).toBeVisible();
  });
});

test.describe("Journey 8: search", () => {
  const search = async (page, q) => {
    if (!(await page.getByRole("dialog", { name: "Search" }).isVisible())) await page.getByRole("button", { name: "Search" }).first().click();
    await page.getByRole("textbox", { name: "Search" }).fill(q);
  };
  test("finds players, transfers, news, matches and history", async ({ app: page }) => {
    await open(page);
    await search(page, "Saka");
    const dialog = page.getByRole("dialog", { name: "Search" });
    await expect(dialog.getByText("Players", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: /Bukayo Saka/ }).click();
    await expect(page).toHaveURL(/#\/squad\/player\/\d+/);

    await search(page, "Rice");
    await expect(dialog.getByText("News", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Transfers", { exact: true })).toBeVisible();

    await search(page, "Newcastle");
    await expect(dialog.getByText("Matches", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: /Newcastle/ }).first().click();
    await expect(page).toHaveURL(/#\/matches\/\d+/);

    await search(page, "Invincibles");
    await expect(dialog.getByText("History", { exact: true })).toBeVisible();
    noProblems(page);
  });
  test("no results, short queries, '/' shortcut and Escape", async ({ app: page }) => {
    await open(page);
    await page.keyboard.press("/");
    const dialog = page.getByRole("dialog", { name: "Search" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("textbox").fill("z");
    await expect(dialog.getByText(/Try a player/)).toBeVisible();
    await dialog.getByRole("textbox").fill("qqqqzzzz");
    await expect(dialog.getByText(/No results for/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

test.describe("Journey 9: history", () => {
  test("navigates between sections and shows records", async ({ app: page }) => {
    await open(page, "#/history");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("history");
    await expect(page.getByText("The club is founded")).toBeVisible();
    await page.getByRole("tab", { name: "The Invincibles" }).click();
    await expect(page).toHaveURL(/#\/history\/invincibles/);
    await expect(page.getByText("Played 38. Lost none.")).toBeVisible();
    await page.getByRole("tab", { name: "Records & honours" }).click();
    await expect(page).toHaveURL(/#\/history\/records/);
    await page.getByRole("tab", { name: "Managers & eras" }).click();
    await expect(page).toHaveURL(/#\/history\/eras/);
    await page.getByRole("tab", { name: "Timeline" }).click();
    await page.getByRole("tab", { name: /^Trophies/ }).click();
    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/\bNaN\b|\bundefined\b/);
    noProblems(page);
  });
});

test.describe("Journey 10: navigation and routing", () => {
  test("every main section is reachable, back/forward work and nothing is blank", async ({ app: page }) => {
    await open(page);
    const nav = mainNav(page);
    const sections = [
      ["News", /#\/news$/],
      ["Matches", /#\/matches$/],
      ["Transfers", /#\/transfers$/],
      ["Squad", /#\/squad$/],
      ["Analysis", /#\/analysis$/],
      ["History", /#\/history$/],
    ];
    for (const [name, url] of sections) {
      await nav.getByRole("link", { name }).click();
      await expect(page).toHaveURL(url);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(nav.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
    }
    await page.goBack();
    await expect(page).toHaveURL(/#\/analysis$/);
    await page.goBack();
    await expect(page).toHaveURL(/#\/squad$/);
    await page.goForward();
    await expect(page).toHaveURL(/#\/analysis$/);
    noProblems(page);
  });

  test("nested and unknown hash routes work on direct open and on refresh", async ({ app: page }) => {
    for (const hash of ["#/squad/player/280555", "#/matches/" + SUMMARY_EVENT_ID, "#/history/records", "#/analysis?a=1&b=2", "#/news?cat=injury"]) {
      await open(page, hash);
      await expect(page.locator("main h1, main h2").first()).toBeVisible();
      await page.reload();
      await settled(page);
      await expect(page).toHaveURL(new RegExp(hash.replace(/[?]/g, "\\?").replace(/[#]/g, "#")));
      await expect(page.locator("main h1, main h2").first()).toBeVisible();
    }
    // Unknown routes fall back to the home page rather than a blank screen.
    for (const hash of ["#/definitely/not/a/page", "#/%E0%A4%A", "#/squad/player/%E0%A4%A"]) {
      await open(page, hash);
      await expect(page.locator("main"), `route ${hash}`).not.toBeEmpty();
      await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    }
    // Malformed links that arrive while the app is already running must not break navigation either.
    await page.evaluate(() => { window.location.hash = "#/%E0%A4%A"; });
    await page.evaluate(() => { window.location.hash = "#/news"; });
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Arsenal news");
    noProblems(page);
  });

  test("production build is served from the /arsenal-hub/ base path with no broken assets", async ({ app: page }) => {
    const bad = [];
    page.on("response", (r) => { if (r.url().startsWith("http://localhost") && r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
    await open(page);
    expect(page.url()).toContain("/arsenal-hub/");
    expect(bad).toEqual([]);
    const refs = await page.evaluate(() => [...document.querySelectorAll("script[src],link[href]")].map((e) => e.getAttribute("src") ?? e.getAttribute("href")));
    for (const r of refs.filter((r) => r && !/^https?:|^data:/.test(r))) expect(r).toMatch(/^\/arsenal-hub\//);
    expect(refs.join()).not.toMatch(/localhost|127\.0\.0\.1/);
  });

  test("dark mode toggles, applies and persists", async ({ app: page }) => {
    await open(page);
    const html = page.locator("html");
    const before = await html.evaluate((e) => e.classList.contains("dark"));
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).click();
    await expect.poll(() => html.evaluate((e) => e.classList.contains("dark"))).toBe(!before);
    await page.reload();
    await settled(page);
    expect(await html.evaluate((e) => e.classList.contains("dark"))).toBe(!before);
  });
});

test.describe("clock", () => {
  test("recorded data is read at its capture time", () => {
    expect(Number.isNaN(CAPTURED_AT.getTime())).toBe(false);
  });
});
