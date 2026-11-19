/**
 * Matchday logic for the home hero. Pure functions: everything shown comes from the ESPN schedule
 * or match summary; nothing is inferred beyond arithmetic on those numbers.
 */
const FULL_TIME_WINDOW_MS = 8 * 3600e3; // a finished match stays the hero for the rest of its day

/** "live" while a match is in play, "fulltime" shortly after one ends, else "upcoming". */
export function heroMode(data, now = Date.now()) {
  if (!data) return { mode: "upcoming", match: null };
  const live = (data.fixtures ?? []).find((m) => m.state === "in");
  if (live) return { mode: "live", match: live };
  const last = (data.results ?? []).find((m) => !m.friendly && !m.postponed) ?? null;
  if (last && Number.isFinite(last.date?.getTime?.()) && now >= last.date.getTime() && now - last.date.getTime() < FULL_TIME_WINDOW_MS) {
    return { mode: "fulltime", match: last };
  }
  return { mode: "upcoming", match: null };
}

/** Goals and cards only, in match order, optionally just the latest `n`. */
export function keyEvents(summary, n = 6) {
  const list = (summary?.events ?? []).filter((e) => ["goal", "penalty", "own-goal", "yellow", "red"].includes(e.kind));
  return n ? list.slice(-n) : list;
}

const nameOfTeam = (match, teamId) => (match.home.id === teamId ? match.home.short ?? match.home.name : match.away.id === teamId ? match.away.short ?? match.away.name : "");

/**
 * Factual bullet points for the post-match card. Each line is built only from fields the data
 * actually has; a missing stat simply produces no line.
 */
export function talkingPoints(summary, match) {
  if (!match || !summary) return [];
  const out = [];
  const goals = (summary.events ?? []).filter((e) => ["goal", "penalty", "own-goal"].includes(e.kind));
  if (goals.length) {
    out.push({
      id: "goals",
      label: "Goals",
      text: goals.map((g) => `${g.primary ?? "Unnamed scorer"} ${g.minute}${g.kind === "penalty" ? " (pen)" : g.kind === "own-goal" ? " (og)" : ""} for ${nameOfTeam(match, g.teamId) || "—"}`).join(" · "),
    });
  }
  const stat = (key) => (summary.stats ?? []).find((s) => s.key === key);
  const poss = stat("possessionPct");
  if (poss) out.push({ id: "possession", label: "Possession", text: `${match.home.short} ${poss.fmt(poss.home)} – ${poss.fmt(poss.away)} ${match.away.short}` });
  const shots = stat("totalShots");
  const sot = stat("shotsOnTarget");
  if (shots) out.push({ id: "shots", label: "Shots", text: `${match.home.short} ${shots.home}${sot ? ` (${sot.home} on target)` : ""} – ${shots.away}${sot ? ` (${sot.away} on target)` : ""} ${match.away.short}` });
  const cards = (summary.events ?? []).filter((e) => e.kind === "red" || e.kind === "yellow");
  const reds = cards.filter((c) => c.kind === "red");
  if (reds.length) out.push({ id: "reds", label: "Red cards", text: reds.map((c) => `${c.primary ?? "Player"} ${c.minute} (${nameOfTeam(match, c.teamId) || "—"})`).join(" · ") });
  else if (cards.length) out.push({ id: "yellows", label: "Bookings", text: `${cards.length} yellow card${cards.length > 1 ? "s" : ""}` });
  return out;
}
