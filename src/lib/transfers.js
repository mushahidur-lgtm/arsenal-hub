/**
 * Transfer intelligence built on top of news stories.
 *
 * There is no free transfer API, so the tracker reads the same feeds as the
 * news page and is deliberately conservative:
 *   - A player card is only built when the subject matches a known player
 *     (Arsenal squad from ESPN, or exactly one ESPN search hit for an incoming
 *     target). Otherwise the story is shown as a story, not as a player.
 *   - Status comes from the wording *and* the outlet tier, and is capped so a
 *     secondary site's "advanced talks" never outranks a reliable outlet.
 *   - "Confirmed" needs the club, or two independent reliable outlets
 *     reporting completion. One reliable outlet → "Reported complete".
 *   - Nothing is filled in that the reporting doesn't state (fee, contract
 *     length, club, age, position stay blank when unknown).
 *
 * Integration point: a future transfer API only needs to emit objects shaped
 * like `buildTransfers()` output (see TransferEntry below) and can be merged in.
 */
import { fold } from "./news.js";
import { TIERS } from "./sources.js";

export const STATUSES = {
  dismissed: { label: "Dismissed", rank: 0, tone: "dismissed" },
  confirmed: { label: "Confirmed", rank: 7, tone: "confirmed" },
  done: { label: "Reported complete", rank: 6, tone: "strong" },
  advanced: { label: "Advanced talks", rank: 5, tone: "strong" },
  strong: { label: "Strongly reported", rank: 4, tone: "strong" },
  interest: { label: "Interest reported", rank: 3, tone: "medium" },
  monitoring: { label: "Monitoring", rank: 2, tone: "weak" },
  speculation: { label: "Speculation", rank: 1, tone: "weak" },
};
const byRank = Object.fromEntries(Object.entries(STATUSES).filter(([k]) => k !== "dismissed").map(([k, v]) => [v.rank, k]));

const DENIAL = /\b(dismiss\w*|denies|denied|rules? out|ruled out|happy at|not for sale|no intention|shuts? down|rejects?|squashes?)\b/;
export const isDenial = (a) => DENIAL.test(fold(a.title));
export const isHedged = (a) => RE.hedge.test(fold(a.title)) || SCARE_QUOTES.test(a.title);

/** Stable key for a transfer subject (used by the watchlist). */
export const subjectKey = (e) => fold(e.player?.name ?? e.subject ?? e.headline).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "|" + e.direction;

/**
 * Progression of reporting for one transfer storyline. Every point is a real
 * article (outlet, date, link); its "stage" is read from that headline's wording
 * and capped by the outlet's tier. Nothing is inferred or filled in.
 */
export function timelineOf(e) {
  const arts = [...new Map([e, ...(e.related ?? [])].flatMap((x) => x.articles).map((a) => [a.link, a])).values()]
    .sort((a, b) => (a.date ?? 0) - (b.date ?? 0));
  return arts.map((a) => {
    const level = articleLevel(a);
    // Level 1 covers "just mentioned", hedged rumours and analysis; say which, instead of calling everything speculation.
    let stage = level > 1 ? STATUSES[byRank[level]]?.label : isHedged(a) || a.tier === "opinion" ? "Speculation" : a.primary === "analysis" ? "Background / analysis" : "Mentioned";
    if (isDenial(a)) stage = "Denied / dismissed";
    else if (a.tier === "official" && level >= 6) stage = "Official confirmation";
    return { date: a.date, source: a.source, tier: a.tier, journalist: a.journalist ?? null, title: a.title, link: a.link, stage };
  });
}

export const DIRECTIONS = {
  incoming: "Incoming",
  outgoing: "Outgoing",
  renewal: "Renewal",
  general: "Window news",
};

const RE = {
  completion: /\b(signs|signed|completes?|completed|seals?|sealed|joins|joined|has joined|unveil(s|ed)?|announce[sd]?|confirm(s|ed)|officially)\b(?! (race|battle|chase|queue))/,
  advanced: /\b(advanced talks|agreement reached|reach(es|ed)? (an )?agreement|agree(s|d)? (in principle|terms|a fee|fee|deal|personal terms|new|(a )?contract|(a )?(contract )?extension)|verbally agree\w*|close to (signing|agreeing|a deal|completing)|closing in|set to (sign|join|complete|extend|leave)|on the verge|here we go|medical|finali[sz]\w*|poised to)\b/,
  strong: /\b(bid|bids|offer|offers|offered|approach\w*|talks|negotiat\w*|in contact|submit\w*)\b/,
  interest: /\b(interest|interested|target|targets|targeting|wants?|keen|eye|eyes|eyeing|pursu\w*|admire\w*|linked|consider\w*|shortlist\w*)\b/,
  monitoring: /\b(monitor\w*|watch\w*|scout\w*|track\w*|keeping tabs|keep tabs)\b/,
  hedge: /\b(could|might|may|would|considering|weighing|claim\w*|reportedly|rumou?r\w*|whispers?|tipped|dream)\b|\?/,
  exit: /\b(exit|leave|leaves|leaving|sell|sale|sold|depart\w*|loan (move|exit|deal)|offload\w*|swap|surplus|future (in doubt|uncertain)|axed|let go)\b/,
};

// 'quoted phrase' in a headline = the outlet is relaying someone else's claim
const SCARE_QUOTES = /(^|[\s:])['‘][^'‘’]{3,}['’](?=$|[\s:,.!?])/;

const tierCap = (tier) => (tier === "opinion" ? 1 : tier === "secondary" ? 3 : 7);

/** Per-article certainty, from wording and outlet tier. Returns a rank (1–7, without 'confirmed'). */
export function articleLevel(a) {
  const title = fold(a.title);
  const text = `${title} ${fold(a.summary ?? "")}`;
  const hedged = RE.hedge.test(title) || SCARE_QUOTES.test(a.title);
  // Denials ("dismisses transfer talk", "not for sale") are not evidence of a move.
  if (/\b(dismiss\w*|denies|denied|rules? out|ruled out|happy at|not for sale|no intention|shuts? down)\b/.test(title)) return 1;
  let level = 1;
  if (RE.completion.test(title) && !hedged) level = 6; // reported complete (confirmation decided per story)
  else if (RE.advanced.test(text)) level = 5;
  else if (RE.strong.test(text)) level = 4;
  else if (RE.interest.test(text)) level = 3;
  else if (RE.monitoring.test(text)) level = 2;
  if (hedged) level = a.tier === "reliable" || a.tier === "journalist" || a.tier === "official" ? Math.min(level, 3) : 1;
  return Math.min(level, tierCap(a.tier));
}

const FEE_RE = /([£€$])\s?(\d+(?:\.\d+)?)\s?(m|million|bn|billion|k)\b/i;
const CONTRACT_RE = /\b(?:until|to|through|till)\s+(20\d\d)\b|\b(\d)-year (?:deal|contract)\b/i;

/** Pull a fee / contract length only when the reporting states one. */
function reportedFacts(articles) {
  let fee = null, contract = null;
  for (const a of articles) {
    const text = `${a.title} ${a.summary ?? ""}`;
    if (!fee) {
      const m = text.match(FEE_RE);
      if (m) fee = { text: `${m[1]}${m[2]}${/^m/i.test(m[3]) ? "m" : /^b/i.test(m[3]) ? "bn" : "k"}`, source: a.source };
    }
    if (!contract && /contract|deal|extension|renew/i.test(text)) {
      const m = text.match(CONTRACT_RE);
      if (m) contract = { text: m[1] ? `Until ${m[1]}` : `${m[2]}-year deal`, source: a.source };
    }
  }
  return { fee, contract };
}

/** Capitalised 2–3 word names in a headline that aren't squad players or clubs. */
export function candidateNames(title, { exclude = new Set() } = {}) {
  const NOT = /^(Arsenal|Gunners|Premier|League|Champions|Mikel|Arteta|Real|Madrid|Manchester|United|City|Aston|Villa|Crystal|Palace|West|Ham|Nottingham|Forest|Newcastle|Borussia|Bayer|Inter|Milan|Atletico|Saudi|Pro|January|Summer|Transfer|The|Sky|Sports|BBC|Athletic|Done|Deal|Here|We|Go|New|Why|How|What|Exclusive|Breaking|Arsenal's|Fabrizio|Romano|David|Ornstein)$/;
  const words = title.replace(/[‘’“”"]/g, "'").split(/\s+/);
  const out = [];
  let run = [];
  const flush = () => {
    if (run.length >= 2 && run.length <= 3) out.push(run.join(" "));
    run = [];
  };
  for (const raw of words) {
    const w = raw.replace(/^[^A-Za-zÀ-ÿ]+|[^A-Za-zÀ-ÿ'-]+$/g, "").replace(/'s$/, "");
    if (/^[A-ZÀ-Ý][a-zà-ÿ'-]+$/.test(w) && !NOT.test(w)) {
      run.push(w);
      if (/[:,;.!?]$/.test(raw)) flush();
    } else flush();
  }
  flush();
  return out.filter((n) => !exclude.has(fold(n)));
}

/**
 * Stories → transfer entries.
 * ctx: { squad: playerKeys(), lookups: { [foldedName]: {club, league, id} } }
 *
 * TransferEntry = {
 *   id, direction, status, player: {name, position, age, club, photo, inSquad} | null,
 *   subject, fee, contract, story, articles, outlets, independent, reliableOutlets,
 *   updated: Date, headline
 * }
 */
export function buildTransfers(stories, ctx = {}) {
  const squadById = new Map((ctx.squad ?? []).map((k) => [k.id, k]));
  const squadNames = new Set((ctx.squad ?? []).map((k) => fold(k.name)));
  const entries = [];

  for (const story of stories) {
    if (story.scope !== "arsenal" || !story.categories.has("transfer")) continue;
    const arts = story.articles;
    const title = story.lead.title;

    // Subject: a squad player first (outgoing / renewal), else a looked-up target.
    const squadIds = [...new Set(arts.flatMap((a) => [...a.players]))];
    const squadSubject = squadIds.length === 1 ? squadById.get(squadIds[0]) : null;
    let player = null;
    let subject = null;
    if (squadSubject) {
      const p = squadSubject.player;
      subject = p.name;
      player = { name: p.name, position: p.position, group: p.group, age: p.age, club: "Arsenal", photo: p.photo, dob: p.dob ?? null, inSquad: true, link: p.link };
    } else if (!squadIds.length) {
      const names = [...new Set(arts.flatMap((a) => candidateNames(a.title, { exclude: squadNames })))];
      for (const n of names) {
        const hit = ctx.lookups?.[fold(n)];
        if (hit && !hit.miss) {
          subject = hit.name ?? n;
          player = {
            name: hit.name ?? n,
            club: hit.club ?? null, // null = unknown, never guessed
            position: hit.position ?? null,
            age: hit.age ?? null,
            photo: null,
            inSquad: false,
            link: hit.link,
          };
          break;
        }
      }
    }

    const allText = fold(arts.map((a) => `${a.title} ${a.summary ?? ""}`).join(" "));
    const isContract = arts.some((a) => a.concepts.has("contract")) && !RE.exit.test(allText);
    let direction = "general";
    if (squadSubject) direction = isContract ? "renewal" : "outgoing";
    else if (player) direction = "incoming";
    else if (isContract) direction = "renewal";

    // Status: strongest article, capped by tier; confirmation needs independence.
    const levels = arts.map((a) => ({ a, level: articleLevel(a) }));
    let rank = Math.max(...levels.map((x) => x.level));
    const done = levels.filter((x) => x.level >= 6);
    const officialDone = done.some((x) => x.a.tier === "official");
    const reliableDone = new Set(done.filter((x) => ["reliable", "journalist"].includes(x.a.tier) && !x.a.cites.length).map((x) => x.a.source));
    let status = byRank[rank] ?? "speculation";
    if (officialDone || reliableDone.size >= 2) status = "confirmed";
    else if (rank >= 6) status = "done";
    // Contract stories phrased as "talks" read better as advanced/strong, never "interest".
    if (direction === "renewal" && status === "interest") status = "strong";
    // A storyline whose most recent report is a denial (and which never reached "done") is dismissed.
    const latest = [...arts].filter((a) => a.date).sort((a, b) => b.date - a.date)[0];
    if (latest && isDenial(latest) && STATUSES[status].rank < 6) status = "dismissed";

    const reliableOutlets = [...new Set(arts.filter((a) => (TIERS[a.tier]?.rank ?? 0) >= TIERS.reliable.rank).map((a) => a.source))];
    const facts = reportedFacts(arts);
    // A fee only means something for a move; a renewal's "£105m" is the old signing fee.
    const fee = direction === "incoming" || direction === "outgoing" ? facts.fee : null;
    const contract = facts.contract;

    entries.push({
      id: story.id,
      direction,
      status,
      player,
      subject,
      fee,
      contract,
      story,
      headline: title,
      articles: arts,
      outlets: story.outlets,
      independent: story.independent,
      reliableOutlets,
      updated: story.date,
    });
  }

  // One entry per subject: merge storylines about the same player.
  const bySubject = new Map();
  const out = [];
  for (const e of entries.sort((a, b) => (b.updated ?? 0) - (a.updated ?? 0))) {
    // Same player *and* same direction: a renewal and an exit rumour stay separate.
    const key = e.player ? `${fold(e.player.name)}|${e.direction}` : null;
    if (key && bySubject.has(key)) {
      const prev = bySubject.get(key);
      prev.related.push(e);
      if (STATUSES[e.status].rank > STATUSES[prev.status].rank) prev.status = e.status;
      prev.fee ??= e.fee;
      prev.contract ??= e.contract;
      prev.outlets = [...new Set([...prev.outlets, ...e.outlets])];
      prev.reliableOutlets = [...new Set([...prev.reliableOutlets, ...e.reliableOutlets])];
      continue;
    }
    const entry = { ...e, related: [] };
    if (key) bySubject.set(key, entry);
    out.push(entry);
  }
  return out;
}

/** Names worth looking up on ESPN (incoming targets only). */
export function namesToLookUp(stories, squad = []) {
  const squadNames = new Set(squad.map((k) => fold(k.name)));
  const names = new Set();
  for (const s of stories) {
    if (s.scope !== "arsenal" || !s.categories.has("transfer")) continue;
    if (s.articles.some((a) => a.players.size)) continue;
    for (const a of s.articles) for (const n of candidateNames(a.title, { exclude: squadNames })) names.add(n);
  }
  return [...names];
}

/**
 * Transfer window context for the overview header. Exact Premier League
 * window dates change every season, so this only states the usual months
 * ("closes early February"), never a specific day.
 */
export function windowInfo(now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based
  if (m === 0) return { open: true, name: `January ${y} window`, timing: "usually closes in early February" };
  if (m >= 5 && m <= 7) return { open: true, name: `Summer ${y} window`, timing: "usually closes around 1 September" };
  if (m >= 8) return { open: false, name: `January ${y + 1} window`, timing: "opens on 1 January" };
  return { open: false, name: `Summer ${y} window`, timing: "usually opens in mid-June" };
}

/** The four steps shown on a transfer card's stepper. */
export const STEPS = ["Rumour", "Talks", "Agreed", "Complete"];

/**
 * Which step a status sits on (index into STEPS), or null when a stepper makes no sense (dismissed).
 * "Reported complete" and "Confirmed" both sit on the last step; the status badge beside the
 * stepper says which of the two it is, so a single report is never shown as official.
 */
export function stepOf(status) {
  switch (status) {
    case "speculation": case "monitoring": case "interest": return 0;
    case "strong": return 1;
    case "advanced": return 2;
    case "done": case "confirmed": return 3;
    default: return null;
  }
}
