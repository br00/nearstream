import { marked } from "marked";
import { notFound } from "next/navigation";
import { store } from "@/lib/store";
import { essayStore } from "@/lib/essay-store";
import { inventoryStore } from "@/lib/inventory-store";
import { userStore } from "@/lib/user-store";
import { linkHref, type LibraryLink } from "@/schemas/stream";
import type { InventoryItem } from "@/schemas/inventory";

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
  const imageUrl = `${siteUrl}/api/media/${item.image.key}`;
  const dims =
    item.image.width && item.image.height
      ? ` width="${item.image.width}" height="${item.image.height}"`
      : "";

  const parts: string[] = [
    `<p><img src="${htmlEscape(imageUrl)}" alt="${htmlEscape(item.title)}"${dims} style="max-width: 100%; height: auto;" /></p>`,
  ];

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

export async function GET(_req: Request, { params }: Props) {
  const { handle } = await params;
  const user = await userStore.getByHandle(handle);
  if (!user) notFound();

  const siteUrl = `${INSTANCE_URL}/${handle}`;
  const feedTitle = `${user.displayName || handle} — Nearstream`;
  const feedDescription = `Stream, essays, and inventory from ${user.displayName || handle}.`;

  const [entries, essays, items] = await Promise.all([
    store.list(user.id),
    essayStore.list(user.id),
    inventoryStore.list(user.id),
  ]);

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
    const link = `${siteUrl}/stream#entry-${entry.id}`;
    let body = entry.text;
    if (entry.link) {
      const title = lookupLinkTitle(entry.link);
      if (title) {
        body += `\n\n→ ${title}: ${siteUrl}${linkHref(entry.link)}`;
      }
    }
    feedItems.push({
      publishedAt: entry.publishedAt,
      toXml: () => `    <item>
      <title>${escapeXml(deriveTitle(entry.text))}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(entry.id)}</guid>
      <pubDate>${toRfc822(entry.publishedAt)}</pubDate>
      <category>Stream</category>
      <category>${escapeXml(entry.tag)}</category>
      <nearstream:type>note</nearstream:type>
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
    const imageUrl = `${INSTANCE_URL}/api/media/${item.image.key}`;
    const enclosure = `<enclosure url="${escapeXml(imageUrl)}" length="${item.image.sizeBytes}" type="${escapeXml(item.image.contentType)}" />`;
    feedItems.push({
      publishedAt: item.publishedAt,
      toXml: () => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${toRfc822(item.publishedAt)}</pubDate>
      <category>Inventory</category>
      <nearstream:type>picture</nearstream:type>
      ${enclosure}
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
