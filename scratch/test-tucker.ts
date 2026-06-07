import { parseFeed } from "../lib/feed-parser";

async function main() {
  const res = await fetch("https://www.seantucker.photography/blog?format=rss");
  const xml = await res.text();
  console.log(`Fetched ${xml.length} bytes`);

  try {
    const parsed = parseFeed(xml, "test-source");
    console.log(`Parsed ${parsed.entries.length} entries`);
    for (const e of parsed.entries.slice(0, 3)) {
      console.log("---");
      console.log("title:", e.title);
      console.log("url:", e.url);
      console.log("guid:", e.guid);
      console.log("publishedAt:", e.publishedAt);
      console.log("type:", e.type);
      console.log("authorName:", e.authorName);
      console.log("excerpt:", e.excerpt?.slice(0, 80));
      console.log("body length:", e.body?.length);
      console.log("image:", e.image);
    }
  } catch (err) {
    console.error("PARSE FAILED:", err);
  }
}

main();
