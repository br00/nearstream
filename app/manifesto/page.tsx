// Renders the full NEARSTREAM.md verbatim at /manifesto. The markdown file is
// the canonical source of project truth (philosophy, lexicon, decisions log,
// build phases, anti-aspirations); this just makes it readable in a browser
// without sending people to GitHub.
//
// Read at request time (force-dynamic) so docs edits go live with the next
// merge. No build-time inlining — keeps the manifesto file the source of
// truth, not a snapshot.

import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { marked } from "marked";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manifesto · Nearstream",
  description:
    "The full Nearstream document — concept, lexicon, architecture, decisions, build phases, anti-aspirations.",
};

export default async function ManifestoPage() {
  const markdownPath = path.join(process.cwd(), "NEARSTREAM.md");
  let markdown: string;
  try {
    markdown = await fs.readFile(markdownPath, "utf8");
  } catch (err) {
    console.error("[/manifesto] could not read NEARSTREAM.md", err);
    markdown =
      "# Manifesto unavailable\n\nThe canonical document is at [github.com/br00/nearstream/blob/main/NEARSTREAM.md](https://github.com/br00/nearstream/blob/main/NEARSTREAM.md).";
  }

  const html = await marked.parse(markdown, { async: true });

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      leftNav={<NearstreamLockup size={24} className="text-foreground" />}
      rightNav={
        <Link href="/about" className={navLinkClasses}>
          About
        </Link>
      }
    >
      <main className="flex flex-1 px-6 py-16">
        <article className="mx-auto w-full max-w-2xl">
          <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-muted-soft">
            Manifesto
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-soft">
            The single source of truth for terms, decisions, and reasoning
            behind Nearstream. Edited as the project evolves; the GitHub copy
            and this page are the same document.
          </p>
          <div
            className="prose-essay mt-12 text-[15px] leading-relaxed text-foreground/90"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>
      </main>
    </PageShell>
  );
}
