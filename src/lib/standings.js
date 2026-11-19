/**
 * Points gaps for the league table card. Pure and tolerant of missing data: every field is null
 * when the table doesn't contain what's needed (never a guess).
 *
 *   second:  Arsenal minus 2nd place (positive = Arsenal are ahead of them; Arsenal in 2nd = 0 → null label)
 *   topFour: how far Arsenal are from the line. Inside the top four: the cushion over 5th.
 *            Outside: the deficit to 4th. `inside` says which.
 */
export function tableGaps(rows, teamId) {
  const empty = { second: null, topFour: null, inside: null, rank: null };
  if (!Array.isArray(rows) || !rows.length) return empty;
  const sorted = [...rows].filter((r) => Number.isFinite(r?.pts) && Number.isFinite(r?.rank)).sort((a, b) => a.rank - b.rank);
  const me = sorted.find((r) => r.id === teamId);
  if (!me) return empty;
  const at = (rank) => sorted.find((r) => r.rank === rank) ?? null;
  const second = at(2);
  const fourth = at(4);
  const fifth = at(5);
  const inside = me.rank <= 4;
  let topFour = null;
  if (inside && fifth) topFour = me.pts - fifth.pts;
  else if (!inside && fourth) topFour = me.pts - fourth.pts;
  return {
    rank: me.rank,
    second: second && me.rank !== 2 ? me.pts - second.pts : null,
    topFour,
    inside: topFour == null ? null : inside,
  };
}
