// /settings — profile + export + host tools + sign out. Split out of /studio
// in slice 25 so studio stays focused on posting and the reader-friends page
// stays focused on consumption. Anything "I do once and forget about" lives
// here.

import { redirect } from "next/navigation";
import { getSession, isHostEmail } from "@/lib/auth";
import { userStore } from "@/lib/user-store";
import { tenantAbsoluteBase } from "@/lib/tenant-domains";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamMark } from "@/app/_components/nearstream-mark";
import { AuthedNavTop, AuthedNavBottom } from "@/app/_components/authed-nav";
import { SubmitButton } from "@/app/_components/submit-button";
import { Input } from "@/app/_components/input";
import { Kicker } from "@/app/_components/kicker";
import { ProfileMarkPicker } from "@/app/_components/site/profile-mark-picker";
import { ShareUrlButton } from "@/app/_components/share-url-button";
import type { ReaderLayout, GalleryLayout } from "@/schemas/user";

// Display modes shipped on this surface. Adding a new one is: define it
// here, render it in app/reader/page.tsx (and the broadsheet entry helpers
// nearby), append it to READER_LAYOUTS in schemas/user.ts.
const READER_LAYOUT_OPTIONS: {
  key: ReaderLayout;
  label: string;
  hint: string;
}[] = [
  {
    key: "default",
    label: "Default — app-dense",
    hint: "Larger author names, mode pills, full-width pictures. The phone-first take.",
  },
  {
    key: "broadsheet",
    label: "Broadsheet — quiet",
    hint: "Serif headlines, generous margins, mono meta. The newspaper-on-a-phone take.",
  },
];

const GALLERY_LAYOUT_OPTIONS: {
  key: GalleryLayout;
  label: string;
  hint: string;
}[] = [
  {
    key: "contact-sheet",
    label: "Contact sheet — modal viewer",
    hint: "Square tile grid on the detail page; tap a tile to open a full-bleed viewer with swipe between images.",
  },
  {
    key: "stack",
    label: "Stack — scroll",
    hint: "Every image at its native ratio, full-width, top-to-bottom. No modal, no tap-to-open. The reading-room take.",
  },
];

export const metadata = {
  title: "Settings · Nearstream",
};

type Props = {
  searchParams: Promise<{
    "profile-error"?: string;
    "prefs-error"?: string;
  }>;
};

export default async function SettingsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await userStore.getById(session.userId);
  if (!user) redirect("/login");
  if (!user.handle) redirect("/onboarding");

  const { "profile-error": profileError, "prefs-error": prefsError } =
    await searchParams;

  return (
    <PageShell
      leftNav={<NearstreamMark size={24} className="text-foreground" />}
      rightNav={
        <AuthedNavTop tenantHandle={user.handle} />
      }
    >
      <section className="flex flex-1 justify-center px-6 pb-24 sm:pb-12">
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

          {/* Display — the user owns rendering. Slice 33 ships this with one
              surface wired (the reader). Adding more surfaces later is one
              entry in schemas/user.ts + one form here. */}
          <div id="display" className="mt-12 scroll-mt-6">
            <Kicker>Display</Kicker>
            <h2 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
              How things look to you
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Nearstream ships strong primitives &mdash; Stream, Letter,
              Library, Inventory, Friends &mdash; and a small set of curated
              modes for how each surface renders. You pick. More surfaces will
              get modes over time.
            </p>

            {prefsError && (
              <div
                role="alert"
                className="mt-8 border-l-2 border-foreground/50 pl-4 py-2"
              >
                <Kicker>Could not save</Kicker>
                <p className="mt-1 text-sm text-muted">{prefsError}</p>
              </div>
            )}

            <form
              action="/api/preferences"
              method="POST"
              className="mt-10 flex flex-col gap-8"
            >
              <fieldset className="flex flex-col gap-3">
                <legend>
                  <Kicker>Reader layout</Kicker>
                </legend>
                <p className="text-sm leading-relaxed text-muted-soft">
                  How the feed at <code className="font-mono">/reader</code>{" "}
                  renders.
                </p>
                <div className="mt-2 flex flex-col gap-3">
                  {READER_LAYOUT_OPTIONS.map((opt) => {
                    const isActive =
                      (user.preferences?.readerLayout ?? "default") === opt.key;
                    return (
                      <label
                        key={opt.key}
                        className="flex cursor-pointer items-baseline gap-3 border border-border p-4 hover:border-foreground/60"
                      >
                        <input
                          type="radio"
                          name="readerLayout"
                          value={opt.key}
                          defaultChecked={isActive}
                          className="accent-foreground"
                        />
                        <span className="flex flex-col gap-1">
                          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground">
                            {opt.label}
                          </span>
                          <span className="text-[12.5px] text-muted-soft">
                            {opt.hint}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-3">
                <legend>
                  <Kicker>Inventory gallery</Kicker>
                </legend>
                <p className="text-sm leading-relaxed text-muted-soft">
                  How a multi-image inventory item renders on your tenant
                  page at <code className="font-mono">/{user.handle}/library/inventory/[slug]</code>.
                </p>
                <div className="mt-2 flex flex-col gap-3">
                  {GALLERY_LAYOUT_OPTIONS.map((opt) => {
                    const isActive =
                      (user.preferences?.galleryLayout ?? "contact-sheet") ===
                      opt.key;
                    return (
                      <label
                        key={opt.key}
                        className="flex cursor-pointer items-baseline gap-3 border border-border p-4 hover:border-foreground/60"
                      >
                        <input
                          type="radio"
                          name="galleryLayout"
                          value={opt.key}
                          defaultChecked={isActive}
                          className="accent-foreground"
                        />
                        <span className="flex flex-col gap-1">
                          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground">
                            {opt.label}
                          </span>
                          <span className="text-[12.5px] text-muted-soft">
                            {opt.hint}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <SubmitButton pendingLabel="Saving…" className="self-start">
                Save display
              </SubmitButton>
            </form>
          </div>

          <hr className="mt-20 border-border" />

          {/* Your URL — the canonical "where do I find my URL to send to a
              friend?" answer. The Share button shares the SITE URL because
              that's an HTML page with OpenGraph metadata, so WhatsApp /
              iMessage render a proper preview card (mark + display name +
              tagline). The feed URL is shown below for friends who want to
              paste it directly into a reader instead of clicking through. */}
          <div className="mt-12">
            <Kicker>Your URL</Kicker>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Send this to a friend so they can add you to their Nearstream
              reader. Tap Share — your phone&rsquo;s share sheet opens
              (WhatsApp, Messages, Mail, anything) with the link ready to
              send, complete with a preview card.
            </p>

            {(() => {
              const instanceUrl =
                process.env.NEARSTREAM_SITE_URL ?? "https://www.nearstream.app";
              const siteUrl = tenantAbsoluteBase(user.handle, instanceUrl);
              const feedUrl = `${siteUrl}/rss.xml`;
              const firstName = user.displayName.split(" ")[0] || user.handle;
              const shareMessage = `Add me on Nearstream →`;
              return (
                <>
                  <dl className="mt-6 grid grid-cols-[max-content_1fr] gap-x-5 gap-y-3 text-[13px]">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft pt-1">
                      Site
                    </dt>
                    <dd className="font-mono text-foreground break-all">
                      {siteUrl.replace(/^https?:\/\//, "")}
                    </dd>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft pt-1">
                      Feed
                    </dt>
                    <dd className="font-mono text-foreground break-all">
                      {feedUrl.replace(/^https?:\/\//, "")}
                    </dd>
                  </dl>
                  <div className="mt-6">
                    <ShareUrlButton
                      url={siteUrl}
                      title={`Add ${firstName} on Nearstream`}
                      message={shareMessage}
                    />
                  </div>
                </>
              );
            })()}
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
      <AuthedNavBottom tenantHandle={user.handle} />
    </PageShell>
  );
}
