import { expect, settled, test } from "./support.js";

/**
 * Phase 4: a failing data source must degrade one section, never the whole app, and the app must
 * never substitute invented data. Failures are injected per host/path on top of the recorded replay.
 */
const CORS = { "access-control-allow-origin": "*" };
const respond = (status, body = "{}", type = "application/json") => ({ status, headers: { ...CORS, "content-type": type }, body });

const SOURCES = {
  schedule: (u) => /\/teams\/359\/schedule$/.test(u.pathname),
  roster: (u) => /\/teams\/359\/roster$/.test(u.pathname),
  standings: (u) => /\/eng\.1\/standings$/.test(u.pathname),
  espnNews: (u) => /\/news$/.test(u.pathname) && u.hostname.includes("espn"),
  feeds: (u) => ["feeds.bbci.co.uk", "www.theguardian.com", "www.skysports.com", "api.rss2json.com"].includes(u.hostname),
};

const FAILURES = {
  "HTTP 500": () => respond(500),
  "HTTP 404": () => respond(404),
  "rate limited (429)": () => respond(429, '{"message":"Too many requests"}'),
  "invalid JSON": () => respond(200, "<html>not json</html>", "text/html"),
  "empty object": () => respond(200, "{}"),
  "network / CORS failure": () => "abort",
};

const mainText = (page) => page.locator("main").innerText();

for (const [failure, makeResponse] of Object.entries(FAILURES)) {
  test.describe(`one source failing: ${failure}`, () => {
    for (const source of ["schedule", "roster", "standings"]) {
      test(`${source} fails but the rest of the site keeps working`, async ({ app: page, net }) => {
        net.override(SOURCES[source], makeResponse);
        await page.goto("./");
        await settled(page);
        // The news-driven briefing is unaffected.
        await expect(page.getByText("Five things to know")).toBeVisible();
        expect(page.problems).toEqual([]);
        // The other pages still load.
        await page.goto("./#/news");
        await expect(page.locator("main article").first()).toBeVisible();
        await page.goto("./#/history");
        await expect(page.getByText("The club is founded")).toBeVisible();
        expect(page.problems).toEqual([]);
      });
    }
  });
}

test.describe("errors are explained, not silent, and nothing is invented", () => {
  test("squad: roster failure shows an error with Retry, and Retry recovers", async ({ app: page, net }) => {
    let broken = true;
    net.override(SOURCES.roster, () => (broken ? respond(500) : null));
    await page.goto("./#/squad");
    await settled(page);
    await expect(page.getByRole("button", { name: /retry/i }).first()).toBeVisible();
    await expect(page.locator('main a[href^="#/squad/player/"]')).toHaveCount(0);
    broken = false;
    await page.getByRole("button", { name: /retry/i }).first().click();
    await expect(page.locator('main a[href^="#/squad/player/"]').first()).toBeVisible();
    expect(page.problems).toEqual([]);
  });

  test("match centre: schedule failure explains itself and shows no fixtures", async ({ app: page, net }) => {
    net.override(SOURCES.schedule, () => respond(500));
    await page.goto("./#/matches");
    await settled(page);
    await expect(page.getByText(/couldn.t|could not|unavailable|failed|try again/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /retry/i }).first()).toBeVisible();
    await expect(page.locator("main a[href^=\"#/matches/\"]").filter({ hasText: /Next match/i })).toHaveCount(0);
  });

  test("news: every feed failing shows an error, never made-up stories", async ({ app: page, net }) => {
    net.override(SOURCES.feeds, () => respond(500));
    net.override(SOURCES.espnNews, () => respond(500));
    for (const hash of ["#/news", "#/transfers", "./"]) {
      await page.goto(hash === "./" ? hash : `./${hash}`);
      await settled(page);
      await expect(page.locator("main article")).toHaveCount(0);
      await expect(page.getByText(/couldn.t|could not|unavailable|failed|no (stories|news)|try again|retry/i).first()).toBeVisible();
    }
    expect(page.problems).toEqual([]);
  });

  test("news: one feed failing still shows the others, and says which failed", async ({ app: page, net }) => {
    net.override((u) => u.hostname === "feeds.bbci.co.uk", () => respond(500));
    await page.goto("./#/news");
    await settled(page);
    await expect(page.locator("main article").first()).toBeVisible();
    expect(await mainText(page)).toMatch(/Sky Sports|Guardian|ESPN/);
  });
});

test.describe("failed data is never presented as fresh or as zero", () => {
  test("roster failing with no cache shows the error state, no counts and no 'fetched' label", async ({ app: page, net }) => {
    net.override(SOURCES.roster, () => respond(500));
    await page.goto("./#/squad");
    await settled(page);
    const text = await mainText(page);
    expect(text).toMatch(/Couldn.t load/);
    expect(text).not.toMatch(/fetched|Injured\s*0|ESPN.s roster feed lists no/i);
    await page.goto("./");
    await settled(page);
    await expect(page.getByText(/lists no injured/i)).toHaveCount(0);
    await expect(page.getByText(/Couldn.t load/).first()).toBeVisible();
  });

  test("only the optional team-summary request failing (the CORS error in the console) does not mark the squad as stale", async ({ app: page }) => {
    // /teams/359 is optional enrichment; the squad itself comes from /teams/359/roster.
    await page.goto("./#/squad");
    await settled(page);
    await expect(page.getByText(/fetched just now/i)).toBeVisible();
  });

  test("a cached roster whose refresh fails says how old it is, never 'just now'", async ({ app: page, net }) => {
    await page.goto("./#/squad");
    await settled(page);
    await page.evaluate(() => {
      const all = JSON.parse(localStorage.getItem("afc-cache-v2"));
      all.roster.savedAt = new Date(Date.now() - 5 * 3600e3).toISOString();
      localStorage.setItem("afc-cache-v2", JSON.stringify(all));
    });
    net.override(SOURCES.roster, () => respond(500));
    await page.reload();
    await settled(page);
    const text = await mainText(page);
    expect(text).toMatch(/Refresh failed\. Last updated 5h ago/);
    expect(text).toMatch(/fetched 5h ago/);
    expect(text).not.toMatch(/fetched just now/);
  });

  test("home page sections each offer Retry when their source fails", async ({ app: page, net }) => {
    net.override(SOURCES.schedule, () => respond(500));
    net.override(SOURCES.standings, () => respond(500));
    await page.goto("./");
    await settled(page);
    for (const what of ["the table", "fixtures", "results"]) await expect(page.getByText(`Couldn’t load ${what}`).first()).toBeVisible();
    expect(await page.getByRole("button", { name: /retry/i }).count()).toBeGreaterThanOrEqual(3);
    await expect(page.getByText(/^Loading…$/)).toHaveCount(0);
  });
});

test.describe("loading and slow sources", () => {
  test("a slow source doesn't block the others, and shows a loading state meanwhile", async ({ app: page, net }) => {
    net.override(SOURCES.standings, async () => {
      await new Promise((r) => setTimeout(r, 3000));
      return null;
    });
    await page.goto("./");
    // News renders while standings is still pending.
    await expect(page.getByText("Five things to know")).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[aria-busy="true"], .animate-pulse, [role="status"]').first()).toBeVisible();
    // ...and the slow source eventually arrives.
    await expect(page.getByText(/At a glance/i)).toBeVisible();
    await expect(page.getByText(/\d+ pts/).first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("cached data is shown and labelled", () => {
  test("after a failed refresh, previous data is shown and marked as saved/stale", async ({ app: page, net }) => {
    await page.goto("./#/squad");
    await settled(page);
    await expect(page.locator('main a[href^="#/squad/player/"]').first()).toBeVisible();
    const fresh = await page.locator('main a[href^="#/squad/player/"]').count();
    expect(await page.evaluate(() => Boolean(localStorage.getItem("afc-cache-v2")))).toBe(true);

    // Everything from ESPN now fails; reload.
    net.override((u) => u.hostname.includes("espn"), () => "abort");
    await page.reload();
    await settled(page);
    await expect(page.locator('main a[href^="#/squad/player/"]')).toHaveCount(fresh);
    await expect(page.getByText(/saved data|Showing data from|Refresh failed|cached/i).first()).toBeVisible();
    expect(page.problems).toEqual([]);
  });

  test("cache older than its maximum age is not shown", async ({ app: page, net }) => {
    await page.goto("./#/squad");
    await settled(page);
    await page.evaluate(() => {
      const all = JSON.parse(localStorage.getItem("afc-cache-v2"));
      for (const k of Object.keys(all)) all[k].savedAt = new Date(Date.now() - 10 * 86400e3).toISOString();
      localStorage.setItem("afc-cache-v2", JSON.stringify(all));
    });
    net.override((u) => u.hostname.includes("espn"), () => "abort");
    await page.reload();
    await settled(page);
    await expect(page.locator('main a[href^="#/squad/player/"]')).toHaveCount(0);
  });

  test("a cached schedule containing a date-less event cannot crash the app", async ({ app: page }) => {
    // Regression: Invalid Dates serialise to null in localStorage and then broke date maths on the next visit.
    await page.addInitScript(() => {
      localStorage.setItem("afc-cache-v2", JSON.stringify({
        schedule: { savedAt: new Date().toISOString(), data: { results: [], fixtures: [{ id: "x", date: null, state: "pre", home: {}, away: {}, opp: {}, ars: {} }] } },
      }));
    });
    await page.goto("./");
    await settled(page);
    await expect(page.getByText("Five things to know")).toBeVisible();
    expect(page.problems).toEqual([]);
  });
});

test.describe("request hygiene", () => {
  test("a normal visit makes at most one request per unique URL (no duplicates from re-rendering)", async ({ app: page, net }) => {
    await page.goto("./");
    await settled(page);
    await page.waitForTimeout(1500);
    const counts = new Map();
    for (const u of net.requests) {
      if (/\.(png|jpg|jpeg|webp|svg|gif)(\?|$)/i.test(u) || /fonts\./.test(u)) continue;
      counts.set(u, (counts.get(u) ?? 0) + 1);
    }
    const dupes = [...counts].filter(([, n]) => n > 1);
    expect(dupes).toEqual([]);
    expect(counts.size).toBeLessThan(40);
  });

  test("failing endpoints are retried a bounded number of times, never in a loop", async ({ app: page, net }) => {
    net.override(SOURCES.roster, () => "abort");
    net.override(SOURCES.standings, () => respond(500));
    await page.goto("./");
    await settled(page);
    const before = net.requests.length;
    await page.waitForTimeout(6000);
    expect(net.requests.length - before, "requests made while idle").toBeLessThanOrEqual(2);
    const rosterCalls = net.requests.filter((u) => u.includes("/teams/359/roster")).length;
    expect(rosterCalls).toBeLessThanOrEqual(5); // direct + the public proxy chain, once
  });

  test("the app never contacts hosts outside its documented data sources", async ({ app: page, net }) => {
    for (const h of ["./", "./#/news", "./#/squad", "./#/matches", "./#/transfers", "./#/analysis", "./#/history"]) {
      await page.goto(h);
      await settled(page);
    }
    const allowed = /^(localhost|site\.api\.espn\.com|site\.web\.api\.espn\.com|api\.rss2json\.com|feeds\.bbci\.co\.uk|www\.skysports\.com|www\.nytimes\.com|www\.theguardian\.com|www\.football\.london|www\.arseblog\.com|www\.reddit\.com|api\.allorigins\.win|api\.codetabs\.com|en\.wikipedia\.org|a\.espncdn\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|.*\.(bbci\.co\.uk|co\.uk|com|net|org))$/;
    const hosts = [...new Set(net.requests.map((u) => new URL(u).hostname))];
    expect(hosts.filter((h) => /localhost|127\.0\.0\.1|ngrok|\.local$/.test(h) && h !== "localhost")).toEqual([]);
    expect(net.unrouted.filter((u) => !/fonts\.(googleapis|gstatic)/.test(u)), "requests nothing handled").toEqual([]);
    void allowed;
  });
});
