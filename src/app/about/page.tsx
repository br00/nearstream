"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Particles from "../components/particles";
import { LogoFull } from "../components/logo";
import { type Locale, detectLocale, t } from "../i18n";

export default function About() {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  const s = t[locale];
  const otherLocale: Locale = locale === "en" ? "it" : "en";

  return (
    <>
      <Particles />

      <div className="relative z-10 flex flex-col min-h-full">
        {/* ─── Nav ─── */}
        <nav className="w-full px-6 py-6 flex items-center justify-between">
          <Link href="/">
            <LogoFull size={24} />
          </Link>
          <button
            onClick={() => setLocale(otherLocale)}
            className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted/40 transition-colors hover:text-foreground cursor-pointer"
          >
            {otherLocale}
          </button>
        </nav>

        <main className="flex-1 px-6 py-16">
          <div className="mx-auto max-w-lg">

            {/* ─── The experience ─── */}
            <section>
              <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-muted/50">
                {s.aboutExpLabel}
              </p>

              <div className="mt-8 grid gap-6 text-sm leading-relaxed text-muted">
                <p>{s.aboutExpP1}</p>
                <p className="text-foreground">{s.aboutExpP2}</p>
                <p>{s.aboutExpP3}</p>
              </div>
            </section>

            {/* ─── The principles ─── */}
            <section className="mt-24 pt-24 border-t border-border">
              <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-muted/50">
                {s.aboutPrinLabel}
              </p>

              <ul className="mt-8 space-y-5">
                {[s.aboutPrin1, s.aboutPrin2, s.aboutPrin3, s.aboutPrin4].map(
                  (principle, i) => (
                    <li key={i} className="flex gap-4 text-sm leading-relaxed">
                      <span className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
                      <span className="text-foreground">{principle}</span>
                    </li>
                  )
                )}
              </ul>
            </section>

            {/* ─── The stack ─── */}
            <section className="mt-24 pt-24 border-t border-border">
              <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-muted/50">
                {s.aboutStackLabel}
              </p>
              <p className="mt-2 font-mono text-[11px] text-muted/30">
                {s.aboutStackNote}
              </p>

              <p className="mt-8 text-sm leading-relaxed text-muted">
                {s.aboutStackP}
              </p>

              {/* Code snippet — the whole idea in 12 lines */}
              <pre className="mt-8 overflow-x-auto rounded border border-border p-4 text-xs leading-relaxed text-muted/70 font-mono">
                <code>{`const friends = [
  { name: "Marco",  feed: "https://marco.xyz/rss.xml" },
  { name: "Sofia",  feed: "https://sofia.site/feed"   },
]

// fetch all feeds in parallel
const posts = await Promise.all(
  friends.map(f => parser.parseURL(f.feed))
)

// merge and sort by time — that's the whole algorithm
const stream = posts
  .flat()
  .sort((a, b) => new Date(b.date) - new Date(a.date))`}</code>
              </pre>
            </section>

            {/* ─── Philosophy ─── */}
            <section className="mt-24 pt-24 border-t border-border">
              <blockquote className="text-lg font-normal leading-relaxed text-foreground">
                {s.quote}
              </blockquote>
              <p className="mt-6 text-sm text-muted leading-relaxed">
                {s.quoteBody}
              </p>
            </section>

          </div>
        </main>

        {/* ─── Footer ─── */}
        <footer className="px-6 py-8 border-t border-border">
          <div className="mx-auto max-w-lg flex items-center justify-end">
            <span className="font-mono text-[11px] text-muted/20">
              2026<span className="cursor-blink">_</span>
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}
