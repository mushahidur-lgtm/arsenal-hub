/**
 * News source registry + credibility model.
 *
 * Two independent labels are attached to every article:
 *   - `tier`     → how much weight the *outlet* carries (this file)
 *   - `category` → what the story is *about* (see news.js)
 *
 * Tiers are about the outlet, never about whether a particular story is true.
 * A reliable outlet reporting a rumour is still a rumour; the transfer tracker
 * looks at wording as well as tier.
 */

export const TEAM_ID = "359";

const RSS2JSON = "https://api.rss2json.com/v1/api.json?rss_url=";
export const rss2json = (url) => RSS2JSON + encodeURIComponent(url);

/** Credibility tiers, strongest first. `weight` feeds relevance ranking. */
export const TIERS = {
  official: { label: "Official club", short: "Official", weight: 4, rank: 6 },
  journalist: { label: "Established journalist", short: "Journalist", weight: 3.5, rank: 5 },
  reliable: { label: "Reliable reporting", short: "Reliable", weight: 3, rank: 4 },
  secondary: { label: "Secondary reporting", short: "Secondary", weight: 1.5, rank: 3 },
  speculation: { label: "Rumour / speculation", short: "Rumour", weight: 1, rank: 2 },
  opinion: { label: "Fan opinion", short: "Opinion", weight: 0.8, rank: 1 },
};

/**
 * Outlets. `feed` is an RSS URL (fetched via rss2json, falling back to the raw
 * XML through a CORS proxy). `espn` marks ESPN JSON endpoints.
 *
 * Arsenal.com publishes no public RSS feed (every probe of /rss, /rss.xml,
 * /news/rss 404s), so it has no `feed`. Official items still appear when an
 * article links directly to arsenal.com (e.g. r/Gunners link posts). If an
 * official feed ever appears, set `feed` here and it is picked up everywhere.
 */
export const OUTLETS = {
  arsenal: { name: "Arsenal.com", tier: "official", feed: null, domains: ["arsenal.com"] },
  bbc: { name: "BBC Sport", tier: "reliable", feed: "https://feeds.bbci.co.uk/sport/football/teams/arsenal/rss.xml", domains: ["bbc.co.uk", "bbc.com"] },
  sky: { name: "Sky Sports", tier: "reliable", feed: "https://www.skysports.com/rss/11670", domains: ["skysports.com"] },
  // `cors: true` = the feed host sends CORS headers, so it's fetched directly (no rss2json quota used)
  athletic: { name: "The Athletic", tier: "reliable", feed: "https://www.nytimes.com/athletic/rss/football/arsenal/", cors: true, domains: ["nytimes.com/athletic", "theathletic.com"] },
  guardian: { name: "The Guardian", tier: "reliable", feed: "https://www.theguardian.com/football/arsenal/rss", domains: ["theguardian.com"] },
  espn: { name: "ESPN", tier: "reliable", espn: true, domains: ["espn.com", "espn.co.uk"] },
  reuters: { name: "Reuters", tier: "reliable", feed: null, domains: ["reuters.com"] },
  fl: { name: "football.london", tier: "secondary", feed: "https://www.football.london/arsenal-fc/?service=rss", domains: ["football.london"] },
  standard: { name: "Evening Standard", tier: "secondary", feed: null, domains: ["standard.co.uk"] },
  arseblog: { name: "Arseblog", tier: "opinion", feed: "https://www.arseblog.com/feed/", domains: ["arseblog.com", "arseblog.news"] },
  reddit: { name: "r/Gunners", tier: "opinion", feed: "https://www.reddit.com/r/Gunners/top/.rss?t=day", domains: ["reddit.com"] },
};

/** Feeds actually fetched for Arsenal news, in display order. */
export const ARSENAL_FEEDS = ["bbc", "sky", "athletic", "guardian", "fl", "arseblog", "reddit"];

/** Hosts the dev proxy may reach (mirrored in vite.config.js). */
export const FEED_HOSTS = Object.values(OUTLETS)
  .filter((o) => o.feed)
  .map((o) => new URL(o.feed).hostname);

/**
 * Recognised football reporters. An article is credited to one only when the
 * feed's author field names them, or the headline is explicitly theirs
 * ("David Ornstein's ..."). A secondary site *citing* a journalist gets a
 * "cites X" note, never the journalist's tier.
 */
export const JOURNALISTS = [
  { name: "David Ornstein", outlet: "The Athletic", re: /\bornstein\b/i },
  { name: "Fabrizio Romano", outlet: null, re: /\b(fabrizio )?romano\b/i },
  { name: "James McNicholas", outlet: "The Athletic", re: /\bmcnicholas\b/i },
  { name: "Art de Roché", outlet: "The Athletic", re: /\bart de roch[eé]\b/i },
  { name: "Sami Mokbel", outlet: null, re: /\bsami mokbel\b|\bmokbel\b/i },
  { name: "Charles Watts", outlet: null, re: /\bcharles watts\b/i },
  { name: "Simon Collings", outlet: null, re: /\bsimon collings\b/i },
  { name: "John Cross", outlet: null, re: /\bjohn cross\b/i },
];

/** Outlet names as they appear when one outlet cites another's report. */
export const CITABLE = [
  { name: "The Athletic", re: /\bthe athletic\b/i },
  { name: "Sky Sports", re: /\bsky sports?\b|\bsky germany\b/i },
  { name: "BBC Sport", re: /\bbbc\b/i },
  { name: "ESPN", re: /\bespn\b/i },
  { name: "The Guardian", re: /\bthe guardian\b/i },
  { name: "Reuters", re: /\breuters\b/i },
  { name: "Fabrizio Romano", re: /\b(fabrizio )?romano\b/i },
  { name: "David Ornstein", re: /\bornstein\b/i },
];

/** Find which outlet a URL belongs to (used for official arsenal.com links). */
export function outletForUrl(url) {
  if (!url) return null;
  let host;
  try {
    const u = new URL(url);
    host = (u.hostname + u.pathname).replace(/^www\./, "");
  } catch {
    return null;
  }
  const hostname = host.split("/")[0];
  const matches = (d) => {
    const [dHost, ...dPath] = d.split("/");
    const hostOk = hostname === dHost || hostname.endsWith("." + dHost);
    return hostOk && (!dPath.length || host.slice(hostname.length + 1).startsWith(dPath.join("/")));
  };
  for (const [id, o] of Object.entries(OUTLETS)) if (o.domains?.some(matches)) return id;
  return null;
}
