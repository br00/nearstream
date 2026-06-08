import Link from "next/link";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";

export const metadata = {
  title: "About · Nearstream",
  description: "A quieter way to share with people you actually know.",
};

// Ported from the original nearstream-khaki landing's /about page so the
// long-form explanation survives the domain move from nearstream-khaki to the
// multi-tenant project. Same copy + section structure; chrome uses the
// Nearstream PageShell so it composes with the rest of the platform UI.

export default function AboutPage() {
  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";
  const sectionLabel =
    "font-mono text-[11px] tracking-[0.25em] uppercase text-muted-soft";

  return (
    <PageShell
      leftNav={<NearstreamLockup size={24} className="text-foreground" />}
      rightNav={
        <Link href="/" className={navLinkClasses}>
          ← Home
        </Link>
      }
    >
      <main className="flex flex-1 px-6 py-16">
        <div className="mx-auto w-full max-w-lg">
          <section>
            <p className={sectionLabel}>The experience</p>
            <div className="mt-8 grid gap-6 text-sm leading-relaxed text-muted">
              <p>
                You open the reader. You see your friends&rsquo; posts from
                today &mdash; photos, a few words, a sketch, whatever they felt
                like sharing.
              </p>
              <p className="text-foreground">
                Everything is sorted by time. No recommendations, no suggested
                content, no ads. Just a quiet scroll through the day of people
                you actually know.
              </p>
              <p>You close it when you&rsquo;re done. Nothing tries to pull you back.</p>
            </div>
          </section>

          <section className="mt-24 pt-24 border-t border-border">
            <p className={sectionLabel}>The principles</p>
            <ul className="mt-8 space-y-5">
              <Principle>
                You own your domain. Your content lives on your site, not on a
                platform.
              </Principle>
              <Principle>
                Your audience is people you chose. Not followers &mdash;
                friends.
              </Principle>
              <Principle>
                No likes, no views, no metrics. Sharing without performing.
              </Principle>
              <Principle>
                No algorithm decides what you see. Time is the only order.
              </Principle>
            </ul>
          </section>

          <section className="mt-24 pt-24 border-t border-border">
            <p className={sectionLabel}>The stack</p>
            <p className="mt-2 font-mono text-[11px] text-muted-soft">
              For the technically curious.
            </p>
            <p className="mt-8 text-sm leading-relaxed text-muted">
              Each person runs their own site on their own domain. The site
              publishes an RSS feed &mdash; a standard format since 1999. A
              custom reader fetches all your friends&rsquo; feeds, merges them,
              and sorts by date. That&rsquo;s the whole architecture.
            </p>
            <pre className="mt-8 overflow-x-auto rounded border border-border p-4 text-xs leading-relaxed text-muted/80 font-mono">
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

          <section className="mt-24 pt-24 border-t border-border">
            <blockquote className="text-lg font-normal leading-relaxed text-foreground">
              &ldquo;A small audience of people you actually care about is more
              meaningful than a large audience of strangers.&rdquo;
            </blockquote>
            <p className="mt-6 text-sm text-muted leading-relaxed">
              The web was personal once. It can be again.
            </p>
          </section>
        </div>
      </main>
    </PageShell>
  );
}

function Principle({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-4 text-sm leading-relaxed">
      <span className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
      <span className="text-foreground">{children}</span>
    </li>
  );
}
