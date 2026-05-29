import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEARSTREAM_SITE_URL ?? "http://localhost:3000";
const FEED_TITLE = "Nearstream — Alessandro Borelli";
const FEED_DESCRIPTION = "Stream entries from Alessandro Borelli.";

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
  const entries = await store.list();
  const lastBuild = entries[0]?.publishedAt ?? new Date().toISOString();

  const items = entries
    .map((entry) => {
      const link = `${SITE_URL}/#entry-${entry.id}`;
      return `    <item>
      <title>${escapeXml(deriveTitle(entry.text))}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(entry.id)}</guid>
      <pubDate>${toRfc822(entry.publishedAt)}</pubDate>
      <category>${escapeXml(entry.tag)}</category>
      <description><![CDATA[${escapeCdata(entry.text)}]]></description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>en</language>
    <lastBuildDate>${toRfc822(lastBuild)}</lastBuildDate>
    <atom:link href="${escapeXml(SITE_URL)}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
