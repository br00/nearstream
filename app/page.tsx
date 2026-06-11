import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { NearstreamMarkAnimated } from "@/app/_components/site/nearstream-mark-animated";
import { getSession } from "@/lib/auth";
import { userStore } from "@/lib/user-store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Nearstream — a quieter way to share",
  description:
    "Stepped off social media. Building something personal — a place to share daily life with close friends. No algorithm. No public. Just us.",
};

// The instance landing — served on `nearstream.app/` only. Custom-domain
// requests get rewritten to `/{handle}` by the proxy before they reach this
// page, so this page never renders on alessandroborelli.it.
//
// Signed-in visitors get redirected to /reader (or /onboarding if they
// haven't picked a handle yet). Signed-out visitors see the marketing copy.

export default async function InstanceLanding() {
  const session = await getSession();
  if (session) {
    const user = await userStore.getById(session.userId);
    if (user && !user.handle) redirect("/onboarding");
    if (user && user.handle) redirect("/reader");
  }

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";
  const sectionLabel =
    "font-mono text-[11px] tracking-[0.25em] uppercase text-muted-soft";

  return (
    <PageShell
      leftNav={<NearstreamLockup size={24} className="text-foreground" />}
      rightNav={
        <Link href="/about" className={navLinkClasses}>
          About
        </Link>
      }
    >
      <main className="flex flex-1 px-6">
        <div className="mx-auto w-full max-w-lg pt-20 pb-32">
          {/* Hero */}
          <div className="mb-12">
            <NearstreamMarkAnimated size={140} />
          </div>
          <p className={sectionLabel}>Nearstream</p>
          <h1 className="mt-8 text-2xl font-normal tracking-tight text-foreground leading-snug whitespace-pre-line">
            A quieter way to share
            {"\n"}with people you actually know.
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-muted max-w-sm">
            I stepped off social media. I&rsquo;m building something personal
            &mdash; a place to share daily life with close friends. No
            algorithm. No public. Just us.
          </p>

          {/* What is this */}
          <section className="mt-24 pt-24 border-t border-border">
            <p className={sectionLabel}>What is this</p>
            <div className="mt-8 grid gap-6 text-sm leading-relaxed text-muted">
              <p>
                Social networks took something simple &mdash; sharing with
                friends &mdash; and turned it into a performance for strangers.
              </p>
              <p className="text-foreground">
                Nearstream is the opposite. Your own site, your own stream.
                Your friends see it in a reader that shows everything in order,
                nothing more.
              </p>
              <p>
                No likes. No views. No strangers. Just a quiet stream of life
                from people you chose.
              </p>
            </div>
            <p className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
              <Link
                href="/about"
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground underline underline-offset-4 decoration-muted-soft transition-colors hover:decoration-foreground"
              >
                About &rarr;
              </Link>
              <Link
                href="/manifesto"
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground underline underline-offset-4 decoration-muted-soft transition-colors hover:decoration-foreground"
              >
                Manifesto &rarr;
              </Link>
            </p>
          </section>

          {/* CTA */}
          <section className="mt-24 pt-24 border-t border-border">
            <p className={sectionLabel}>Already invited?</p>
            <div className="mt-8 flex items-center gap-6">
              <Link
                href="/login"
                className="border border-border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground hover:text-background"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-6 text-xs text-muted-soft leading-relaxed">
              Nearstream is invitation-only. If you don&rsquo;t have an invite,
              there&rsquo;s nothing to sign up for &mdash; that&rsquo;s by
              design.
            </p>
          </section>
        </div>
      </main>
    </PageShell>
  );
}
