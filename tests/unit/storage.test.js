import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { mergeWithArchive, readJSON, useBookmarks, useSavedPlayers, useWatchlist, writeJSON } from "../../src/lib/storage.js";

describe("readJSON / writeJSON", () => {
  it("round-trips values", () => {
    writeJSON("k", { a: 1 });
    expect(readJSON("k", {})).toEqual({ a: 1 });
  });
  it("returns the fallback when nothing is stored", () => {
    expect(readJSON("missing", { x: 1 })).toEqual({ x: 1 });
  });
  it("returns the fallback for invalid JSON", () => {
    localStorage.setItem("k", "{not json");
    expect(readJSON("k", { ok: true })).toEqual({ ok: true });
  });
  it.each([
    ["null", "null"],
    ["a string", '"hello"'],
    ["a number", "42"],
    ["an array where an object is expected", "[1,2]"],
  ])("returns the fallback when an object is expected but %s is stored", (_n, stored) => {
    localStorage.setItem("k", stored);
    expect(readJSON("k", {})).toEqual({});
  });
  it("returns the fallback when an array is expected but an object is stored", () => {
    localStorage.setItem("k", '{"a":1}');
    expect(readJSON("k", [])).toEqual([]);
  });
  it("does not throw when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    expect(readJSON("k", 5)).toBe(5);
    expect(() => writeJSON("k", 1)).not.toThrow();
  });
});

describe("bookmarks", () => {
  const article = { title: "T", link: "https://x.test/a", source: "BBC", date: "2025-01-01", image: null };
  it("adds, removes and persists across a remount", () => {
    const { result, unmount } = renderHook(() => useBookmarks());
    act(() => result.current.toggle(article));
    expect(result.current.has(article.link)).toBe(true);
    unmount();
    const again = renderHook(() => useBookmarks());
    expect(again.result.current.has(article.link)).toBe(true);
    act(() => again.result.current.toggle(article));
    expect(again.result.current.has(article.link)).toBe(false);
    expect(readJSON("afc-saved-v1", null)).toEqual({});
  });
  it.each(["null", '"oops"', "[1]", "{broken"])("survives corrupted stored data (%s)", (bad) => {
    localStorage.setItem("afc-saved-v1", bad);
    const { result } = renderHook(() => useBookmarks());
    expect(result.current.has(article.link)).toBe(false);
    act(() => result.current.toggle(article));
    expect(result.current.has(article.link)).toBe(true);
  });
  it("keeps working in memory when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    const { result } = renderHook(() => useBookmarks());
    act(() => result.current.toggle(article));
    expect(result.current.has(article.link)).toBe(true);
  });
});

describe("followed players", () => {
  it("follows, unfollows and defaults the squad to men", () => {
    const { result } = renderHook(() => useSavedPlayers());
    act(() => result.current.toggle({ id: "1", name: "Bukayo Saka" }));
    expect(result.current.saved["1"]).toMatchObject({ name: "Bukayo Saka", team: "men" });
    act(() => result.current.toggle({ id: "2", name: "Leah Williamson", team: "women" }));
    expect(result.current.saved["2"].team).toBe("women");
    act(() => result.current.toggle({ id: "1", name: "Bukayo Saka" }));
    expect(result.current.has("1")).toBe(false);
    expect(result.current.has("2")).toBe(true);
  });
});

describe("transfer watchlist", () => {
  const entry = { key: "saka|renewal", name: "Saka", status: "advanced", links: ["l1"] };
  it("adds once, snapshots status, marks seen and removes", () => {
    const { result } = renderHook(() => useWatchlist());
    act(() => result.current.add(entry));
    act(() => result.current.add({ ...entry, status: "confirmed" })); // re-adding must not overwrite the snapshot
    expect(result.current.list[entry.key].status).toBe("advanced");
    act(() => result.current.markSeen({ ...entry, status: "confirmed", links: ["l1", "l2"] }));
    expect(result.current.list[entry.key]).toMatchObject({ status: "confirmed", seen: ["l1", "l2"] });
    act(() => result.current.markSeen({ key: "unknown", status: "x", links: [] })); // unknown key ignored
    expect(Object.keys(result.current.list)).toEqual([entry.key]);
    act(() => result.current.remove(entry.key));
    expect(result.current.has(entry.key)).toBe(false);
  });
});

describe("mergeWithArchive", () => {
  const fresh = (link, hours) => ({ id: link, title: link, link, date: new Date(Date.now() - hours * 3600e3), image: null });
  it("keeps recent archived stories, drops expired ones and prefers the fresh copy", () => {
    writeJSON("afc-news-archive-v1", [
      { ...fresh("old", 24 * 30) },
      { ...fresh("kept", 24) },
      { ...fresh("both", 24), title: "stale title" },
    ]);
    const merged = mergeWithArchive([{ ...fresh("both", 1), title: "fresh title" }]);
    expect(merged.map((m) => m.link).sort()).toEqual(["both", "kept"]);
    expect(merged.find((m) => m.link === "both").title).toBe("fresh title");
    expect(merged.find((m) => m.link === "kept").date).toBeInstanceOf(Date);
  });
  it.each(['"x"', "null", '{"a":1}', "[null, 5, {}]"])("does not throw on a corrupted archive (%s)", (bad) => {
    localStorage.setItem("afc-news-archive-v1", bad);
    expect(() => mergeWithArchive([fresh("a", 1)])).not.toThrow();
    expect(mergeWithArchive([fresh("a", 1)]).map((m) => m.link)).toEqual(["a"]);
  });
  it("still returns fresh items when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    expect(mergeWithArchive([fresh("a", 1)])).toHaveLength(1);
  });
});
