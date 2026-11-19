import { describe, expect, it } from "vitest";
import { PAGES, homeTabHash, parseHash } from "../../src/lib/route.js";

describe("hash routing", () => {
  it.each([
    ["", "home", []],
    ["#", "home", []],
    ["#/", "home", []],
    ["#/news", "news", []],
    ["#news", "news", []], // no slash after the #
    ["#/news/", "news", []], // trailing slash
    ["#/squad/player/280555", "squad", ["player", "280555"]],
    ["#/matches/401879232", "matches", ["401879232"]],
    ["#/history/records", "history", ["records"]],
    ["#/transfers", "transfers", []],
    ["#/analysis", "analysis", []],
  ])("%j → page %s %j", (hash, page, parts) => {
    const r = parseHash(hash);
    expect(r.page).toBe(page);
    expect(r.parts).toEqual(parts);
  });

  it("reads query strings, including team, comparison ids and home tabs", () => {
    expect(parseHash("#/squad?team=women").query.get("team")).toBe("women");
    expect(parseHash("#/squad/player/1?team=women").parts).toEqual(["player", "1"]);
    const c = parseHash("#/analysis?a=1&b=2&team=women").query;
    expect([c.get("a"), c.get("b"), c.get("team")]).toEqual(["1", "2", "women"]);
    expect(parseHash("#/?tab=table")).toMatchObject({ page: "home" });
    expect(parseHash("#/?tab=table").query.get("tab")).toBe("table");
    expect(parseHash("#/news?cat=injury&q=saka%20contract").query.get("q")).toBe("saka contract");
  });

  it("a second '?' stays part of the query", () => {
    expect(parseHash("#/news?q=what?").query.get("q")).toBe("what?");
  });

  it.each([
    ["#/overview", "home"],
    ["#/fixtures", "matches"],
    ["#/stats", "matches"],
  ])("old tab ids still resolve (%s → %s)", (hash, page) => {
    expect(parseHash(hash).page).toBe(page);
  });

  it.each(["#/definitely/not/a/page", "#/NEWS", "#/news.html", "#//", "#/%20", "#/__proto__", "#/constructor"])("unknown route %j falls back to home", (hash) => {
    expect(parseHash(hash).page).toBe("home");
  });

  it("decodes percent-encoding, and survives invalid encoding instead of throwing", () => {
    expect(parseHash("#/squad/player/a%20b").parts).toEqual(["player", "a b"]);
    for (const bad of ["#/%E0%A4%A", "#/squad/player/%E0%A4%A", "#/news?q=%E0%A4%A", "#/%"]) {
      expect(() => parseHash(bad), bad).not.toThrow();
    }
    expect(parseHash("#/squad/player/%E0%A4%A").parts).toEqual(["player", "%E0%A4%A"]);
  });

  it("tolerates non-string input", () => {
    for (const bad of [undefined, null, 5, {}]) expect(parseHash(bad).page).toBe("home");
  });

  it("knows every page the navigation links to", () => {
    for (const p of PAGES.filter((x) => x !== "home")) expect(parseHash(`#/${p}`).page).toBe(p);
  });

  it("builds home tab hashes ('today' is the bare route) that parse back", () => {
    expect(homeTabHash("today")).toBe("#/");
    for (const tab of ["transfers", "fixtures", "table"]) {
      expect(parseHash(homeTabHash(tab)).query.get("tab")).toBe(tab);
    }
  });
});

import { isChunkError } from "../../src/lib/lazy.js";

describe("chunk load errors", () => {
  it.each([
    ["TypeError", "Failed to fetch dynamically imported module: https://x/assets/history-1.js"],
    ["TypeError", "Importing a module script failed."],
    ["ChunkLoadError", "Loading chunk 3 failed."],
  ])("%s: %s is a chunk error", (name, message) => {
    expect(isChunkError({ name, message })).toBe(true);
  });
  it("ordinary errors are not", () => {
    for (const e of [new Error("boom"), new TypeError("x is not a function"), null, undefined, {}]) expect(isChunkError(e)).toBe(false);
  });
});
