import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The fetch layer keeps module-level state (memo + in-flight maps), so each test imports
 * a fresh copy. Under Vitest `import.meta.env.DEV` is true, so the proxy chain is
 * [/__proxy, allorigins, codetabs]; "network failure" therefore means four failed calls.
 */
let data;
let n = 0;
const url = () => `https://site.api.espn.com/test/${++n}`;
const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
const status = (code) => ({ ok: false, status: code, json: async () => ({}), text: async () => "" });

beforeEach(async () => {
  vi.resetModules();
  data = await import("../../src/lib/data.js");
});

describe("fetchJSON error handling", () => {
  it("returns parsed JSON on success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ok({ a: 1 })));
    await expect(data.fetchJSON(url())).resolves.toEqual({ a: 1 });
  });
  it.each([404, 500])("surfaces HTTP %i as an http error without retrying or using proxies", async (code) => {
    const f = vi.fn(async () => status(code));
    vi.stubGlobal("fetch", f);
    await expect(data.fetchJSON(url())).rejects.toMatchObject({ kind: "http", message: `HTTP ${code}` });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("surfaces a 429 as a rate-limit error, without retrying through proxies", async () => {
    const f = vi.fn(async () => status(429));
    vi.stubGlobal("fetch", f);
    await expect(data.fetchJSON(url())).rejects.toMatchObject({ kind: "ratelimit" });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("reports invalid JSON as a data error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError("Unexpected token"); } })));
    await expect(data.fetchJSON(url())).rejects.toMatchObject({ kind: "data", message: "Unexpected response format" });
  });
  it("treats a CORS/network failure as retryable via proxies, then gives up with a clear message", async () => {
    const f = vi.fn(async () => { throw new TypeError("Failed to fetch"); });
    vi.stubGlobal("fetch", f);
    await expect(data.fetchJSON(url())).rejects.toMatchObject({ kind: "network", message: expect.stringContaining("CORS") });
    expect(f).toHaveBeenCalledTimes(4); // direct + 3 proxies, no loop
  });
  it("succeeds through a proxy when the direct request is blocked", async () => {
    const f = vi.fn(async (u) => (String(u).startsWith("https://site.api.espn.com") ? Promise.reject(new TypeError("blocked")) : ok({ via: "proxy" })));
    vi.stubGlobal("fetch", f);
    await expect(data.fetchJSON(url())).resolves.toEqual({ via: "proxy" });
  });
  it("gives up on hanging proxies once the 5s overall budget is spent", async () => {
    vi.useFakeTimers();
    const hang = (_u, { signal }) => new Promise((_r, rej) => signal.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" }))));
    vi.stubGlobal("fetch", vi.fn((u, init) => (String(u).startsWith("https://site.api.espn.com") ? Promise.reject(new TypeError("blocked")) : hang(u, init))));
    const p = data.fetchJSON(url());
    const assertion = expect(p).rejects.toMatchObject({ message: expect.stringContaining("proxies") });
    await vi.advanceTimersByTimeAsync(5100);
    await assertion; // settled within ~5s, not 9s + 9s + 9s
  });
  it("aborts slow requests and reports a timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_u, { signal }) => new Promise((_res, rej) => signal.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" }))))));
    const p = data.fetchJSON(url(), { proxy: false, timeoutMs: 5000 });
    const assertion = expect(p).rejects.toMatchObject({ kind: "timeout" });
    await vi.advanceTimersByTimeAsync(5001);
    await assertion;
  });
});

describe("request de-duplication", () => {
  it("shares one in-flight request between simultaneous callers (double renders)", async () => {
    const f = vi.fn(async () => ok({ v: 1 }));
    vi.stubGlobal("fetch", f);
    const u = url();
    await Promise.all([data.fetchJSON(u), data.fetchJSON(u), data.fetchJSON(u)]);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("reuses a recent response, and clearMemo forces a fresh request", async () => {
    const f = vi.fn(async () => ok({ v: 1 }));
    vi.stubGlobal("fetch", f);
    const u = url();
    await data.fetchJSON(u);
    await data.fetchJSON(u);
    expect(f).toHaveBeenCalledTimes(1);
    data.clearMemo();
    await data.fetchJSON(u);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("does not cache failures, so a retry can succeed", async () => {
    const f = vi.fn().mockResolvedValueOnce(status(500)).mockResolvedValueOnce(ok({ v: 2 }));
    vi.stubGlobal("fetch", f);
    const u = url();
    await expect(data.fetchJSON(u)).rejects.toBeTruthy();
    await expect(data.fetchJSON(u)).resolves.toEqual({ v: 2 });
  });
});

describe("independent loaders", () => {
  it("schedule falls back to league-only fixtures and says so", async () => {
    const ev = { id: "1", date: "2025-03-01T15:00:00Z", competitions: [{ status: { type: { state: "pre" } }, competitors: [{ homeAway: "home", team: { id: "359" } }, { homeAway: "away", team: { id: "1" } }] }] };
    vi.stubGlobal("fetch", vi.fn(async (u) => (String(u).includes("/all/teams") ? status(500) : ok({ events: [ev] }))));
    const { data: d, warnings } = await data.LOADERS.schedule();
    expect(d.fixtures).toHaveLength(1);
    expect(warnings).toEqual(["Showing Premier League matches only"]);
  });
  it("one failing news feed does not stop the others (no fabricated replacement)", async () => {
    const rss = (title) => ({ status: "ok", items: [{ title, link: `https://x.test/${title}`, pubDate: "2025-01-10 08:30:00", description: "d" }] });
    vi.stubGlobal("fetch", vi.fn(async (u) => {
      const s = String(u);
      if (s.includes("api.rss2json.com") && s.includes(encodeURIComponent("bbci.co.uk"))) return ok(rss("Arsenal BBC story"));
      if (s.includes("api.rss2json.com")) return status(500);
      if (s.includes("espn.com")) return ok({ articles: [] });
      return status(500);
    }));
    const { data: d, warnings } = await data.LOADERS.arsenalNews();
    expect(d.items.map((i) => i.title)).toContain("Arsenal BBC story");
    expect(d.feeds.some((f) => !f.ok)).toBe(true);
    expect(warnings.length).toBeGreaterThan(0);
  });
  it("throws a descriptive error when every news source fails (so the UI shows an error, not invented stories)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => status(500)));
    await expect(data.LOADERS.arsenalNews()).rejects.toBeInstanceOf(data.FetchError);
  });
  it("does not repeat a failed direct request for CORS-enabled feeds (only the proxies are tried next)", async () => {
    const f = vi.fn(async () => status(500));
    vi.stubGlobal("fetch", f);
    await expect(data.fetchFeed("athletic")).rejects.toBeInstanceOf(data.FetchError);
    const feedUrl = "https://www.nytimes.com/athletic/rss/football/arsenal/";
    const direct = f.mock.calls.filter(([u]) => String(u) === feedUrl);
    expect(direct).toHaveLength(1);
  });
  it("rss2json 'error' payloads count as a failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async (u) => (String(u).includes("rss2json") ? ok({ status: "error", message: "rate limited" }) : status(500))));
    await expect(data.fetchFeed("bbc")).rejects.toBeInstanceOf(data.FetchError);
  });
});
