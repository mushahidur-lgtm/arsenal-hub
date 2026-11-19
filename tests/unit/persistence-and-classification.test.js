import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePersistentState, usePredictions, useRecents, useSavedPlayers, writeJSON } from "../../src/lib/storage.js";
import { buildStories, canonicalUrl, playerKeys } from "../../src/lib/news.js";
import { buildTransfers } from "../../src/lib/transfers.js";
import { NOW, hoursAgo, raw } from "./helpers.js";

describe("local storage persistence", () => {
  it("usePersistentState survives a remount and writes every change", () => {
    const a = renderHook(() => usePersistentState("k-test", { n: 0 }));
    act(() => a.result.current[1]({ n: 5 }));
    a.unmount();
    expect(JSON.parse(localStorage.getItem("k-test"))).toEqual({ n: 5 });
    const b = renderHook(() => usePersistentState("k-test", { n: 0 }));
    expect(b.result.current[0]).toEqual({ n: 5 });
  });
  it("falls back to the default when the stored value has the wrong shape", () => {
    localStorage.setItem("k-shape", '"a string"');
    expect(renderHook(() => usePersistentState("k-shape", { n: 0 })).result.current[0]).toEqual({ n: 0 });
    localStorage.setItem("k-arr", "{}");
    expect(renderHook(() => usePersistentState("k-arr", [])).result.current[0]).toEqual([]);
  });
  it("keeps working in memory when storage refuses writes", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    const h = renderHook(() => usePersistentState("k-q", 1));
    act(() => h.result.current[1](2));
    expect(h.result.current[0]).toBe(2);
  });
  it("recently visited: newest first, de-duplicated, capped at 12, clearable, and persisted", () => {
    const h = renderHook(() => useRecents());
    act(() => { for (let i = 0; i < 15; i++) h.result.current.push({ href: `#/p/${i}`, title: `P${i}`, kind: "player" }); });
    expect(h.result.current.recents).toHaveLength(12);
    expect(h.result.current.recents[0].href).toBe("#/p/14");
    act(() => h.result.current.push({ href: "#/p/10", title: "P10", kind: "player" }));
    expect(h.result.current.recents[0].href).toBe("#/p/10");
    expect(h.result.current.recents.filter((r) => r.href === "#/p/10")).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem("afc-recents-v1"))[0].href).toBe("#/p/10");
    act(() => h.result.current.clear());
    expect(h.result.current.recents).toEqual([]);
    expect(JSON.parse(localStorage.getItem("afc-recents-v1"))).toEqual([]);
  });
  it("predictions persist per match and can be cleared", () => {
    const h = renderHook(() => usePredictions());
    act(() => h.result.current.save("m1", { result: "W", home: "2", away: "0" }));
    act(() => h.result.current.save("m2", { result: "D" }));
    expect(Object.keys(JSON.parse(localStorage.getItem("afc-predictions-v1")))).toEqual(["m1", "m2"]);
    act(() => h.result.current.clear("m1"));
    expect(Object.keys(h.result.current.preds)).toEqual(["m2"]);
    const again = renderHook(() => usePredictions());
    expect(again.result.current.preds.m2.result).toBe("D");
  });
  it("followed players: corrupted entries don't break toggling others", () => {
    writeJSON("afc-players-v1", { "1": null, "2": "x" });
    const h = renderHook(() => useSavedPlayers());
    act(() => h.result.current.toggle({ id: "3", name: "Three" }));
    expect(h.result.current.has("3")).toBe(true);
    act(() => h.result.current.toggle({ id: "3", name: "Three" }));
    expect(h.result.current.has("3")).toBe(false);
  });
});

describe("news de-duplication", () => {
  const build = (items) => buildStories(items, { now: NOW });
  it("the same article with different tracking parameters, fragments, case or www is one story", () => {
    const urls = [
      "https://www.bbc.co.uk/sport/football/articles/abc?at_medium=RSS&at_campaign=rss",
      "https://bbc.co.uk/sport/football/articles/abc/#comments",
      "https://WWW.BBC.CO.UK/sport/football/articles/ABC",
    ];
    expect(new Set(urls.map(canonicalUrl)).size).toBe(1);
    expect(build(urls.map((link, i) => raw({ link, id: `i${i}`, title: "Arteta press conference" })))).toHaveLength(1);
  });
  it("different articles with similar wording on different days stay separate", () => {
    const out = build([
      raw({ title: "Arsenal sign defender in £50m deal", link: "https://www.bbc.co.uk/a", date: hoursAgo(1) }),
      raw({ title: "Arsenal sign defender in £50m deal", link: "https://www.theguardian.com/b", outlet: "guardian", source: "The Guardian", date: hoursAgo(24 * 20) }),
    ]);
    expect(out).toHaveLength(2);
  });
  it("three outlets covering one event become one story with all three counted", () => {
    const out = build([
      raw({ title: "Declan Rice agrees new Arsenal contract", link: "https://www.bbc.co.uk/1", date: hoursAgo(5) }),
      raw({ title: "Rice signs new Arsenal contract", link: "https://www.theguardian.com/2", outlet: "guardian", source: "The Guardian", date: hoursAgo(4) }),
      raw({ title: "Arsenal confirm Declan Rice new contract", link: "https://www.skysports.com/3", outlet: "sky", source: "Sky Sports", date: hoursAgo(3) }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].outlets).toHaveLength(3);
  });
  it("accents and punctuation don't hide a duplicate", () => {
    const out = build([
      raw({ title: "Ødegaard injury: Arsenal captain ruled out", link: "https://www.bbc.co.uk/x", date: hoursAgo(3) }),
      raw({ title: "Odegaard injury - Arsenal captain ruled out!", link: "https://www.theguardian.com/y", outlet: "guardian", source: "The Guardian", date: hoursAgo(2) }),
    ]);
    expect(out).toHaveLength(1);
  });
});

describe("transfer classification: rumours are never presented as confirmed", () => {
  const squad = playerKeys([{ id: "1", name: "Bukayo Saka", lastName: "Saka", position: "Forward", group: "Forwards" }]);
  let n = 0;
  const entries = (items, lookups = {}) => buildTransfers(buildStories(items.map((i) => raw({ link: `https://x.test/${++n}`, ...i })), { now: NOW, players: squad }), { squad, lookups });
  const journalist = { author: "Fabrizio Romano", outlet: "athletic", source: "The Athletic" };

  it("a lone journalist's 'here we go' is at most 'reported complete', not confirmed", () => {
    const [e] = entries([{ title: "Arsenal complete signing of Viktor Gyokeres, here we go", ...journalist }], { "viktor gyokeres": { name: "Viktor Gyokeres" } });
    expect(e.status).not.toBe("confirmed");
  });
  it("hedged language caps certainty, whatever the outlet", () => {
    const [e] = entries([{ title: "Arsenal could complete signing of Viktor Gyokeres", outlet: "bbc", source: "BBC Sport" }]);
    expect(["speculation", "monitoring", "interest"]).toContain(e.status);
  });
  it("a secondary outlet's completion claim doesn't outrank 'interest'", () => {
    const [e] = entries([{ title: "Arsenal complete signing of Viktor Gyokeres", outlet: "fl", source: "football.london" }]);
    expect(e.status).not.toMatch(/confirmed|done/);
  });
  it("rumours from fan sites are speculation at best", () => {
    const [e] = entries([{ title: "Arsenal agree deal for striker, claims fan", outlet: "reddit", source: "r/Gunners" }]);
    expect(e?.status ?? "speculation").toBe("speculation");
  });
  it("every entry carries its sources and a date, so attribution can always be shown", () => {
    const out = entries([
      { title: "Arsenal submit £65m bid for Viktor Gyokeres", outlet: "bbc", source: "BBC Sport", date: hoursAgo(3) },
      { title: "Arsenal interested in Viktor Gyokeres", outlet: "guardian", source: "The Guardian", date: hoursAgo(2) },
    ], { "viktor gyokeres": { name: "Viktor Gyokeres" } });
    for (const e of out) {
      expect(e.outlets.length).toBeGreaterThan(0);
      expect(e.articles.every((a) => a.source && a.link && a.date instanceof Date)).toBe(true);
    }
  });
});
