/* eslint-disable @typescript-eslint/no-explicit-any */
// `any` is honest here: fast-xml-parser returns a tree whose shape depends on
// the input XML. Coercing to typed nodes would mean lying about what we know.
//
// RSS 2.0 + Atom 1.0 → normalized FeedEntry[]. Tolerant of malformed input:
// the parser returns whatever it can decode; entries lacking a URL are skipped
// rather than aborting the whole feed.
//
// We do not depend on `rss-parser` (manifesto-style: thin dep surface).
// `fast-xml-parser` gives us a JSON tree; the per-format mapping is ~150 lines.
//
// `parseFeed()` is pure — no I/O. `feed-fetcher.ts` handles HTTP.

import { XMLParser } from "fast-xml-parser";
import type {
  NewFeedEntry,
  FeedEntryImage,
  FeedEntryType,
} from "@/schemas/feed-entry";

type ParseResult = {
  entries: NewFeedEntry[];
  feedTitle?: string;
  feedSiteUrl?: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "__cdata",
  trimValues: true,
  parseTagValue: false, // keep numeric-looking strings as strings (e.g. guids)
});

export function parseFeed(xml: string, sourceId: string): ParseResult {
  const tree = parser.parse(xml);

  // RSS 2.0
  if (tree?.rss?.channel) {
    return parseRssChannel(tree.rss.channel, sourceId);
  }
  // Atom 1.0
  if (tree?.feed) {
    return parseAtomFeed(tree.feed, sourceId);
  }
  return { entries: [] };
}

// ── RSS 2.0 ────────────────────────────────────────────────────────────────

function parseRssChannel(channel: any, sourceId: string): ParseResult {
  const items = asArray(channel.item);
  const entries: NewFeedEntry[] = [];

  for (const item of items) {
    const url = pickRssLink(item);
    if (!url) continue;

    const guid = pickRssGuid(item) ?? url;
    const publishedAt = parseDate(item.pubDate) ?? new Date().toISOString();
    const title = textOf(item.title);

    const body =
      textOf(item["content:encoded"]) ??
      textOf(item.description) ??
      undefined;

    const image = pickRssImage(item);
    const authorName =
      textOf(item["dc:creator"]) ?? textOf(item.author) ?? undefined;

    entries.push({
      sourceId,
      guid,
      url,
      publishedAt,
      title: title || undefined,
      authorName,
      body,
      excerpt: makeExcerpt(body),
      type: detectRssType(item, { title, body, image }),
      image,
    });
  }

  return {
    entries,
    feedTitle: textOf(channel.title),
    feedSiteUrl: textOf(channel.link),
  };
}

function pickRssLink(item: any): string | undefined {
  const link = item.link;
  if (typeof link === "string") return link;
  // Some feeds emit <atom:link>; pick the first href
  if (Array.isArray(link)) {
    for (const l of link) {
      if (typeof l === "string") return l;
      if (l?.["@_href"]) return l["@_href"];
    }
  }
  if (link?.["@_href"]) return link["@_href"];
  return undefined;
}

function pickRssGuid(item: any): string | undefined {
  const g = item.guid;
  if (typeof g === "string") return g;
  if (g && typeof g === "object") {
    return textOf(g);
  }
  return undefined;
}

function pickRssImage(item: any): FeedEntryImage | undefined {
  // Nearstream extension — captured first so we hold onto the thumb URL
  // even when the picture itself comes from an enclosure or media:content
  // below. The thumb stays optional on FeedEntryImage; the reader uses it
  // when present and falls back to the original.
  const thumb = pickNearstreamThumb(item);

  // <enclosure url="..." length="..." type="image/jpeg" />
  const encs = asArray(item.enclosure);
  for (const e of encs) {
    const type = e?.["@_type"];
    const url = e?.["@_url"];
    if (url && (!type || type.startsWith("image/"))) {
      return { url, contentType: type, ...thumb };
    }
  }
  // <media:content url="..." />
  const media = asArray(item["media:content"]);
  for (const m of media) {
    const url = m?.["@_url"];
    const type = m?.["@_type"];
    const w = parseInt(m?.["@_width"] ?? "", 10);
    const h = parseInt(m?.["@_height"] ?? "", 10);
    if (url && (!type || type.startsWith("image/"))) {
      return {
        url,
        contentType: type,
        width: Number.isFinite(w) ? w : undefined,
        height: Number.isFinite(h) ? h : undefined,
        ...thumb,
      };
    }
  }
  return undefined;
}

function pickNearstreamThumb(item: any): {
  thumbUrl?: string;
  thumbWidth?: number;
  thumbHeight?: number;
} {
  // fast-xml-parser surfaces namespaced elements with the prefix preserved.
  const tags = asArray(item["nearstream:thumbnail"]);
  for (const t of tags) {
    const url = t?.["@_url"];
    if (typeof url === "string" && url.length > 0) {
      const w = parseInt(t?.["@_width"] ?? "", 10);
      const h = parseInt(t?.["@_height"] ?? "", 10);
      return {
        thumbUrl: url,
        thumbWidth: Number.isFinite(w) ? w : undefined,
        thumbHeight: Number.isFinite(h) ? h : undefined,
      };
    }
  }
  return {};
}

// ── Atom 1.0 ───────────────────────────────────────────────────────────────

function parseAtomFeed(feed: any, sourceId: string): ParseResult {
  const items = asArray(feed.entry);
  const entries: NewFeedEntry[] = [];

  for (const item of items) {
    const url = pickAtomLink(item);
    if (!url) continue;

    const guid = textOf(item.id) ?? url;
    const publishedAt =
      parseDate(textOf(item.published)) ??
      parseDate(textOf(item.updated)) ??
      new Date().toISOString();
    const title = textOf(item.title);

    const body =
      textOf(item.content) ??
      textOf(item.summary) ??
      undefined;

    const authorName = textOf(item.author?.name) ?? undefined;

    entries.push({
      sourceId,
      guid,
      url,
      publishedAt,
      title: title || undefined,
      authorName,
      body,
      excerpt: makeExcerpt(body),
      type: detectAtomType(item, { title, body }),
      image: undefined, // Atom rarely carries inline images via a stable convention
    });
  }

  return {
    entries,
    feedTitle: textOf(feed.title),
    feedSiteUrl: pickAtomLink(feed),
  };
}

function pickAtomLink(node: any): string | undefined {
  const links = asArray(node?.link);
  // Prefer rel="alternate" type="text/html"
  for (const l of links) {
    if (typeof l === "string") return l;
    if (
      l?.["@_rel"] === "alternate" &&
      (!l?.["@_type"] || l["@_type"].includes("html")) &&
      l?.["@_href"]
    ) {
      return l["@_href"];
    }
  }
  // Fall back to first link with an href
  for (const l of links) {
    if (typeof l === "string") return l;
    if (l?.["@_href"]) return l["@_href"];
  }
  return undefined;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Pull the meaningful string out of a node that may be a string, an object
 *  with `__cdata` / `#text`, or an object containing other attributes. */
function textOf(v: any): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") {
    const s = v.trim();
    return s.length > 0 ? s : undefined;
  }
  if (typeof v === "object") {
    if (typeof v.__cdata === "string") {
      const s = v.__cdata.trim();
      return s.length > 0 ? s : undefined;
    }
    if (typeof v["#text"] === "string") {
      const s = v["#text"].trim();
      return s.length > 0 ? s : undefined;
    }
  }
  return undefined;
}

function parseDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function makeExcerpt(html: string | undefined): string | undefined {
  if (!html) return undefined;
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length === 0) return undefined;
  if (text.length <= 240) return text;
  return text.slice(0, 237) + "…";
}

// ── Type detection ─────────────────────────────────────────────────────────
//
// Order of authority:
// 1. `<nearstream:type>note|essay|picture</nearstream:type>` — Nearstream feeds
//    emit this explicitly so the type round-trips between instances.
// 2. `<category>` named Stream / Essay / Inventory — our older feeds and any
//    Nearstream-shaped feed that didn't get the extension yet.
// 3. Heuristic — for non-Nearstream feeds (Substack, Mastodon, micro.blog,
//    a friend's blog). Image enclosure → picture; title + non-trivial body →
//    essay; everything else → note.
//
// The heuristic intentionally biases toward "note" over "essay" — most things
// without a title are short, and a wrong note feels more honest than a wrong
// essay in the reader chrome.

const ESSAY_BODY_THRESHOLD = 320; // chars of stripped text; below this a titled item is still likely a note

function detectRssType(
  item: any,
  fallback: { title?: string; body?: string; image?: FeedEntryImage },
): FeedEntryType {
  const explicit = textOf(item["nearstream:type"]);
  if (explicit) {
    const t = normalizeType(explicit);
    if (t !== "unknown") return t;
  }
  const categories = asArray(item.category)
    .map((c: any) => textOf(c) ?? (typeof c === "string" ? c : undefined))
    .filter((c): c is string => typeof c === "string");
  const cat = mapNearstreamCategory(categories);
  if (cat !== "unknown") return cat;
  return heuristicType(fallback);
}

function detectAtomType(
  item: any,
  fallback: { title?: string; body?: string },
): FeedEntryType {
  const explicit = textOf(item["nearstream:type"]);
  if (explicit) {
    const t = normalizeType(explicit);
    if (t !== "unknown") return t;
  }
  // Atom <category term="..."> is more common than <category>text</category>
  const categories = asArray(item.category)
    .map((c: any) => {
      if (typeof c === "string") return c;
      return c?.["@_term"] ?? textOf(c);
    })
    .filter((c): c is string => typeof c === "string");
  const cat = mapNearstreamCategory(categories);
  if (cat !== "unknown") return cat;
  return heuristicType(fallback);
}

function normalizeType(raw: string): FeedEntryType {
  const v = raw.trim().toLowerCase();
  if (v === "note" || v === "essay" || v === "picture") return v;
  return "unknown";
}

function mapNearstreamCategory(categories: string[]): FeedEntryType {
  for (const c of categories) {
    const v = c.trim().toLowerCase();
    if (v === "stream") return "note";
    if (v === "essay") return "essay";
    if (v === "inventory") return "picture";
  }
  return "unknown";
}

function heuristicType(input: {
  title?: string;
  body?: string;
  image?: FeedEntryImage;
}): FeedEntryType {
  if (input.image) return "picture";
  const strippedBody = (input.body ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (input.title && input.title.trim().length > 0 && strippedBody.length >= ESSAY_BODY_THRESHOLD) {
    return "essay";
  }
  return "note";
}
