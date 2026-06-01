import { marked } from "marked";
import { store } from "@/lib/store";
import { essayStore } from "@/lib/essay-store";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEARSTREAM_SITE_URL ?? "http://localhost:3000";
const FEED_TITLE = "Nearstream — Alessandro Borelli";
const FEED_DESCRIPTION =
  "Stream notes and Library essays from Alessandro Borelli.";

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

export async function GET() {
  const [entries, essays] = await Promise.all([
    store.list(),
    essayStore.list(),
  ]);

  const items: FeedItem[] = [];

  for (const entry of entries) {
    const link = `${SITE_URL}/#entry-${entry.id}`;
    items.push({
      publishedAt: entry.publishedAt,
      toXml: () => `    <item>
      <title>${escapeXml(deriveTitle(entry.text))}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(entry.id)}</guid>
      <pubDate>${toRfc822(entry.publishedAt)}</pubDate>
      <category>Stream</category>
      <category>${escapeXml(entry.tag)}</category>
      <description><![CDATA[${escapeCdata(entry.text)}]]></description>
    </item>`,
    });
  }

  for (const essay of essays) {
    const link = `${SITE_URL}/library/${essay.slug}`;
    const html = await marked.parse(essay.body, { async: true });
    items.push({
      publishedAt: essay.publishedAt,
      toXml: () => `    <item>
      <title>${escapeXml(essay.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${toRfc822(essay.publishedAt)}</pubDate>
      <category>Essay</category>
      <description><![CDATA[${escapeCdata(html)}]]></description>
    </item>`,
    });
  }

  items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const lastBuild = items[0]?.publishedAt ?? new Date().toISOString();
  const itemsXml = items.map((it) => it.toXml()).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>en</language>
    <lastBuildDate>${toRfc822(lastBuild)}</lastBuildDate>
    <atom:link href="${escapeXml(SITE_URL)}/rss.xml" rel="self" type="application/rss+xml" />
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
