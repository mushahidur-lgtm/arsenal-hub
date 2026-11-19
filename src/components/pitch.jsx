import React, { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ExternalLink } from "lucide-react";
import { fold } from "../lib/news.js";
import { layoutLineup, pitchPoints } from "../lib/pitch.js";
import { fmtFull } from "../lib/format.js";
import { Panel, SectionHead, cx } from "./ui.jsx";
import { TEAM_ID } from "../lib/data.js";

/* ───────────────────────── What happened to a player in this match ───────────────────────── */

/** Events involving a player, matched by name (ESPN lineups and key events use the same display names). */
function playerEvents(name, events) {
  const n = fold(name);
  const out = [];
  for (const e of events) {
    if (e.kind === "sub") {
      if (fold(e.primary) === n) out.push({ kind: "on", minute: e.minute, other: e.secondary });
      else if (fold(e.secondary) === n) out.push({ kind: "off", minute: e.minute, other: e.primary });
    } else if (fold(e.primary) === n) out.push({ kind: e.kind, minute: e.minute });
    else if (e.secondary && fold(e.secondary) === n && ["goal", "penalty"].includes(e.kind)) out.push({ kind: "assist", minute: e.minute });
  }
  return out;
}

const EV_LABEL = { goal: "Goal", penalty: "Penalty goal", "own-goal": "Own goal", assist: "Assist", yellow: "Yellow card", red: "Red card", on: "Came on", off: "Substituted off" };

/* ───────────────────────── Pitch ───────────────────────── */

function Marker({ pt, events, selected, onSelect, tone }) {
  const { p, x, y } = pt;
  const evs = playerEvents(p.name, events);
  const goals = evs.filter((e) => e.kind === "goal" || e.kind === "penalty").length;
  const carded = evs.find((e) => e.kind === "red") ? "red" : evs.find((e) => e.kind === "yellow") ? "yellow" : null;
  const off = evs.some((e) => e.kind === "off");
  const surname = p.name.split(" ").slice(-1)[0];
  return (
    <button
      onClick={() => onSelect(p)}
      aria-pressed={selected}
      aria-label={`${[p.jersey, surname].filter(Boolean).join(" ")}: ${p.name}, ${p.positionName || p.position}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      className="group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 outline-none"
    >
      <span className={cx(
        "relative grid h-9 w-9 place-items-center rounded-full border-2 font-display text-[13px] font-bold shadow-md transition sm:h-10 sm:w-10",
        tone,
        selected ? "scale-110 border-gold-light ring-2 ring-white" : "border-white/90 group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-white"
      )}>
        {p.jersey || "·"}
        {goals > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-white text-[9px] font-bold text-black" title="Goal">{goals > 1 ? goals : "⚽"}</span>}
        {carded && <span className={cx("absolute -left-1 -top-1 h-3 w-2 rounded-[2px]", carded === "red" ? "bg-red-600" : "bg-yellow-400")} />}
        {off && <ArrowDownRight size={12} className="absolute -bottom-1 -right-1 rounded-full bg-white text-red-600" />}
      </span>
      {" "}
      <span className="max-w-[4.5rem] truncate rounded bg-black/55 px-1 text-[10px] font-semibold leading-tight text-white sm:max-w-[5.5rem] sm:text-[11px]">{surname}</span>
    </button>
  );
}

function PitchMarkings() {
  return (
    <svg viewBox="0 0 100 150" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <g fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6">
        <rect x="3" y="3" width="94" height="144" />
        <line x1="3" y1="75" x2="97" y2="75" />
        <circle cx="50" cy="75" r="11" />
        <rect x="22" y="3" width="56" height="20" />
        <rect x="36" y="3" width="28" height="8" />
        <rect x="22" y="127" width="56" height="20" />
        <rect x="36" y="139" width="28" height="8" />
        <path d="M40 23 A11 11 0 0 0 60 23" />
        <path d="M40 127 A11 11 0 0 1 60 127" />
      </g>
      <g fill="rgba(255,255,255,0.55)"><circle cx="50" cy="75" r="0.8" /><circle cx="50" cy="16" r="0.7" /><circle cx="50" cy="134" r="0.7" /></g>
    </svg>
  );
}

/**
 * Lineups for both teams: an interactive pitch (tap a player for details) or a plain list.
 * Positions follow ESPN's published formation; nothing is invented. ESPN doesn't mark the
 * captain in this data, so it isn't shown.
 */
export function LineupPanel({ match, lineups, events, state }) {
  const arsFirst = [...lineups].sort((a, b) => (b.teamId === TEAM_ID || b.teamId === match.ars?.id) - (a.teamId === TEAM_ID || a.teamId === match.ars?.id));
  const [teamId, setTeamId] = useState(arsFirst[0]?.teamId);
  const [view, setView] = useState("pitch");
  const [picked, setPicked] = useState(null);
  const lineup = lineups.find((l) => l.teamId === teamId) ?? arsFirst[0];
  const layout = useMemo(() => layoutLineup(lineup), [lineup]);
  const points = useMemo(() => pitchPoints(layout), [layout]);
  const isArs = lineup?.teamId === match.ars?.id;
  const tone = isArs ? "bg-brand text-white" : "bg-white text-zinc-900";
  const sel = picked && lineup.starters.concat(lineup.subs).find((p) => p.id === picked);
  const selEvents = sel ? playerEvents(sel.name, events) : [];
  const gk = lineup.starters.find((p) => /^G/i.test(p.position));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-full border border-line bg-surface p-0.5 text-xs font-semibold" role="tablist" aria-label="Team">
          {arsFirst.map((l) => (
            <button key={l.teamId} role="tab" aria-selected={l.teamId === lineup.teamId} onClick={() => { setTeamId(l.teamId); setPicked(null); }}
              className={cx("rounded-full px-3 py-1.5 transition", l.teamId === lineup.teamId ? "bg-brand text-white" : "text-ink-muted hover:text-ink")}>
              {l.team}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-full border border-line bg-surface p-0.5 text-xs font-semibold" role="tablist" aria-label="View">
          {[["pitch", "Pitch"], ["list", "List"]].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)}
              className={cx("rounded-full px-3 py-1.5 transition", view === id ? "bg-ink text-surface" : "text-ink-muted hover:text-ink")}>{label}</button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-muted">
        <span><span className="font-semibold text-ink">{lineup.team}</span>{lineup.formation ? ` · ${lineup.formation}` : ""}</span>
        {gk && <span>Goalkeeper: <span className="font-semibold text-ink">{gk.name}</span></span>}
        <span>{state === "pre" ? "Announced lineup" : state === "in" ? "Lineup (match in progress)" : "Starting XI"}</span>
      </div>

      {view === "pitch" ? (
        <div className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-3">
            <div className="relative mx-auto aspect-[2/3] w-full max-w-[420px] overflow-hidden rounded-2xl bg-gradient-to-b from-emerald-700 to-emerald-800 shadow-inner md:max-w-none">
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent 0 9.5%, rgba(0,0,0,0.18) 9.5% 19%)" }} />
              <PitchMarkings />
              {points.map((pt) => <Marker key={pt.p.id} pt={pt} events={events} tone={tone} selected={picked === pt.p.id} onSelect={(p) => setPicked(p.id === picked ? null : p.id)} />)}
            </div>
            {!layout.exact && <p className="mt-1.5 text-[11px] text-ink-muted">ESPN’s formation string didn’t match the players listed, so they are grouped by position type.</p>}
          </div>
          <div className="md:col-span-2">
            <Panel className="p-4">
              {sel ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{sel.positionName || sel.position}{sel.jersey ? ` · #${sel.jersey}` : ""}</p>
                  <p className="text-base font-semibold text-ink">{sel.name}</p>
                  <ul className="space-y-1 text-[13px] text-ink">
                    {selEvents.map((e, i) => (
                      <li key={i} className="flex items-center gap-2"><span className="w-9 text-right text-[11px] tabular-nums text-ink-muted">{e.minute}</span>{EV_LABEL[e.kind]}{e.other ? <span className="text-ink-muted"> {e.kind === "on" ? "for" : "for"} {e.other}</span> : null}</li>
                    ))}
                    {!selEvents.length && <li className="text-ink-muted">No goals, cards or substitutions recorded.</li>}
                  </ul>
                  {Object.keys(sel.stats ?? {}).length > 0 && (
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-line pt-2 text-[12px]">
                      {[["totalShots", "Shots"], ["shotsOnTarget", "On target"], ["goalAssists", "Assists"], ["saves", "Saves"], ["foulsCommitted", "Fouls"], ["foulsSuffered", "Fouled"]]
                        .filter(([k]) => sel.stats[k] != null && (sel.stats[k] > 0 || k === "saves" && /^G/i.test(sel.position)))
                        .map(([k, l]) => <div key={k} className="flex justify-between"><dt className="text-ink-muted">{l}</dt><dd className="font-semibold tabular-nums text-ink">{sel.stats[k]}</dd></div>)}
                    </dl>
                  )}
                </div>
              ) : (
                <p className="text-[13px] text-ink-muted">Tap a player on the pitch for their match details. Badges show goals, cards and substitutions.</p>
              )}
            </Panel>
            <Subs lineup={lineup} events={events} picked={picked} onPick={setPicked} />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Starting XI</p>
            <ol className="space-y-1 text-[13px]">
              {lineup.starters.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <span className="w-6 text-right text-[11px] tabular-nums text-ink-muted">{p.jersey}</span>
                  <span className="truncate text-ink">{p.name}</span>
                  <span className="text-[10px] text-ink-muted">{p.position}</span>
                  {p.subbedOut && <ArrowDownRight size={12} className="ml-auto shrink-0 text-red-600" aria-label="Substituted off" />}
                </li>
              ))}
            </ol>
          </div>
          <Subs lineup={lineup} events={events} picked={picked} onPick={setPicked} flat />
        </div>
      )}
    </div>
  );
}

function Subs({ lineup, events, picked, onPick, flat }) {
  if (!lineup.subs.length) return null;
  const withMin = lineup.subs.map((p) => ({ p, on: playerEvents(p.name, events).find((e) => e.kind === "on") }));
  return (
    <div className={flat ? "" : "mt-4"}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Substitutes</p>
      <ul className="space-y-1 text-[13px]">
        {withMin.map(({ p, on }) => (
          <li key={p.id}>
            <button onClick={() => onPick(p.id === picked ? null : p.id)} className={cx("flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-surface-2", picked === p.id && "bg-brand/10")}>
              <span className="w-6 text-right text-[11px] tabular-nums text-ink-muted">{p.jersey}</span>
              <span className={cx("truncate", on ? "font-semibold text-ink" : "text-ink-muted")}>{p.name}</span>
              {on && <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 text-[10px] text-emerald-700 dark:text-emerald-400"><ArrowUpRight size={11} />{on.minute}{on.other ? ` for ${on.other.split(" ").slice(-1)[0]}` : ""}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────────────────── Match report ───────────────────────── */

/**
 * Structured report assembled only from data ESPN publishes: score, scorers and
 * assists, key moments, the formations used, ESPN's top performers, and links to
 * written reports. No tactical commentary or ratings are generated.
 */
export function MatchReport({ match, detail, related }) {
  const d = detail;
  const goals = d.events.filter((e) => ["goal", "penalty", "own-goal"].includes(e.kind));
  const moments = d.events.filter((e) => e.kind !== "sub");
  const nameOf = (id) => (id === match.home.id ? match.home.short : id === match.away.id ? match.away.short : "");
  const forms = d.lineups.filter((l) => l.formation);
  return (
    <section>
      <SectionHead title="Match report" />
      <Panel className="space-y-5 p-4 sm:p-5">
        {d.recap && (
          <div>
            <p className="text-base font-semibold leading-snug text-ink">{d.recap.headline}</p>
            {d.recap.description && <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{d.recap.description}</p>}
            {d.recap.link && (
              <a href={d.recap.link} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                Read the full ESPN report <ExternalLink size={12} />
              </a>
            )}
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Goals</p>
            {goals.length ? (
              <ul className="space-y-1.5 text-[13px]">
                {goals.map((g) => (
                  <li key={g.id}>
                    <span className="mr-2 inline-block w-9 text-right text-[11px] tabular-nums text-ink-muted">{g.minute}</span>
                    <span className="font-semibold text-ink">{g.primary}</span>{g.kind === "penalty" && " (pen)"}{g.kind === "own-goal" && " (OG)"}
                    <span className="text-ink-muted"> · {nameOf(g.teamId)}</span>
                    {g.secondary && <span className="text-ink-muted"> · assist {g.secondary}</span>}
                  </li>
                ))}
              </ul>
            ) : <p className="text-[13px] text-ink-muted">{match.state === "pre" ? "No goals yet." : "No goals recorded."}</p>}
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Key moments</p>
            {moments.length ? (
              <ul className="space-y-1 text-[13px]">
                {moments.map((m) => (
                  <li key={m.id}>
                    <span className="mr-2 inline-block w-9 text-right text-[11px] tabular-nums text-ink-muted">{m.minute}</span>
                    {m.kind === "yellow" ? "Yellow card" : m.kind === "red" ? "Red card" : "Goal"}: <span className="font-semibold text-ink">{m.primary}</span>
                    <span className="text-ink-muted"> ({nameOf(m.teamId)})</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[13px] text-ink-muted">No key moments recorded.</p>}
          </div>
        </div>

        {forms.length > 0 && (
          <p className="text-[13px] text-ink-muted">
            Formations: {forms.map((l) => `${l.team} ${l.formation}`).join(" · ")}. Tactical analysis isn’t generated here; the written reports below cover it.
          </p>
        )}

        {d.leaders?.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Standout performers (ESPN’s top player per stat)</p>
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {d.leaders.map((l) => (
                <div key={l.teamId}>
                  <p className="mb-1 text-xs font-semibold text-ink">{nameOf(l.teamId) || "Team"}</p>
                  <ul className="space-y-0.5 text-[12px]">
                    {l.items.map((it) => (
                      <li key={it.label} className="flex flex-wrap items-baseline gap-x-1.5">
                        <span className="font-semibold text-ink">{it.name}</span>
                        <span className="text-ink-muted">{it.value} {it.label.toLowerCase()}{it.detail ? ` (${it.detail})` : ""}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {related.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">More coverage</p>
            <ul className="space-y-1.5">
              {related.map((s) => (
                <li key={s.id}>
                  <a href={s.lead.link} target="_blank" rel="noopener noreferrer" className="group text-[13px] font-semibold text-ink hover:text-accent">
                    {s.lead.title} <span className="font-normal text-ink-muted">· {s.lead.source}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-[11px] text-ink-muted">Data: ESPN{detail.fetchedAt ? `, ${fmtFull(detail.fetchedAt)}` : ""}.{match.state === "in" ? " Match in progress, so this will change." : ""}</p>
      </Panel>
    </section>
  );
}

/* ───────────────────────── Fan predictions ───────────────────────── */

const RESULTS = [["W", "Win"], ["D", "Draw"], ["L", "Loss"]];

export function PredictionBox({ match, predictions, squad, events }) {
  const saved = predictions.preds[match.id];
  const [form, setForm] = useState(saved ?? { result: "", home: "", away: "", scorer: "" });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const editable = match.state === "pre";
  const arsName = match.ars?.short ?? "Arsenal";
  const oppName = match.opp?.short ?? "Opponent";

  // After the match, compare — user opinion vs what happened. Only with real data.
  const verdict = (() => {
    if (match.state !== "post" || !saved) return null;
    const actual = match.result;
    const exact = saved.home !== "" && saved.away !== "" && Number(saved.home) === match.ars?.score && Number(saved.away) === match.opp?.score;
    const firstGoal = events?.find((e) => ["goal", "penalty", "own-goal"].includes(e.kind));
    const scorerHit = saved.scorer && firstGoal ? fold(firstGoal.primary) === fold(saved.scorer) : null;
    return { resultHit: saved.result ? saved.result === actual : null, exact: saved.home !== "" ? exact : null, scorerHit, firstGoal };
  })();

  if (!editable && !saved) return null;
  return (
    <section>
      <SectionHead title="Your prediction" />
      <Panel className="space-y-4 p-4 sm:p-5">
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-[12px] text-ink-muted">
          Predictions are your own opinion, saved only on this device. They are not forecasts and aren’t based on any model.
        </p>
        {editable ? (
          <>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{arsName} result</p>
              <div className="flex gap-2">
                {RESULTS.map(([v, l]) => (
                  <button key={v} onClick={() => set("result")(form.result === v ? "" : v)} aria-pressed={form.result === v}
                    className={cx("flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition", form.result === v ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink hover:bg-surface-2")}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Exact score</p>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-ink">{arsName}
                  <input type="number" min="0" max="20" inputMode="numeric" value={form.home} onChange={(e) => set("home")(e.target.value)} className="w-14 rounded-lg border border-line bg-surface px-2 py-1.5 text-center text-ink" aria-label={`${arsName} goals`} /></label>
                <span className="text-ink-muted">–</span>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="number" min="0" max="20" inputMode="numeric" value={form.away} onChange={(e) => set("away")(e.target.value)} className="w-14 rounded-lg border border-line bg-surface px-2 py-1.5 text-center text-ink" aria-label={`${oppName} goals`} />{oppName}</label>
              </div>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted">First goalscorer (Arsenal player)</span>
              <select value={form.scorer} onChange={(e) => set("scorer")(e.target.value)} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink">
                <option value="">No pick</option>
                {squad.filter((p) => p.group !== "Goalkeepers").map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </label>
            <div className="flex gap-2">
              <button onClick={() => predictions.save(match.id, { ...form, label: `${arsName} v ${oppName}` })}
                disabled={!form.result && form.home === "" && !form.scorer}
                className="rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-crimson disabled:opacity-40">Save prediction</button>
              {saved && <button onClick={() => { predictions.clear(match.id); setForm({ result: "", home: "", away: "", scorer: "" }); }} className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink-muted hover:bg-surface-2">Clear</button>}
            </div>
            {saved && <p className="text-[11px] text-ink-muted">Saved {fmtFull(new Date(saved.madeAt))}. You can change it until kick-off.</p>}
          </>
        ) : (
          <div className="space-y-2 text-[13px]">
            <p className="text-ink">You predicted: {[saved.result && RESULTS.find(([v]) => v === saved.result)[1], saved.home !== "" && `${saved.home}–${saved.away}`, saved.scorer && `${saved.scorer} to score first`].filter(Boolean).join(" · ") || "nothing"}</p>
            {verdict && (
              <ul className="space-y-0.5 text-ink-muted">
                {verdict.resultHit != null && <li>Result: <span className={cx("font-semibold", verdict.resultHit ? "text-emerald-700 dark:text-emerald-400" : "text-accent")}>{verdict.resultHit ? "right" : "wrong"}</span> (actual: {match.result === "W" ? "win" : match.result === "D" ? "draw" : "loss"}, {match.ars?.score}–{match.opp?.score})</li>}
                {verdict.exact != null && <li>Exact score: <span className="font-semibold text-ink">{verdict.exact ? "spot on" : "missed"}</span></li>}
                {verdict.scorerHit != null && <li>First scorer: <span className="font-semibold text-ink">{verdict.scorerHit ? "right" : `missed (it was ${verdict.firstGoal.primary})`}</span></li>}
              </ul>
            )}
          </div>
        )}
      </Panel>
    </section>
  );
}
