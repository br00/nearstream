// RSS 2.0 + `nearstream:` builder (PROTOCOL.md §4), shared by the two
// feeds a person publishes:
//
//  - the public feed  `/{handle}/rss.xml`        — `public` posts only
//  - a key feed       `/{handle}/feed/{token}`   — `public` + `friends`
//
// Same format for both, so any RSS reader can read either. The only
// differences are which posts go in and how media URLs are written: the
// public feed points at `/api/media/{key}`; a key feed points every media
// URL through the key (`lib/key-media.ts`) so revoking the key kills them.
//
// Moved verbatim out of `app/[handle]/rss.xml/route.ts` in protocol v0.1;
// the comments on each element are the original ones.

import { marked } from "marked";
import { store } from "@/lib/store";
import { essayStore } from "@/lib/essay-store";
import { inventoryStore } from "@/lib/inventory-store";
import { musicStore } from "@/lib/music-store";
import { normalizeVoiceViz } from "@/lib/voice-viz-variants";
import { THUMB_MAX_DIM } from "@/lib/thumbnails";
import { linkHref, type LibraryLink } from "@/schemas/stream";
import { visibilityOf, type Visibility } from "@/schemas/visibility";
import type { InventoryItem, InventoryImage } from "@/schemas/inventory";
import { imagesOf } from "@/schemas/inventory";
import type { User } from "@/schemas/user";
import { rewriteEssayMedia } from "@/lib/essay-images";

const INSTANCE_URL =
  process.env.NEARSTREAM_SITE_URL ?? "http://localhost:3000";

export type FeedOptions = {
  user: User;
  /** Absolute site URL (`tenantAbsoluteBase`). */
  siteUrl: string;
  /** Absolute URL of this feed, for `<atom:link rel="self">`. */
  selfUrl: string;
  /** Which visibilities go in. Public feed: `["public"]`. Key feed:
   *  `["public", "friends"]`. `private` never goes in any feed. */
  include: readonly Exclude<Visibility, "private">[];
  /** Absolute URL for a stored media object (an R2 key). */
  mediaUrl: (mediaKey: string) => Promise<string>;
};

type FeedItem = {
  publishedAt: string;
  toXml: () => string;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeCdata(value: string): string {
  return value.replace(/]]>/g, "]]]]><![CDATA[>");
}

function toRfc822(iso: string): string {
  return new Date(iso).toUTCString();
}

function deriveTitle(text: string): string {
  const firstLine = text.split("\n")[0].trim();
  if (firstLine.length <= 80) return firstLine;
  return firstLine.slice(0, 77).trimEnd() + "…";
}

function thumbDims(w?: number, h?: number): { tw: number; th: number } | null {
  if (!w || !h) return null;
  const ratio = Math.min(THUMB_MAX_DIM / w, THUMB_MAX_DIM / h, 1);
  return {
    tw: Math.max(1, Math.round(w * ratio)),
    th: Math.max(1, Math.round(h * ratio)),
  };
}

async function thumbnailElement(
  cover: InventoryImage,
  mediaUrl: FeedOptions["mediaUrl"],
): Promise<string | null> {
  if (!cover.thumbKey) return null;
  const url = await mediaUrl(cover.thumbKey);
  const dims = thumbDims(cover.width, cover.height);
  if (!dims) return `<nearstream:thumbnail url="${escapeXml(url)}" />`;
  return `<nearstream:thumbnail url="${escapeXml(url)}" width="${dims.tw}" height="${dims.th}" />`;
}

// Per-image element used by friends' instances to render a gallery in
// their reader without having to pull the full-res originals. Carries
// both the original URL + dimensions and the 600px-capped thumbnail. One
// element per image in `images[]`; the order matches the order on the
// detail page. `<enclosure>` stays alongside for non-Nearstream readers.
async function imageElements(
  images: InventoryImage[],
  mediaUrl: FeedOptions["mediaUrl"],
): Promise<string> {
  const parts = await Promise.all(
    images.map(async (img) => {
      const url = await mediaUrl(img.key);
      const wh = img.width && img.height ? ` width="${img.width}" height="${img.height}"` : "";
      let thumbAttrs = "";
      if (img.thumbKey) {
        const tUrl = await mediaUrl(img.thumbKey);
        const dims = thumbDims(img.width, img.height);
        thumbAttrs = dims
          ? ` thumbUrl="${escapeXml(tUrl)}" thumbWidth="${dims.tw}" thumbHeight="${dims.th}"`
          : ` thumbUrl="${escapeXml(tUrl)}"`;
      }
      return `<nearstream:image url="${escapeXml(url)}"${wh}${thumbAttrs} />`;
    }),
  );
  return parts.join("\n      ");
}

function htmlEscape(value: string): string {
  return escapeXml(value);
}

async function renderInventoryBody(
  item: InventoryItem,
  mediaUrl: FeedOptions["mediaUrl"],
): Promise<string> {
  // Multi-image: emit every image as a <p><img>. The first is the cover
  // (what a reader without inline-image support uses for the card). Order
  // mirrors the order on the tenant detail page. Each image keeps native
  // width/height so the reader-side layout doesn't jump.
  const all = imagesOf(item);
  const parts: string[] = await Promise.all(
    all.map(async (img, i) => {
      const imageUrl = await mediaUrl(img.key);
      const dims = img.width && img.height ? ` width="${img.width}" height="${img.height}"` : "";
      const alt = i === 0 ? item.title : `${item.title} — image ${i + 1}`;
      return `<p><img src="${htmlEscape(imageUrl)}" alt="${htmlEscape(alt)}"${dims} style="max-width: 100%; height: auto;" /></p>`;
    }),
  );

  if (item.description) {
    parts.push(await marked.parse(item.description, { async: true }));
  }

  const meta: { label: string; value: string }[] = [];
  if (item.dimensions) meta.push({ label: "Dimensions", value: item.dimensions });
  if (item.materials) meta.push({ label: "Materials", value: item.materials });
  if (item.edition) meta.push({ label: "Edition", value: item.edition });
  if (item.status) meta.push({ label: "Status", value: item.status });
  if (item.price) meta.push({ label: "Price", value: item.price });

  if (meta.length > 0) {
    parts.push(
      `<dl>${meta
        .map(
          ({ label, value }) =>
            `<dt><strong>${htmlEscape(label)}</strong></dt><dd>${htmlEscape(value)}</dd>`,
        )
        .join("")}</dl>`,
    );
  }

  return parts.join("\n");
}

/** Friends-only items carry a marker, and point at the site home rather
 *  than at their own page — that page 404s for anyone but the owner, so a
 *  permalink would be a dead link in the friend's reader. Their guid falls
 *  back to the entry id for the same reason. */
function restrictedMarker(v: Visibility): string {
  return v === "public" ? "" : `\n      <nearstream:visibility>${v}</nearstream:visibility>`;
}

export async function buildFeedXml(opts: FeedOptions): Promise<string> {
  const { user, siteUrl, selfUrl, include, mediaUrl } = opts;
  const handle = user.handle ?? "";
  const included = (v: Visibility) =>
    (include as readonly Visibility[]).includes(v);

  // Carried on every voice item so the author's visualizer travels with
  // the post — a friend's reader draws their voice the way they picked it.
  const voiceViz = normalizeVoiceViz(user.preferences?.voiceViz);

  const feedTitle = `${user.displayName || handle} — Nearstream`;
  const feedDescription = `Stream, essays, and inventory from ${user.displayName || handle}.`;

  const [allEntries, allEssays, allItems, allTracks] = await Promise.all([
    store.list(user.id),
    essayStore.list(user.id),
    inventoryStore.list(user.id),
    musicStore.list(user.id),
  ]);
  const entries = allEntries.filter((e) => included(visibilityOf(e)));
  const essays = allEssays.filter((e) => included(visibilityOf(e)));
  const items = allItems.filter((i) => included(visibilityOf(i)));
  const tracks = allTracks.filter((t) => included(visibilityOf(t)));

  const essayTitles = new Map(essays.map((e) => [e.slug, e.title]));
  const inventoryTitles = new Map(items.map((i) => [i.slug, i.title]));

  function lookupLinkTitle(link: LibraryLink): string | null {
    return (
      (link.type === "essay" ? essayTitles : inventoryTitles).get(link.slug) ??
      null
    );
  }

  const feedItems: FeedItem[] = [];

  for (const entry of entries) {
    const v = visibilityOf(entry);
    const hasAudio = !!entry.audio;
    // Voice entries get their own detail URL so friends' readers link
    // to a shareable page with a bespoke OG preview. Text-only notes
    // stay as fragment links into the tenant's `/stream` list.
    const link =
      v !== "public"
        ? siteUrl
        : hasAudio
          ? `${siteUrl}/voice/${entry.id}`
          : `${siteUrl}/stream#entry-${entry.id}`;
    // Voice notes may have no caption — title fallback keeps RSS
    // readers that need a title from rendering an empty string.
    const title = entry.text
      ? deriveTitle(entry.text)
      : hasAudio
        ? "Voice note"
        : "";
    let body = entry.text;
    if (entry.link) {
      const linkTitle = lookupLinkTitle(entry.link);
      if (linkTitle) {
        body += `\n\n→ ${linkTitle}: ${siteUrl}${linkHref(entry.link)}`;
      }
    }
    let audioElements = "";
    if (entry.audio) {
      // Inline an <audio> so friends' readers that render HTML can play
      // without needing to parse the extension element. Same URL as the
      // <enclosure> below.
      const audioUrl = await mediaUrl(entry.audio.key);
      const audioTag = `<p><audio controls src="${escapeXml(audioUrl)}" preload="metadata"></audio></p>`;
      body = body ? `${audioTag}\n${body}` : audioTag;
      audioElements = `\n      <nearstream:audio url="${escapeXml(audioUrl)}" mime="${escapeXml(entry.audio.mime)}" durationMs="${entry.audio.durationMs}" viz="${escapeXml(voiceViz)}" />\n      <enclosure url="${escapeXml(audioUrl)}" length="0" type="${escapeXml(entry.audio.mime)}" />`;
    }
    const entryType = hasAudio ? "voice" : "note";
    feedItems.push({
      publishedAt: entry.publishedAt,
      toXml: () => `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(entry.id)}</guid>
      <pubDate>${toRfc822(entry.publishedAt)}</pubDate>
      <category>Stream</category>
      <category>${escapeXml(entry.tag)}</category>
      <nearstream:type>${entryType}</nearstream:type>${restrictedMarker(v)}${audioElements}
      <description><![CDATA[${escapeCdata(body)}]]></description>
    </item>`,
    });
  }

  // Essay bodies point at images with a relative `/api/media/{key}`, which
  // means nothing inside a reader. Only worked out when some essay has one,
  // since it lists every store again.
  const essayMedia = essays.some((e) => e.body.includes("/api/media/"))
    ? await mediaKeysFor(user, include)
    : new Set<string>();

  for (const essay of essays) {
    const v = visibilityOf(essay);
    const permalink = `${siteUrl}/library/${essay.slug}`;
    const link = v === "public" ? permalink : siteUrl;
    const guid =
      v === "public"
        ? `<guid isPermaLink="true">${escapeXml(permalink)}</guid>`
        : `<guid isPermaLink="false">${escapeXml(essay.id)}</guid>`;
    const html = await rewriteEssayMedia(
      await marked.parse(essay.body, { async: true }),
      essayMedia,
      mediaUrl,
      INSTANCE_URL,
    );
    feedItems.push({
      publishedAt: essay.publishedAt,
      toXml: () => `    <item>
      <title>${escapeXml(essay.title)}</title>
      <link>${escapeXml(link)}</link>
      ${guid}
      <pubDate>${toRfc822(essay.publishedAt)}</pubDate>
      <category>Essay</category>
      <nearstream:type>essay</nearstream:type>${restrictedMarker(v)}
      <description><![CDATA[${escapeCdata(html)}]]></description>
    </item>`,
    });
  }

  for (const item of items) {
    const v = visibilityOf(item);
    const permalink = `${siteUrl}/library/inventory/${item.slug}`;
    const link = v === "public" ? permalink : siteUrl;
    const guid =
      v === "public"
        ? `<guid isPermaLink="true">${escapeXml(permalink)}</guid>`
        : `<guid isPermaLink="false">${escapeXml(item.id)}</guid>`;
    const body = await renderInventoryBody(item, mediaUrl);
    const all = imagesOf(item);
    // One <enclosure> per image (RSS 2.0 permits multiple). Most readers
    // act on the first; the rest are there for archival fidelity. The body
    // <img> tags above are what visual readers actually render.
    const enclosures = (
      await Promise.all(
        all.map(async (img) => {
          const imageUrl = await mediaUrl(img.key);
          return `<enclosure url="${escapeXml(imageUrl)}" length="${img.sizeBytes}" type="${escapeXml(img.contentType)}" />`;
        }),
      )
    ).join("\n      ");
    // Nearstream extension: thumbnail of the cover so other instances
    // don't pull the full-res JPEG into the feed. Dimensions derived from
    // the original × the 600px cap (matches inventory-upload-form.tsx).
    // Missing thumbKey or missing original dims short-circuits the
    // element so older items stay valid.
    const thumb = all[0] ? await thumbnailElement(all[0], mediaUrl) : null;
    // Slice 34 extension: one <nearstream:image> per image so friends'
    // readers can render a gallery card with all images, not just the
    // cover. <enclosure> stays for non-Nearstream readers. We emit this
    // even for single-image items — readers parse the array uniformly.
    const imageList = await imageElements(all, mediaUrl);
    feedItems.push({
      publishedAt: item.publishedAt,
      toXml: () => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(link)}</link>
      ${guid}
      <pubDate>${toRfc822(item.publishedAt)}</pubDate>
      <category>Inventory</category>
      <nearstream:type>picture</nearstream:type>${restrictedMarker(v)}
      ${enclosures}${thumb ? `\n      ${thumb}` : ""}
      ${imageList}
      <description><![CDATA[${escapeCdata(body)}]]></description>
    </item>`,
    });
  }

  for (const track of tracks) {
    const v = visibilityOf(track);
    const permalink = `${siteUrl}/library/music/${track.slug}`;
    const link = v === "public" ? permalink : siteUrl;
    const guid =
      v === "public"
        ? `<guid isPermaLink="true">${escapeXml(permalink)}</guid>`
        : `<guid isPermaLink="false">${escapeXml(track.id)}</guid>`;
    const audioUrl = await mediaUrl(track.audio.key);
    const byline = track.artist ? `${track.artist} — ${track.title}` : track.title;

    // Body: cover image (if any), then an inline <audio> so readers that
    // render HTML can play without parsing the extension, then the notes.
    // Same order as the detail page.
    const parts: string[] = [];
    if (track.cover) {
      const coverUrl = await mediaUrl(track.cover.key);
      const dims =
        track.cover.width && track.cover.height
          ? ` width="${track.cover.width}" height="${track.cover.height}"`
          : "";
      parts.push(
        `<p><img src="${htmlEscape(coverUrl)}" alt="${htmlEscape(`Cover for ${track.title}`)}"${dims} style="max-width: 100%; height: auto;" /></p>`,
      );
    }
    parts.push(
      `<p><audio controls src="${htmlEscape(audioUrl)}" preload="metadata"></audio></p>`,
    );
    if (track.description) {
      parts.push(await marked.parse(track.description, { async: true }));
    }
    const body = parts.join("\n");

    // `nearstream:track` carries what a card needs without re-parsing the
    // body: artist and title separately (a reader may want to render them
    // differently), plus duration. The audio itself rides on
    // `nearstream:audio` — the same element voice notes use — so a reader
    // that already handles voice gets playback for free and only needs the
    // new element for the metadata.
    const durationAttr =
      typeof track.audio.durationMs === "number"
        ? ` durationMs="${track.audio.durationMs}"`
        : "";
    const artistAttr = track.artist ? ` artist="${escapeXml(track.artist)}"` : "";
    const coverEl = track.cover
      ? `\n      <nearstream:cover url="${escapeXml(await mediaUrl(track.cover.thumbKey ?? track.cover.key))}" />`
      : "";

    feedItems.push({
      publishedAt: track.publishedAt,
      toXml: () => `    <item>
      <title>${escapeXml(byline)}</title>
      <link>${escapeXml(link)}</link>
      ${guid}
      <pubDate>${toRfc822(track.publishedAt)}</pubDate>
      <category>Music</category>
      <nearstream:type>track</nearstream:type>${restrictedMarker(v)}
      <nearstream:track title="${escapeXml(track.title)}"${artistAttr}${durationAttr} />${coverEl}
      <nearstream:audio url="${escapeXml(audioUrl)}" mime="${escapeXml(track.audio.mime)}"${durationAttr} viz="${escapeXml(voiceViz)}" />
      <enclosure url="${escapeXml(audioUrl)}" length="${track.audio.sizeBytes}" type="${escapeXml(track.audio.mime)}" />
      <description><![CDATA[${escapeCdata(body)}]]></description>
    </item>`,
    });
  }

  feedItems.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const lastBuild = feedItems[0]?.publishedAt ?? new Date().toISOString();
  const itemsXml = feedItems.map((it) => it.toXml()).join("\n");

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:nearstream="https://nearstream.app/ns/v1">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(feedDescription)}</description>
    <language>en</language>
    <lastBuildDate>${toRfc822(lastBuild)}</lastBuildDate>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>
`;
}

/** Every media key a feed with these visibilities can reference — the
 *  allow-list `lib/key-media.ts` checks a key-scoped media request against. */
export async function mediaKeysFor(
  user: User,
  include: FeedOptions["include"],
): Promise<Set<string>> {
  const ok = (v: Visibility) => (include as readonly Visibility[]).includes(v);
  const [entries, items, tracks, essays] = await Promise.all([
    store.list(user.id),
    inventoryStore.list(user.id),
    musicStore.list(user.id),
    essayStore.list(user.id),
  ]);
  const keys = new Set<string>();
  for (const e of entries) if (ok(visibilityOf(e)) && e.audio) keys.add(e.audio.key);
  for (const e of essays) {
    if (!ok(visibilityOf(e))) continue;
    for (const key of e.images ?? []) keys.add(key);
  }
  for (const i of items) {
    if (!ok(visibilityOf(i))) continue;
    for (const img of imagesOf(i)) {
      keys.add(img.key);
      if (img.thumbKey) keys.add(img.thumbKey);
    }
  }
  for (const t of tracks) {
    if (!ok(visibilityOf(t))) continue;
    keys.add(t.audio.key);
    if (t.cover) {
      keys.add(t.cover.key);
      if (t.cover.thumbKey) keys.add(t.cover.thumbKey);
    }
  }
  return keys;
}
