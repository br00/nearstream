// Throwaway script. Run with `npx tsx scratch/test-type-detection.ts` to verify
// the parser's type detection on:
//   1. A Nearstream-shaped RSS (with <nearstream:type> + <category>)
//   2. A non-Nearstream feed without explicit type — heuristic fallback
//
// This is not a real test (no test framework yet) but it catches the obvious
// regressions in slice 17.

import { parseFeed } from "../lib/feed-parser";

const nearstreamRss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:nearstream="https://nearstream.app/ns/v1">
  <channel>
    <title>Test</title>
    <link>https://example.com</link>
    <item>
      <title>A note</title>
      <link>https://example.com/note</link>
      <guid isPermaLink="false">note-1</guid>
      <pubDate>Sat, 6 Jun 2026 12:00:00 GMT</pubDate>
      <category>Stream</category>
      <nearstream:type>note</nearstream:type>
      <description><![CDATA[Short note text.]]></description>
    </item>
    <item>
      <title>An essay</title>
      <link>https://example.com/essay</link>
      <guid isPermaLink="true">https://example.com/essay</guid>
      <pubDate>Fri, 5 Jun 2026 12:00:00 GMT</pubDate>
      <category>Essay</category>
      <nearstream:type>essay</nearstream:type>
      <description><![CDATA[<p>Long body</p>]]></description>
    </item>
    <item>
      <title>A picture</title>
      <link>https://example.com/picture</link>
      <guid isPermaLink="true">https://example.com/picture</guid>
      <pubDate>Thu, 4 Jun 2026 12:00:00 GMT</pubDate>
      <category>Inventory</category>
      <nearstream:type>picture</nearstream:type>
      <enclosure url="https://example.com/p.jpg" length="1234" type="image/jpeg" />
      <description><![CDATA[<p><img src="..." /></p>]]></description>
    </item>
  </channel>
</rss>`;

const heuristicRss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>A blog</title>
    <link>https://example.com</link>
    <item>
      <title>Some essay title</title>
      <link>https://example.com/long</link>
      <pubDate>Sat, 6 Jun 2026 12:00:00 GMT</pubDate>
      <description><![CDATA[${"x".repeat(500)}]]></description>
    </item>
    <item>
      <title></title>
      <link>https://example.com/short</link>
      <pubDate>Sat, 6 Jun 2026 11:00:00 GMT</pubDate>
      <description>Quick note</description>
    </item>
    <item>
      <title>Photo of the day</title>
      <link>https://example.com/photo</link>
      <pubDate>Sat, 6 Jun 2026 10:00:00 GMT</pubDate>
      <enclosure url="https://example.com/p.jpg" length="1234" type="image/jpeg" />
      <description>see attached</description>
    </item>
  </channel>
</rss>`;

function assertType(label: string, actual: string, expected: string) {
  const ok = actual === expected;
  console.log(`${ok ? "✓" : "✗"} ${label}: got "${actual}", expected "${expected}"`);
  if (!ok) process.exitCode = 1;
}

const a = parseFeed(nearstreamRss, "src-a");
console.log(`\nNearstream-shaped feed → ${a.entries.length} entries`);
assertType("note  via <nearstream:type>", a.entries[0].type, "note");
assertType("essay via <nearstream:type>", a.entries[1].type, "essay");
assertType("picture via <nearstream:type>", a.entries[2].type, "picture");

const b = parseFeed(heuristicRss, "src-b");
console.log(`\nUnannotated feed → ${b.entries.length} entries`);
assertType("essay heuristic (title + long body)", b.entries[0].type, "essay");
assertType("note heuristic (no title)", b.entries[1].type, "note");
assertType("picture heuristic (enclosure)", b.entries[2].type, "picture");

if (process.exitCode) {
  console.error("\nSome checks failed.");
} else {
  console.log("\nAll checks passed.");
}
