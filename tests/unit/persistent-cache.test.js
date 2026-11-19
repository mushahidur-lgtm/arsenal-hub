import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { LOADERS, cacheConfig, configureCache, getDiagnostics, readCache, useHubData, writeCache } from "../../src/lib/data.js";
import { resetDiagnostics } from "../../src/lib/diagnostics.js";

const DEFAULT_CONFIG = JSON.parse(JSON.stringify(cacheConfig));
const KEY = "afc-cache-v2";
const stored = () => JSON.parse(localStorage.getItem(KEY) ?? "{}");

beforeEach(() => {
  resetDiagnostics();
});
afterEach(() => {
  Object.assign(cacheConfig, JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
  cacheConfig.maxAgeMs = { ...DEFAULT_CONFIG.maxAgeMs };
});

describe("persistent cache: expiry", () => {
  it("round-trips data and revives dates", () => {
    writeCache("standings", { rows: [{ id: "1" }], when: "x" }, new Date("2025-03-01T10:00:00Z"));
    const out = readCache(new Date("2025-03-01T11:00:00Z").getTime());
    expect(out.standings.data.rows).toEqual([{ id: "1" }]);
    expect(out.standings.savedAt).toBeInstanceOf(Date);
  });
  it("drops entries older than the default 3 days and counts them as expired", () => {
    const saved = new Date("2025-03-01T10:00:00Z");
    writeCache("roster", { players: [] }, saved);
    expect(Object.keys(readCache(saved.getTime() + 3 * 86400e3 - 1000))).toEqual(["roster"]);
    expect(readCache(saved.getTime() + 3 * 86400e3 + 1000)).toEqual({});
    expect(getDiagnostics().persistentCache.expired).toBe(1);
  });
  it("max age is configurable per source", () => {
    const saved = new Date("2025-03-01T10:00:00Z");
    writeCache("schedule", { results: [], fixtures: [] }, saved);
    writeCache("roster", { players: [] }, saved);
    configureCache({ maxAgeMs: { schedule: 60e3 } });
    const out = readCache(saved.getTime() + 120e3);
    expect(Object.keys(out)).toEqual(["roster"]); // schedule expired after a minute, roster still within the default
  });
  it("ignores entries with a missing or invalid savedAt", () => {
    localStorage.setItem(KEY, JSON.stringify({ a: { data: 1 }, b: { data: 2, savedAt: "nope" }, c: null, d: { data: 3, savedAt: new Date().toISOString() } }));
    expect(Object.keys(readCache())).toEqual(["d"]);
  });
  it.each(["{bad", "null", "[1]", '"str"'])("survives corrupted storage (%s)", (raw) => {
    localStorage.setItem(KEY, raw);
    expect(readCache()).toEqual({});
    expect(() => writeCache("roster", { players: [] })).not.toThrow();
  });
  it("drops a cached schedule whose dates did not survive storage", () => {
    const now = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify({
      schedule: { savedAt: now, data: { results: [], fixtures: [{ id: "x", date: null }, { id: "y", date: "2025-03-01T10:00:00Z" }] } },
      womenSchedule: { savedAt: now, data: { oops: true } },
    }));
    const out = readCache();
    expect(out.schedule.data.fixtures.map((m) => m.id)).toEqual(["y"]);
    expect(out.womenSchedule).toBeUndefined();
  });
});

describe("persistent cache: size limit and eviction", () => {
  const big = (n) => ({ blob: "x".repeat(n) });
  it("evicts the oldest-saved other sources when over the limit, and keeps the newest", () => {
    configureCache({ maxBytes: 3000 });
    writeCache("a", big(1000), new Date("2025-03-01T10:00:00Z"));
    writeCache("b", big(1000), new Date("2025-03-01T11:00:00Z"));
    writeCache("c", big(1000), new Date("2025-03-01T12:00:00Z")); // total now > 3000 -> evicts a
    expect(Object.keys(stored()).sort()).toEqual(["b", "c"]);
    writeCache("d", big(1500), new Date("2025-03-01T13:00:00Z")); // evicts b, then c if needed
    expect(Object.keys(stored())).toContain("d");
    expect(localStorage.getItem(KEY).length).toBeLessThanOrEqual(3000);
    expect(getDiagnostics().persistentCache.evicted).toBeGreaterThanOrEqual(2);
  });
  it("overwriting a source doesn't evict others unnecessarily", () => {
    configureCache({ maxBytes: 5000 });
    writeCache("a", big(1000));
    writeCache("b", big(1000));
    writeCache("a", big(1200));
    expect(Object.keys(stored()).sort()).toEqual(["a", "b"]);
    expect(getDiagnostics().persistentCache.evicted).toBe(0);
  });
  it("a single source larger than the whole limit is rejected and the existing cache is left intact", () => {
    configureCache({ maxBytes: 2000 });
    writeCache("small", big(100));
    expect(writeCache("huge", big(5000))).toBe(false);
    expect(Object.keys(stored())).toEqual(["small"]);
    expect(getDiagnostics().persistentCache.rejected).toBe(1);
  });
  it("a storage quota error evicts the oldest source and retries", () => {
    writeCache("old", big(100), new Date("2025-03-01T09:00:00Z"));
    writeCache("mid", big(100), new Date("2025-03-01T10:00:00Z"));
    const real = Storage.prototype.setItem;
    let calls = 0;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (k, v) {
      if (++calls === 1) throw new DOMException("quota", "QuotaExceededError");
      return real.call(this, k, v);
    });
    expect(writeCache("new", big(100), new Date("2025-03-01T11:00:00Z"))).toBe(true);
    expect(Object.keys(stored()).sort()).toEqual(["mid", "new"]); // "old" made room
  });
  it("persistent storage failure is reported, not thrown", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("quota", "QuotaExceededError"); });
    expect(() => writeCache("a", big(10))).not.toThrow();
    expect(writeCache("a", big(10))).toBe(false);
    expect(getDiagnostics().persistentCache.writeFailures).toBeGreaterThanOrEqual(1);
  });
  it("works when localStorage is blocked entirely", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(readCache()).toEqual({});
    expect(writeCache("a", { x: 1 })).toBe(false);
  });
});

describe("hook: in-flight requests and safe refresh", () => {
  const originals = { ...LOADERS };
  afterEach(() => Object.assign(LOADERS, originals));
  const never = () => new Promise(() => {});
  const deferred = () => { let resolve; const p = new Promise((r) => { resolve = r; }); return { p, resolve }; };

  function setup(rosterLoader) {
    for (const k of Object.keys(LOADERS)) LOADERS[k] = never;
    LOADERS.roster = rosterLoader;
    return renderHook(() => useHubData());
  }

  it("a plain load joins the request already in progress instead of starting another", async () => {
    const calls = [];
    const { result } = setup(() => { const d = deferred(); calls.push(d); return d.p; });
    await act(async () => {});
    expect(calls).toHaveLength(1); // the initial refresh
    let a;
    let b;
    await act(async () => { a = result.current.load("roster"); b = result.current.load("roster"); });
    expect(calls).toHaveLength(1);
    await act(async () => { calls[0].resolve({ data: { players: ["p"] } }); await Promise.all([a, b]); });
    expect(result.current.sources.roster.status).toBe("ok");
  });

  it("a forced refresh starts a new request and an older, slower result cannot overwrite the newer one", async () => {
    const calls = [];
    const { result } = setup(() => { const d = deferred(); calls.push(d); return d.p; });
    await act(async () => {});
    let forced;
    await act(async () => { forced = result.current.load("roster", { force: true }); });
    expect(calls).toHaveLength(2);
    await act(async () => { calls[1].resolve({ data: { players: ["new"] } }); await forced; });
    await act(async () => { calls[0].resolve({ data: { players: ["old"] } }); await Promise.resolve(); });
    expect(result.current.sources.roster.data).toEqual({ players: ["new"] });
    expect(stored().roster.data).toEqual({ players: ["new"] }); // and the saved copy is the newer one
  });

  it("a failed refresh keeps the previous data, marks the error, and doesn't touch the saved copy", async () => {
    writeCache("roster", { players: ["cached"] }, new Date(Date.now() - 3600e3));
    const calls = [];
    const { result } = setup(() => { const d = deferred(); calls.push(d); return d.p; });
    // The saved copy is on screen immediately (the mount-time refresh may already be running).
    expect(["cached", "refreshing"]).toContain(result.current.sources.roster.status);
    expect(result.current.sources.roster.data).toEqual({ players: ["cached"] });
    await act(async () => { calls[0].resolve(Promise.reject(new Error("boom"))); await Promise.resolve(); await Promise.resolve(); });
    await act(async () => {});
    const r = result.current.sources.roster;
    expect(r.status).toBe("error");
    expect(r.data).toEqual({ players: ["cached"] });
    expect(r.error).toBe("boom");
    expect(stored().roster.data).toEqual({ players: ["cached"] });
  });

  it("counts cache hits and misses at startup", async () => {
    writeCache("roster", { players: [] });
    resetDiagnostics();
    setup(never);
    const { hits, misses } = getDiagnostics().persistentCache;
    expect(hits).toBe(1);
    expect(misses).toBe(Object.keys(LOADERS).length - 1);
  });
});
