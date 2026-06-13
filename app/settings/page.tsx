// /settings — profile + export + host tools + sign out. Split out of /studio
// in slice 25 so studio stays focused on posting and the reader-friends page
// stays focused on consumption. Anything "I do once and forget about" lives
// here.

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, isHostEmail } from "@/lib/auth";
import { userStore } from "@/lib/user-store";
import { tenantBase } from "@/lib/tenant-domains";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { SubmitButton } from "@/app/_components/submit-button";
import { Input } from "@/app/_components/input";
import { Kicker } from "@/app/_components/kicker";
import { ProfileMarkPicker } from "@/app/_components/site/profile-mark-picker";

export const metadata = {
  title: "Settings · Nearstream",
};

type Props = {
  searchParams: Promise<{ "profile-error"?: string }>;
};

export default async function SettingsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await userStore.getById(session.userId);
  if (!user) redirect("/login");
  if (!user.handle) redirect("/onboarding");

  const { "profile-error": profileError } = await searchParams;

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      leftNav={<NearstreamLockup size={24} className="text-foreground" />}
      rightNav={
        <>
          <Link href="/studio" className={navLinkClasses}>
            Studio
          </Link>
          <Link href="/reader" className={navLinkClasses}>
            Reader
          </Link>
        </>
      }
    >
      <section className="flex flex-1 justify-center px-6">
        <div className="w-full max-w-lg py-12">
          <Kicker>Settings</Kicker>
          <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
            Your profile
          </h1>
          <p className="mt-2 text-sm text-muted-soft">
            Your name as it appears on your site and in your RSS feed. Handle
            (<code className="font-mono">/{user.handle}</code>) is fixed;
            display name and profile mark you can change anytime.
          </p>

          {profileError && (
            <div
              role="alert"
              className="mt-8 border-l-2 border-foreground/50 pl-4 py-2"
            >
              <Kicker>Could not save</Kicker>
              <p className="mt-1 text-sm text-muted">{profileError}</p>
            </div>
          )}

          <form
            action="/api/profile"
            method="POST"
            className="mt-10 flex flex-col gap-8"
          >
            <label className="flex flex-col gap-2">
              <Kicker>Display name</Kicker>
              <Input
                name="displayName"
                required
                maxLength={80}
                defaultValue={user.displayName}
              />
            </label>

            <fieldset className="flex flex-col gap-3">
              <legend>
                <Kicker>Profile mark</Kicker>
              </legend>
              <p className="text-sm leading-relaxed text-muted-soft">
                The animated mark that sits at the top of your home page in
                place of a profile photo.
              </p>
              <div className="mt-2">
                <ProfileMarkPicker
                  name="profileMark"
                  defaultValue={user.profileMark}
                  tileSize={88}
                />
              </div>
            </fieldset>

            <SubmitButton pendingLabel="Saving…" className="self-start">
              Save
            </SubmitButton>
          </form>

          <hr className="mt-20 border-border" />

          {/* Your site — quick link out to your own tenant home + library,
              now that those links are gone from the /studio nav. */}
          <div className="mt-12">
            <Kicker>Your site</Kicker>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Lives at{" "}
              <Link
                href={tenantBase(user.handle)}
                className="text-foreground underline underline-offset-4 decoration-muted-soft hover:decoration-foreground"
              >
                {tenantBase(user.handle).replace(/^https?:\/\//, "")}
              </Link>
              .
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={tenantBase(user.handle)}
                className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground hover:text-background"
              >
                Open home →
              </Link>
              <Link
                href={`${tenantBase(user.handle)}/library`}
                className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground hover:border-foreground"
              >
                Open library →
              </Link>
            </div>
          </div>

          <hr className="mt-20 border-border" />

          {/* Export — "ownership through exit." Manifesto promise made real
              (NEARSTREAM.md §05). ZIP download of everything in your tenant
              namespace. */}
          <div className="mt-12">
            <Kicker>Your data</Kicker>
            <a
              href="/api/export"
              className="mt-3 inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-foreground underline underline-offset-4 decoration-muted-soft transition-colors hover:decoration-foreground"
            >
              Download all my content →
            </a>
            <p className="mt-2 text-xs leading-relaxed text-muted-soft">
              A ZIP with your profile, Letter, Stream, Essays, Inventory,
              friend list — and every image as actual bytes under{" "}
              <code className="font-mono">media/</code>. Self-contained
              snapshot, yours forever.
            </p>
          </div>

          {isHostEmail(user.email) && (
            <>
              <hr className="mt-20 border-border" />
              <div className="mt-12">
                <Kicker>Host tools</Kicker>
                <form
                  action="/api/admin/migrate-host"
                  method="POST"
                  className="mt-3"
                >
                  <button
                    type="submit"
                    className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft transition-colors hover:text-foreground"
                  >
                    Migrate legacy content →
                  </button>
                </form>
                <p className="mt-2 text-xs leading-relaxed text-muted-soft">
                  One-time copy of the pre-Phase-3 R2 keys into your tenant
                  namespace. Idempotent.
                </p>
              </div>
            </>
          )}

          <hr className="mt-20 border-border" />

          <form action="/auth/logout" method="POST" className="mt-12">
            <button
              type="submit"
              className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-soft transition-colors hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </section>
    </PageShell>
  );
}
