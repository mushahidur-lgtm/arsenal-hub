/**
 * Feed parsing. Both feed paths (rss2json JSON, and raw RSS XML fetched through
 * a CORS proxy) produce the same item shape so dedup time windows line up:
 *   { id, title, link, date: Date, updated: Date|null, image, excerpt, author, outlet, source, scope, video }
 */
import { OUTLETS } from "./sources.js";
import { FetchError } from "./errors.js";
import { noteDropped } from "./diagnostics.js";
import { arr, isObj, keepValid, str } from "./validate.js";

const ENTITIES = {
  amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  ndash: "–", mdash: "—", hellip: "…", pound: "£", euro: "€",
};
export const decode = (str = "") =>
  String(str)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

export const stripHtml = (html = "") => decode(String(html).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

const firstImg = (html = "") => {
  const m = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? decode(m[1]) : null;
};

/** rss2json gives "YYYY-MM-DD HH:mm:ss" in UTC with no zone marker; raw RSS gives RFC-822. */
export function parseDate(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  const str = String(s).trim();
  const d = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(str) ? new Date(str.replace(" ", "T") + "Z") : new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

const goodImage = (x) => x && /^https?:/.test(x) && !/redditstatic|\/self\b|default|spacer|pixel|feeds\.feedburner/.test(x);

/** Feeds often ship tiny thumbnails; ask for a larger rendition where the CDN supports it. */
export function upgradeImage(url) {
  if (!url) return url;
  // BBC ichef: /ace/standard/240/… or /news/240/… → 800px
  return url.replace(/(ichef\.bbci\.co\.uk\/(?:ace\/(?:standard|ws)|news))\/\d{2,4}\//, "$1/800/");
}

/** Rough width hint from the URL, used to prefer sharper images for large slots. */
export function imageWidthHint(url = "") {
  const m = url.match(/[?&](?:width|w)=(\d+)/) || url.match(/\/(\d{3,4})x\d{3,4}\//) || url.match(/\/(?:standard|news)\/(\d{3,4})\//);
  return m ? Number(m[1]) : 1000;
}

/** Multi-paragraph descriptions → readable text ("standfirst. First para.") */
function htmlToText(html = "") {
  const lines = String(html).replace(/<\/(p|li|h\d)>|<br\s*\/?>/gi, "\n").split("\n").map(stripHtml).filter(Boolean);
  return lines.map((l, i) => (i < lines.length - 1 && !/[.!?…:]$/.test(l) ? `${l}.` : l)).join(" ");
}

/** r/Gunners link posts: the real article URL is the "[link]" anchor in the content. */
function redditTarget(html = "") {
  const m = String(html).match(/<a href="([^"]+)">\[link\]<\/a>/);
  if (!m) return null;
  const url = decode(m[1]);
  return /reddit\.com|redd\.it/.test(url) ? null : url;
}

function normalize({ guid, title, link, pubDate, updated, description, content, thumbnail, enclosure, author }, outletId, scope) {
  const outlet = OUTLETS[outletId];
  const body = content || description || "";
  let excerpt = htmlToText(description || content || "");
  let finalLink = link;
  if (outletId === "reddit") {
    excerpt = excerpt.replace(/submitted by.*$/i, "").trim();
    const target = redditTarget(body);
    if (target) finalLink = target;
  }
  // "Headline | Jonathan Wilson" → headline + author
  let cleanTitle = decode(stripHtml(title));
  let byline = author || "";
  const tail = cleanTitle.match(/\s+\|\s+([A-Z][\w'’.-]+(?:\s+[A-Z][\w'’.-]+){0,3})$/);
  if (tail) {
    cleanTitle = cleanTitle.slice(0, tail.index);
    byline ||= tail[1];
  }
  return {
    id: guid || link,
    title: cleanTitle,
    link: finalLink,
    discussion: outletId === "reddit" ? link : null,
    date: parseDate(pubDate),
    updated: parseDate(updated),
    image: upgradeImage(decode([thumbnail, enclosure, firstImg(body)].find(goodImage) || "")) || null,
    excerpt: excerpt.slice(0, 600),
    author: byline,
    outlet: outletId,
    source: outlet?.name ?? outletId,
    scope,
  };
}

/** A feed item is usable only with a headline and a link to the original story. */
const usable = (i) => isObj(i) && !!str(i.title) && !!str(i.link);

/** rss2json response → items. Wrong structure throws; items without a title or link are skipped. */
export function parseRss2Json(json, outletId, scope = "arsenal") {
  if (!isObj(json) || !Array.isArray(json.items)) throw new FetchError("Unexpected response format (rss2json feed)", "data");
  return keepValid(json.items, usable, "rss").map((i) =>
    normalize(
      {
        guid: str(i.guid),
        title: i.title,
        link: i.link,
        pubDate: i.pubDate,
        description: str(i.description) ?? "",
        content: str(i.content) ?? "",
        thumbnail: str(i.thumbnail),
        enclosure: isObj(i.enclosure) ? str(i.enclosure.link) : typeof i.enclosure === "string" ? i.enclosure : undefined,
        author: str(i.author) ?? "",
      },
      outletId,
      scope
    )
  );
}

/** Raw RSS/Atom XML → items (browser only: uses DOMParser). Malformed XML or a non-feed document throws. */
export function parseRssXml(xmlText, outletId, scope = "arsenal") {
  if (typeof xmlText !== "string" || !xmlText.trim()) throw new FetchError("Feed was empty", "data");
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  if (doc.querySelector("parsererror")) throw new FetchError("Feed XML could not be parsed", "data");
  const root = doc.documentElement?.localName ?? "";
  if (!/^(rss|feed|RDF)$/i.test(root)) throw new FetchError("Unexpected response format (not an RSS or Atom feed)", "data");
  const nodes = [...doc.querySelectorAll("item, entry")];
  const text = (el, sel) => el.querySelector(sel)?.textContent?.trim() ?? "";
  const byTag = (el, tag) => [...el.getElementsByTagName("*")].find((n) => n.tagName === tag || n.localName === tag.split(":").pop() && n.tagName.endsWith(tag));
  const items = nodes.map((el) => {
    const linkEl = el.querySelector("link");
    const link = linkEl?.getAttribute("href") || linkEl?.textContent?.trim() || "";
    const media = byTag(el, "media:content") || byTag(el, "media:thumbnail");
    const encl = el.querySelector("enclosure");
    return {
      guid: text(el, "guid") || text(el, "id") || link,
      title: text(el, "title"),
      link,
      pubDate: text(el, "pubDate") || text(el, "published") || byTag(el, "dc:date")?.textContent,
      updated: text(el, "updated"),
      description: text(el, "description") || text(el, "summary"),
      content: byTag(el, "content:encoded")?.textContent || text(el, "content"),
      thumbnail: media?.getAttribute("url"),
      enclosure: encl?.getAttribute("type")?.startsWith("image") ? encl.getAttribute("url") : null,
      author: byTag(el, "dc:creator")?.textContent || text(el, "author name") || text(el, "author"),
    };
  });
  return keepValid(items, usable, "rss").map((i) => normalize(i, outletId, scope));
}

/** ESPN news API → items. Wrong structure throws; articles without a headline or web link are skipped. */
export function parseEspnNews(json, scope = "arsenal") {
  if (!isObj(json) || !Array.isArray(json.articles)) throw new FetchError("Unexpected response format (ESPN news)", "data");
  return json.articles
    .filter((a) => {
      const ok = isObj(a) && !!str(a.headline) && !!str(a.links?.web?.href);
      if (!ok) noteDropped("espn-news");
      return ok;
    })
    .map((a) => ({
      id: String(a.id ?? a.dataSourceIdentifier ?? a.headline),
      title: a.headline,
      link: a.links.web.href,
      date: parseDate(a.published),
      updated: parseDate(a.lastModified),
      image: str(arr(a.images)[0]?.url),
      excerpt: str(a.description) && a.description !== a.headline ? a.description : "",
      author: str(a.byline) ?? "",
      outlet: "espn",
      source: "ESPN",
      scope,
      video: a.type === "Media",
    }));
}
