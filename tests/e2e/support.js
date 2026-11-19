import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test as base, expect } from "@playwright/test";

const dir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const read = (name) => readFileSync(join(dir, name));
export const CAPTURED_AT = new Date(JSON.parse(read("captured-at.json").toString()).at);
export const STATS_PLAYERS = JSON.parse(read("stats-players.json").toString());
const summaryMeta = JSON.parse(read("summary-meta.json").toString());
export const SUMMARY_EVENT_ID = summaryMeta.id;

const CORS = { "access-control-allow-origin": "*" };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

const json = (body, status = 200) => ({ status, headers: { ...CORS, "content-type": "application/json" }, body: Buffer.isBuffer(body) || typeof body === "string" ? body : JSON.stringify(body) });
const file = (name, type = "application/json") => ({ status: 200, headers: { ...CORS, "content-type": type }, body: read(name) });
const fail = (status = 500) => json({ error: "mocked failure" }, status);

/** Default replay of every external host the app talks to. `null` means "not handled here". */
export function defaultResponse(u, request) {
  const { hostname, pathname, searchParams } = u;
  const full = u.href;

  if (hostname === "site.api.espn.com" || hostname === "site.web.api.espn.com") {
    const fixtureFlag = searchParams.get("fixture") === "true";
    if (/\/teams\/359\/schedule$/.test(pathname)) return file(fixtureFlag ? "schedule-fixtures.json" : "schedule.json");
    if (/\/teams\/19973\/schedule$/.test(pathname)) return file(fixtureFlag ? "women-schedule-fixtures.json" : "women-schedule.json");
    if (/\/teams\/359\/roster$/.test(pathname)) return file("roster.json");
    if (/\/teams\/19973\/roster$/.test(pathname)) return file("women-roster.json");
    if (/\/eng\.w\.1\/standings$/.test(pathname)) return file("women-standings.json");
    if (/\/eng\.1\/standings$/.test(pathname)) return file("standings.json");
    if (/\/eng\.1\/news$/.test(pathname)) return file(searchParams.get("team") ? "espn-news-arsenal.json" : "espn-news-pl.json");
    if (/\/uefa\.champions\/news$/.test(pathname)) return file("espn-news-ucl.json");
    if (/\/summary$/.test(pathname)) return searchParams.get("event") === SUMMARY_EVENT_ID ? file("summary.json") : fail(404);
    const stats = pathname.match(/\/athletes\/(\d+)\/stats$/);
    if (stats) {
      const name = `stats-${stats[1]}-${searchParams.get("league") ?? "default"}.json`;
      return existsSync(join(dir, name)) ? file(name) : fail(404);
    }
    return fail(404); // team summary, bios, athlete search…: optional enrichment
  }
  if (hostname === "api.rss2json.com") return json({ status: "error", message: "mocked: use raw feeds" }, 500);
  if (hostname === "feeds.bbci.co.uk") return file("feed-bbc.xml", "application/xml");
  if (hostname === "www.theguardian.com") return file("feed-guardian.xml", "application/xml");
  if (hostname === "www.skysports.com") return file("feed-sky.xml", "application/xml");
  if (/(^|\.)wikipedia\.org$/.test(hostname)) return fail(404);
  // Publisher pages opened from "Read at …" links: a stand-in document, so we can assert the link target without leaving the sandbox.
  if (request.resourceType() === "document") return { status: 200, headers: { "content-type": "text/html" }, body: `<!doctype html><title>external page</title><p>${hostname}</p>` };
  if (/(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(hostname)) return { status: 200, headers: { ...CORS, "content-type": "text/css" }, body: "" };
  if (request.resourceType() === "image") return { status: 200, headers: { ...CORS, "content-type": "image/png" }, body: PNG };
  if (full.includes("/__proxy") || /allorigins|codetabs|nytimes|football\.london|arseblog|reddit/.test(hostname)) return fail(500);
  return null;
}

/**
 * Playwright fixtures:
 *  - `net`: the network mock. `net.override(matcher, responder)` injects failures/slow responses
 *    for a single test; `net.requests` records every external call; `net.unrouted` lists anything
 *    that nothing handled (these are aborted, so a test can never silently reach the internet).
 *  - `app`: a page with a frozen clock (the capture time of the recorded data) and collected
 *    console errors / uncaught exceptions.
 */
export const test = base.extend({
  net: async ({ context }, use) => {
    const overrides = [];
    const net = { requests: [], unrouted: [], override: (match, respond) => overrides.unshift({ match, respond }) };
    await context.route(
      (url) => !["localhost", "127.0.0.1"].includes(url.hostname),
      async (route) => {
        const request = route.request();
        const u = new URL(request.url());
        net.requests.push(u.href);
        for (const o of overrides) {
          if (o.match(u, request)) {
            const r = await o.respond(u, request, route);
            if (r === "abort") return route.abort("failed");
            if (r) return route.fulfill(r);
          }
        }
        const res = defaultResponse(u, request);
        if (!res) {
          net.unrouted.push(u.href);
          return route.abort("blockedbyclient");
        }
        return route.fulfill(res);
      }
    );
    await use(net);
  },
  app: async ({ page, net }, use) => {
    void net;
    const problems = [];
    page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      // Mocked 4xx/5xx responses are logged by the browser itself; they are expected in failure tests.
      if (m.type() === "error" && !/Failed to load resource|net::ERR|blocked by CORS|NetworkError|Cross-Origin Request Blocked|CORS request did not succeed/i.test(m.text())) problems.push(`console.error: ${m.text()}`);
    });
    await page.clock.setFixedTime(CAPTURED_AT);
    page.problems = problems;
    await use(page);
  },
});

export { expect };

/** Waits until the first data sources have settled (no spinners left on the page). */
export async function settled(page) {
  await page.waitForLoadState("networkidle");
}
