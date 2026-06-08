import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { getSession } from "@/lib/auth";
import { userStore } from "@/lib/user-store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Nearstream — a shared journal between close friends",
  description:
    "A small reader for friends who keep their own sites. No algorithm, no metrics, no for-you.",
};

// The instance landing — served on `nearstream.app/` only. Custom-domain
// requests get rewritten to `/{handle}` by the proxy before they reach this
// page, so this page never renders on alessandroborelli.it.
export default async function InstanceLanding() {
  const session = await getSession();
  if (session) {
    const user = await userStore.getById(session.userId);
    if (user && !user.handle) redirect("/onboarding");
    if (user && user.handle) redirect("/reader");
  }

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      leftNav={<NearstreamLockup size={24} className="text-foreground" />}
      rightNav={
        <Link href="/login" className={navLinkClasses}>
          Sign in →
        </Link>
      }
    >
      <section className="flex flex-1 justify-center px-6">
        <div className="w-full max-w-[32rem] py-20">
          <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-soft">
            Nearstream
          </div>

          <h1 className="mt-8 text-3xl font-normal leading-tight tracking-tight text-foreground">
            A small reader for friends who keep their own sites.
          </h1>

          <div className="mt-10 space-y-4 text-[15px] leading-relaxed text-muted">
            <p>
              Everyone holds a small site &mdash; short notes, longer essays,
              pictures from their day. Nearstream pulls from each one and lays
              them out in a single quiet feed. Chronological, no algorithm,
              no metrics, no &ldquo;for you&rdquo;.
            </p>
            <p>
              A way to keep up with a handful of people you actually want to
              read.
            </p>
          </div>

          <div className="mt-12 flex items-center gap-6">
            <Link
              href="/login"
              className="border border-border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              Sign in
            </Link>
            <Link
              href="/about"
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft transition-colors hover:text-foreground"
            >
              About →
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
              By invitation
            </span>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
