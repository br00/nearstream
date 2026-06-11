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
              A single Next.js app, AGPL-3.0, open source. Each person gets a
              tenant &mdash; their own site at{" "}
              <code className="font-mono text-foreground">/&#123;handle&#125;</code>
              , their own RSS feed, their own posts. The reader pulls
              friends&rsquo; feeds, merges by date, renders type-shaped cards.
              That&rsquo;s the whole architecture.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href="https://github.com/br00/nearstream"
                className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground hover:text-background"
              >
                github.com/br00/nearstream &rarr;
              </a>
              <Link
                href="/manifesto"
                className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground hover:border-foreground"
              >
                Manifesto
              </Link>
              <a
                href="https://github.com/br00/nearstream/blob/main/ARCHITECTURE.md"
                className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground hover:border-foreground"
              >
                ARCHITECTURE.md
              </a>
            </div>

            <dl className="mt-12 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-5 text-sm leading-relaxed">
              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft pt-1">
                Primitives
              </dt>
              <dd className="text-muted">
                Stream (timestamped notes), Library (essays + inventory items,
                each at its own URL), Letter (the dated dispatch at the top of
                a home), Source (a friend&rsquo;s feed URL in your local reader).
              </dd>

              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft pt-1">
                Protocol
              </dt>
              <dd className="text-muted">
                RSS 2.0 with a tiny Nearstream namespace{" "}
                <code className="font-mono text-foreground">
                  xmlns:nearstream
                </code>{" "}
                so typed entries (note / essay / picture) round-trip between
                instances. Any RSS reader can read a Nearstream feed; any
                Nearstream reader can read any RSS feed.
              </dd>

              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft pt-1">
                Storage
              </dt>
              <dd className="text-muted">
                Cloudflare R2 (S3-compatible). Each tenant&rsquo;s content
                lives at{" "}
                <code className="font-mono text-foreground">
                  users/&#123;userId&#125;/&hellip;
                </code>
                . No database, no migrations.
              </dd>

              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft pt-1">
                Auth
              </dt>
              <dd className="text-muted">
                Magic-link email via Resend. Sessions are HMAC-signed cookies,
                30 lines of Web Crypto. No SDKs, no JWT library, no Lucia.
              </dd>

              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft pt-1">
                Deploy
              </dt>
              <dd className="text-muted">
                Vercel today, intentionally portable. No Vercel-specific APIs
                &mdash; the codebase ships as a single container to anywhere
                that runs Node.
              </dd>
            </dl>
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
