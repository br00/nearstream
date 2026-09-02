import { marked } from "marked";
import { notFound } from "next/navigation";
import { store } from "@/lib/store";
import { essayStore } from "@/lib/essay-store";
import { inventoryStore } from "@/lib/inventory-store";
import { musicStore } from "@/lib/music-store";
import { userStore } from "@/lib/user-store";
import { normalizeVoiceViz } from "@/lib/voice-viz-variants";
import { THUMB_MAX_DIM } from "@/lib/thumbnails";
import { tenantAbsoluteBase } from "@/lib/tenant-domains";
import { linkHref, type LibraryLink } from "@/schemas/stream";
import { visibilityOf } from "@/schemas/visibility";
import { resolveSitePrivacy } from "@/lib/tenant-visibility";
import { isInternalFeedRequest } from "@/lib/feed-fetcher";
import type { InventoryItem, InventoryImage } from "@/schemas/inventory";
import { imagesOf } from "@/schemas/inventory";

export const dynamic = "force-dynamic";

const INSTANCE_URL =
  process.env.NEARSTREAM_SITE_URL ?? "http://localhost:3000";

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

function thumbnailElement(
  cover: InventoryImage,
  instanceUrl: string,
): string | null {
  const thumbKey = cover.thumbKey;
  if (!thumbKey) return null;
  const url = `${instanceUrl}/api/media/${thumbKey}`;
  const w = cover.width;
  const h = cover.height;
  if (!w || !h) {
    return `<nearstream:thumbnail url="${escapeXml(url)}" />`;
  }
  const ratio = Math.min(THUMB_MAX_DIM / w, THUMB_MAX_DIM / h, 1);
  const tw = Math.max(1, Math.round(w * ratio));
  const th = Math.max(1, Math.round(h * ratio));
  return `<nearstream:thumbnail url="${escapeXml(url)}" width="${tw}" height="${th}" />`;
}

// Per-image element used by friends' instances to render a gallery in
// their reader without having to pull the full-res originals. Carries
// both the original URL + dimensions and the 600px-capped thumbnail. One
// element per image in `images[]`; the order matches the order on the
// detail page. `<enclosure>` stays alongside for non-Nearstream readers.
function imageElements(
  images: InventoryImage[],
  instanceUrl: string,
): string {
  return images
    .map((img) => {
      const url = `${instanceUrl}/api/media/${img.key}`;
      const w = img.width;
      const h = img.height;
      const wh = w && h ? ` width="${w}" height="${h}"` : "";
      const thumbAttrs = (() => {
        if (!img.thumbKey) return "";
        const tUrl = `${instanceUrl}/api/media/${img.thumbKey}`;
        if (!w || !h) {
          return ` thumbUrl="${escapeXml(tUrl)}"`;
        }
        const ratio = Math.min(THUMB_MAX_DIM / w, THUMB_MAX_DIM / h, 1);
        const tw = Math.max(1, Math.round(w * ratio));
        const th = Math.max(1, Math.round(h * ratio));
        return ` thumbUrl="${escapeXml(tUrl)}" thumbWidth="${tw}" thumbHeight="${th}"`;
      })();
      return `<nearstream:image url="${escapeXml(url)}"${wh}${thumbAttrs} />`;
    })
    .join("\n      ");
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function renderInventoryBody(
  item: InventoryItem,
  siteUrl: string,
): Promise<string> {
  // Multi-image: emit every image as a <p><img>. The first is the cover
  // (what a reader without inline-image support uses for the card). Order
  // mirrors the order on the tenant detail page. Each image keeps native
  // width/height so the reader-side layout doesn't jump.
  const all = imagesOf(item);
  const parts: string[] = all.map((img, i) => {
    const imageUrl = `${siteUrl}/api/media/${img.key}`;
    const dims =
      img.width && img.height
        ? ` width="${img.width}" height="${img.height}"`
        : "";
    const alt = i === 0 ? item.title : `${item.title} — image ${i + 1}`;
    return `<p><img src="${htmlEscape(imageUrl)}" alt="${htmlEscape(alt)}"${dims} style="max-width: 100%; height: auto;" /></p>`;
  });

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

type Props = {
  params: Promise<{ handle: string }>;
};

export async function GET(request: Request, { params }: Props) {
  const { handle } = await params;
  const user = await userStore.getByHandle(handle);
  if (!user) notFound();

  // Only fully-public tenants expose an RSS feed to the outside world.
  // The exception: same-instance fetches (the reader pulling friends'
  // feeds) come with a shared secret header and skip the gate — friends
  // in `friends` mode still need to be readable by other signed-in users
  // on this instance. Private tenants 404 always.
  const privacy = resolveSitePrivacy(user);
  const internal = isInternalFeedRequest(request);
  if (privacy === "private") notFound();
  if (privacy === "friends" && !internal) notFound();

  // Carried on every voice item so the author's visualizer travels with
  // the post — a friend's reader draws their voice the way they picked it.
  const voiceViz = normalizeVoiceViz(user.preferences?.voiceViz);

  const siteUrl = tenantAbsoluteBase(handle, INSTANCE_URL);
  const feedTitle = `${user.displayName || handle} — Nearstream`;
  const feedDescription = `Stream, essays, and inventory from ${user.displayName || handle}.`;

  const [allEntries, allEssays, allItems, allTracks] = await Promise.all([
    store.list(user.id),
    essayStore.list(user.id),
    inventoryStore.list(user.id),
    musicStore.list(user.id),
  ]);
  // RSS is public-only — private entries never leave the instance, and the
  // RSS guid for an entry that flips from public → private wouldn't reappear
  // if it ever flipped back, so the feed stays clean across edits.
  const entries = allEntries.filter((e) => visibilityOf(e) === "public");
  const essays = allEssays.filter((e) => visibilityOf(e) === "public");
  const items = allItems.filter((i) => visibilityOf(i) === "public");
  const tracks = allTracks.filter((t) => visibilityOf(t) === "public");

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
    const hasAudio = !!entry.audio;
    // Voice entries get their own detail URL so friends' readers link
    // to a shareable page with a bespoke OG preview. Text-only notes
    // stay as fragment links into the tenant's `/stream` list.
    const link = hasAudio
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
    if (hasAudio && entry.audio) {
      // Inline an <audio> so friends' readers that render HTML can play
      // without needing to parse the extension element. Same URL as the
      // <enclosure> below.
      const audioUrl = `${INSTANCE_URL}/api/media/${entry.audio.key}`;
      const audioTag = `<p><audio controls src="${escapeXml(audioUrl)}" preload="metadata"></audio></p>`;
      body = body ? `${audioTag}\n${body}` : audioTag;
    }
    const entryType = hasAudio ? "voice" : "note";
    const audioElements =
      hasAudio && entry.audio
        ? `\n      <nearstream:audio url="${escapeXml(`${INSTANCE_URL}/api/media/${entry.audio.key}`)}" mime="${escapeXml(entry.audio.mime)}" durationMs="${entry.audio.durationMs}" viz="${escapeXml(voiceViz)}" />\n      <enclosure url="${escapeXml(`${INSTANCE_URL}/api/media/${entry.audio.key}`)}" length="0" type="${escapeXml(entry.audio.mime)}" />`
        : "";
    feedItems.push({
      publishedAt: entry.publishedAt,
      toXml: () => `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(entry.id)}</guid>
      <pubDate>${toRfc822(entry.publishedAt)}</pubDate>
      <category>Stream</category>
      <category>${escapeXml(entry.tag)}</category>
      <nearstream:type>${entryType}</nearstream:type>${audioElements}
      <description><![CDATA[${escapeCdata(body)}]]></description>
    </item>`,
    });
  }

  for (const essay of essays) {
    const link = `${siteUrl}/library/${essay.slug}`;
    const html = await marked.parse(essay.body, { async: true });
    feedItems.push({
      publishedAt: essay.publishedAt,
      toXml: () => `    <item>
      <title>${escapeXml(essay.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${toRfc822(essay.publishedAt)}</pubDate>
      <category>Essay</category>
      <nearstream:type>essay</nearstream:type>
      <description><![CDATA[${escapeCdata(html)}]]></description>
    </item>`,
    });
  }

  for (const item of items) {
    const link = `${siteUrl}/library/inventory/${item.slug}`;
    const body = await renderInventoryBody(item, INSTANCE_URL);
    const all = imagesOf(item);
    // One <enclosure> per image (RSS 2.0 permits multiple). Most readers
    // act on the first; the rest are there for archival fidelity. The body
    // <img> tags above are what visual readers actually render.
    const enclosures = all
      .map((img) => {
        const imageUrl = `${INSTANCE_URL}/api/media/${img.key}`;
        return `<enclosure url="${escapeXml(imageUrl)}" length="${img.sizeBytes}" type="${escapeXml(img.contentType)}" />`;
      })
      .join("\n      ");
    // Nearstream extension: thumbnail of the cover so other instances
    // don't pull the full-res JPEG into the feed. Dimensions derived from
    // the original × the 600px cap (matches inventory-upload-form.tsx).
    // Missing thumbKey or missing original dims short-circuits the
    // element so older items stay valid.
    const thumb = thumbnailElement(all[0], INSTANCE_URL);
    // Slice 34 extension: one <nearstream:image> per image so friends'
    // readers can render a gallery card with all images, not just the
    // cover. <enclosure> stays for non-Nearstream readers. We emit this
    // even for single-image items — readers parse the array uniformly.
    const imageList = imageElements(all, INSTANCE_URL);
    feedItems.push({
      publishedAt: item.publishedAt,
      toXml: () => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${toRfc822(item.publishedAt)}</pubDate>
      <category>Inventory</category>
      <nearstream:type>picture</nearstream:type>
      ${enclosures}${thumb ? `\n      ${thumb}` : ""}
      ${imageList}
      <description><![CDATA[${escapeCdata(body)}]]></description>
    </item>`,
    });
  }

  for (const track of tracks) {
    const link = `${siteUrl}/library/music/${track.slug}`;
    const audioUrl = `${INSTANCE_URL}/api/media/${track.audio.key}`;
    const byline = track.artist ? `${track.artist} — ${track.title}` : track.title;

    // Body: cover image (if any), then an inline <audio> so readers that
    // render HTML can play without parsing the extension, then the notes.
    // Same order as the detail page.
    const parts: string[] = [];
    if (track.cover) {
      const coverUrl = `${INSTANCE_URL}/api/media/${track.cover.key}`;
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
    const artistAttr = track.artist
      ? ` artist="${escapeXml(track.artist)}"`
      : "";
    const coverEl = track.cover
      ? `\n      <nearstream:cover url="${escapeXml(`${INSTANCE_URL}/api/media/${track.cover.thumbKey ?? track.cover.key}`)}" />`
      : "";

    feedItems.push({
      publishedAt: track.publishedAt,
      toXml: () => `    <item>
      <title>${escapeXml(byline)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${toRfc822(track.publishedAt)}</pubDate>
      <category>Music</category>
      <nearstream:type>track</nearstream:type>
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

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:nearstream="https://nearstream.app/ns/v1">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(feedDescription)}</description>
    <language>en</language>
    <lastBuildDate>${toRfc822(lastBuild)}</lastBuildDate>
    <atom:link href="${escapeXml(siteUrl)}/rss.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
