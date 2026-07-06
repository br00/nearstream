// /welcome — the celebratory landing after a first-time onboarding save.
// Gives the new friend a real "you're in" moment before dropping them
// into /studio: shows their URL with a share button, and two obvious
// next steps (add a friend, write something).
//
// Reachable at any time by a signed-in user — not gated to "just
// finished onboarding" — so bookmarking works and the page functions as
// a simple identity + first-steps reference. Existing users who never
// went through the new post-slice-37 flow can still land here on their
// own.

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { userStore } from "@/lib/user-store";
import { tenantAbsoluteBase } from "@/lib/tenant-domains";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamMark } from "@/app/_components/nearstream-mark";
import { AuthedNavTop, AuthedNavBottom } from "@/app/_components/authed-nav";
import { Kicker } from "@/app/_components/kicker";
import { ShareUrlButton } from "@/app/_components/share-url-button";
import { ProfileMark } from "@/app/_components/site/profile-mark";

export const metadata = {
  title: "Welcome · Nearstream",
  robots: { index: false, follow: false },
};

export default async function WelcomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await userStore.getById(session.userId);
  if (!user) redirect("/login");
  // If they haven't finished onboarding yet, send them there first —
  // /welcome without a handle is nonsense (no URL to show, no site).
  if (!user.handle) redirect("/onboarding");

  const instanceUrl =
    process.env.NEARSTREAM_SITE_URL ?? "https://www.nearstream.app";
  const siteUrl = tenantAbsoluteBase(user.handle, instanceUrl);
  const firstName = user.displayName.split(" ")[0] || user.handle;

  return (
    <PageShell
      leftNav={<NearstreamMark size={24} className="text-foreground" />}
      rightNav={<AuthedNavTop tenantHandle={user.handle} />}
    >
      <section className="flex flex-1 justify-center px-6 pb-24 sm:pb-12">
        <div className="w-full max-w-lg py-16">
          {/* Hero — their own mark, so the first thing they see is *them*
              on their new site. */}
          <div className="flex flex-col items-center">
            <ProfileMark
              variantIndex={user.profileMark}
              size={200}
              className="block"
              ariaLabel={`${user.displayName || user.handle} — your mark`}
            />
            <h1 className="mt-8 text-center text-2xl font-normal tracking-tight text-foreground">
              You&rsquo;re in, {firstName}.
            </h1>
            <p className="mt-3 text-center text-sm leading-relaxed text-muted">
              This is Nearstream. A quiet room for close friends. No
              algorithm, no strangers, no likes.
            </p>
          </div>

          {/* Your URL — the load-bearing artifact of onboarding. Shown
              prominently with a share affordance, matching /settings
              exactly so the pattern is familiar next time they look. */}
          <div className="mt-16 border-t border-border pt-10">
            <Kicker>Your site</Kicker>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              You now have a place of your own on the internet, at:
            </p>
            <p className="mt-4 font-mono text-[14px] text-foreground break-all">
              {siteUrl.replace(/^https?:\/\//, "")}
            </p>
            <div className="mt-6">
              <ShareUrlButton
                url={siteUrl}
                title={`Add ${firstName} on Nearstream`}
                message="Add me on Nearstream →"
              />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-soft">
              Send this to friends already on Nearstream so they can
              follow you back, or share it publicly if you want &mdash;
              it&rsquo;s your call. You can change who can view it later
              in{" "}
              <Link
                href="/settings#display"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Settings
              </Link>
              .
            </p>
          </div>

          {/* Two next-steps. Bounded, actionable, clearly numbered so it
              doesn't feel like a checklist that follows you around. */}
          <div className="mt-16 border-t border-border pt-10">
            <Kicker>Two things to do next</Kicker>

            <div className="mt-8 flex flex-col gap-8">
              <NextStep
                number="01"
                title="Add a friend"
                body="Nearstream is only interesting when there are a few of you. Paste a friend's URL to follow their stream, or send yours."
                href="/reader/friends"
                cta="Manage friends"
              />
              <NextStep
                number="02"
                title="Write something"
                body="Start with a Stream entry. Short, no title, no commitment. Or write a Letter — the dated note at the top of your home page."
                href="/studio"
                cta="Open studio"
              />
            </div>
          </div>

          {/* Quiet footer — orientation for later. */}
          <div className="mt-16 border-t border-border pt-8">
            <p className="text-xs leading-relaxed text-muted-soft">
              Everything else &mdash; profile mark, display name, site
              privacy, export, sign-out &mdash; lives in{" "}
              <Link
                href="/settings"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Settings
              </Link>
              . The{" "}
              <Link
                href="/manifesto"
                className="text-foreground underline-offset-4 hover:underline"
              >
                manifesto
              </Link>{" "}
              is the working doc if you want the philosophy in longer
              form.
            </p>
          </div>
        </div>
      </section>
      <AuthedNavBottom tenantHandle={user.handle} />
    </PageShell>
  );
}

function NextStep({
  number,
  title,
  body,
  href,
  cta,
}: {
  number: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="grid grid-cols-[max-content_1fr] gap-x-5">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-soft pt-1 tabular-nums">
        {number}
      </span>
      <div>
        <h2 className="text-[17px] font-normal tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
        <Link
          href={href}
          className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.22em] text-foreground underline underline-offset-4 decoration-muted-soft transition-colors hover:decoration-foreground"
        >
          {cta} &rarr;
        </Link>
      </div>
    </div>
  );
}
