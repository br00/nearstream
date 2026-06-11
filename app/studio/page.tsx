import Link from "next/link";
import { redirect } from "next/navigation";
import { DEFAULT_MODE } from "@/schemas/stream";
import { essayStore } from "@/lib/essay-store";
import { inventoryStore } from "@/lib/inventory-store";
import { letterStore } from "@/lib/letter-store";
import { sourceStore } from "@/lib/source-store";
import { store as streamStore } from "@/lib/store";
import { userStore } from "@/lib/user-store";
import { isHostEmail } from "@/lib/auth";
import { tenantBase } from "@/lib/tenant-domains";
import { getSession } from "@/lib/auth";
import { SubmitButton } from "@/app/_components/submit-button";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { Input } from "@/app/_components/input";
import { Textarea } from "@/app/_components/textarea";
import { Kicker } from "@/app/_components/kicker";
import { ModeRadioGroup } from "@/app/_components/mode-radio";
import { InventoryUploadForm } from "@/app/_components/inventory-upload-form";
import { VisibilityRadio } from "@/app/_components/visibility-radio";
import { MonoSubmitButton } from "@/app/_components/mono-submit-button";
import { ProfileMarkPicker } from "@/app/_components/site/profile-mark-picker";
import { timeAgo } from "@/lib/time-ago";

export const metadata = {
  title: "Studio · Nearstream",
};

type Props = {
  searchParams: Promise<{
    "essay-error"?: string;
    "letter-error"?: string;
    "source-error"?: string;
    "profile-error"?: string;
  }>;
};

export default async function StudioPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await userStore.getById(session.userId);
  if (!user) redirect("/login");
  if (!user.handle) redirect("/onboarding");

  const {
    "essay-error": essayError,
    "letter-error": letterError,
    "source-error": sourceError,
    "profile-error": profileError,
  } = await searchParams;

  const [letter, essays, inventoryItems, sources, streams] = await Promise.all([
    letterStore.get(user.id),
    essayStore.list(user.id),
    inventoryStore.list(user.id),
    sourceStore.list(user.id),
    streamStore.list(user.id),
  ]);

  const isFirstTime =
    !letter &&
    streams.length === 0 &&
    essays.length === 0 &&
    inventoryItems.length === 0 &&
    sources.length === 0;

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      leftNav={<NearstreamLockup size={24} className="text-foreground" />}
      rightNav={
        <>
          <Link href={tenantBase(user.handle)} className={navLinkClasses}>
            ← Home
          </Link>
          <Link
            href={`${tenantBase(user.handle)}/library`}
            className={navLinkClasses}
          >
            Library
          </Link>
        </>
      }
    >
      <section className="flex flex-1 justify-center px-6">
        <div className="w-full max-w-lg py-12">
          {/* First-time empty state — disappears the moment the user posts
              anything, edits the Letter, or adds a Reader source. */}
          {isFirstTime && (
            <div className="mb-16 border-l-2 border-foreground/40 pl-4">
                <Kicker>Welcome, {user.displayName.split(" ")[0] || user.handle}</Kicker>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  This is your studio &mdash; the room where you write things.
                  Start with a <strong className="text-foreground">Stream entry</strong> below.
                  It&rsquo;s the most casual thing you can post: a short note,
                  no title, no commitment. Your site lives at{" "}
                  <Link
                    href={tenantBase(user.handle)}
                    className="text-foreground underline-offset-4 hover:underline"
                  >
                    {tenantBase(user.handle).replace(/^https?:\/\//, "")}
                  </Link>
                  .
                </p>
              </div>
            )}

          {/* The Letter — top of the home page, top of the studio.
              First thing to update when your head changes. */}
          <div id="letter-form" className="scroll-mt-6">
            <Kicker>Studio</Kicker>
            <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
              Letter
            </h1>
            <p className="mt-2 text-sm text-muted-soft">
              The dated note at the top of your home page. Update it when your head changes.
            </p>

            {letterError && (
              <div
                role="alert"
                className="mt-8 border-l-2 border-foreground/50 pl-4 py-2"
              >
                <Kicker>Could not update</Kicker>
                <p className="mt-1 text-sm text-muted">{letterError}</p>
              </div>
            )}

            <form
              action="/api/letter"
              method="POST"
              className="mt-10 flex flex-col gap-8"
            >
              <label className="flex flex-col gap-2">
                <Kicker>Body</Kicker>
                <Textarea
                  name="body"
                  required
                  rows={5}
                  defaultValue={letter?.body ?? ""}
                  placeholder="Working on Soft Iron and a piece for an upcoming show. Writing about the shape of a quieter web."
                />
              </label>

              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
                The date appears automatically — today&rsquo;s date is set when you update.
              </p>

              <SubmitButton pendingLabel="Updating…" className="self-start">
                Update letter
              </SubmitButton>
            </form>
          </div>

          <hr className="mt-20 border-border" />

          <div id="stream-form" className="scroll-mt-6">
            <h2 className="mt-20 text-2xl font-normal tracking-tight text-foreground">
              New stream entry
            </h2>

            <form action="/api/stream" method="POST" className="mt-10 flex flex-col gap-8">
              <label className="flex flex-col gap-2">
                <Kicker>Entry</Kicker>
                <Textarea
                  name="text"
                  required
                  rows={5}
                  placeholder="What are you doing right now?"
                />
              </label>

              <fieldset className="flex flex-col gap-3">
                <legend>
                  <Kicker>Mode</Kicker>
                </legend>
                <ModeRadioGroup current={DEFAULT_MODE} />
              </fieldset>

              {(essays.length > 0 || inventoryItems.length > 0) && (
                <label className="flex flex-col gap-2">
                  <Kicker>Link to library (optional)</Kicker>
                  <select
                    name="link"
                    defaultValue=""
                    className="border-b border-border bg-transparent px-0 py-2 font-sans text-sm text-foreground outline-none focus:border-foreground"
                  >
                    <option value="">— no link —</option>
                    {essays.length > 0 && (
                      <optgroup label="Essays">
                        {essays.map((e) => (
                          <option key={`essay-${e.id}`} value={`essay::${e.slug}`}>
                            {e.title}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {inventoryItems.length > 0 && (
                      <optgroup label="Inventory">
                        {inventoryItems.map((i) => (
                          <option
                            key={`inventory-${i.id}`}
                            value={`inventory::${i.slug}`}
                          >
                            {i.title}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
                    Announces a library entry with a → arrow.
                  </span>
                </label>
              )}

              <VisibilityRadio />

              <SubmitButton pendingLabel="Posting…" className="self-start">
                Post
              </SubmitButton>
            </form>
          </div>

          <hr className="mt-20 border-border" />

          <div id="essay-form" className="scroll-mt-6">
            <h2 className="mt-20 text-2xl font-normal tracking-tight text-foreground">
              New essay
            </h2>
            <p className="mt-2 text-sm text-muted-soft">
              Markdown. Lands at <code className="font-mono">/library/[slug]</code>.
            </p>

            {essayError && (
              <div
                role="alert"
                className="mt-8 border-l-2 border-foreground/50 pl-4 py-2"
              >
                <Kicker>Could not publish</Kicker>
                <p className="mt-1 text-sm text-muted">{essayError}</p>
              </div>
            )}

            <form action="/api/essays" method="POST" className="mt-10 flex flex-col gap-8">
              <label className="flex flex-col gap-2">
                <Kicker>Title</Kicker>
                <Input
                  name="title"
                  required
                  maxLength={200}
                  placeholder="The shape of a quieter web"
                />
              </label>

              <label className="flex flex-col gap-2">
                <Kicker>Body</Kicker>
                <Textarea
                  name="body"
                  required
                  rows={14}
                  placeholder="## A heading&#10;&#10;Markdown body. Links, *italics*, **bold**, lists, code, blockquotes — all supported."
                />
              </label>

              <VisibilityRadio />

              <SubmitButton pendingLabel="Publishing…" className="self-start">
                Publish
              </SubmitButton>
            </form>
          </div>

          <hr className="mt-20 border-border" />

          <div id="inventory-form" className="scroll-mt-6">
            <h2 className="mt-20 text-2xl font-normal tracking-tight text-foreground">
              New inventory item
            </h2>
            <p className="mt-2 text-sm text-muted-soft">
              An image with optional metadata. Lands at{" "}
              <code className="font-mono">/library/inventory/[slug]</code>.
            </p>

            <InventoryUploadForm />
          </div>

          <hr className="mt-20 border-border" />

          {/* Profile — your display name appears on your tenant pages, in
              your RSS channel title, and at the top of each archive. Handle
              is immutable (it's your URL); display name is editable. */}
          <div id="profile" className="scroll-mt-6">
            <h2 className="mt-20 text-2xl font-normal tracking-tight text-foreground">
              Profile
            </h2>
            <p className="mt-2 text-sm text-muted-soft">
              Your name as it appears on your site and in your RSS feed.
              Handle (<code className="font-mono">/{user.handle}</code>) is
              fixed; display name you can change anytime.
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
          </div>

          <hr className="mt-20 border-border" />

          {/* Reader sources — the friends you follow. "Friend graph is local,
              like a phone book" (NEARSTREAM.md §05). Add by RSS URL. */}
          <div id="sources" className="scroll-mt-6">
            <div className="mt-20 flex items-baseline justify-between gap-4">
              <h2 className="text-2xl font-normal tracking-tight text-foreground">
                Reader sources
              </h2>
              <Link
                href="/reader"
                className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft underline underline-offset-4 decoration-transparent transition-colors hover:text-foreground hover:decoration-muted-soft"
              >
                Open reader →
              </Link>
            </div>
            <p className="mt-2 text-sm text-muted-soft">
              Friends whose feeds appear in your reader. Local to you — no one
              else sees this list.
            </p>

            {sourceError && (
              <div
                role="alert"
                className="mt-8 border-l-2 border-foreground/50 pl-4 py-2"
              >
                <Kicker>Could not add source</Kicker>
                <p className="mt-1 text-sm text-muted">{sourceError}</p>
              </div>
            )}

            <form
              action="/api/sources"
              method="POST"
              className="mt-10 flex flex-col gap-8"
            >
              <label className="flex flex-col gap-2">
                <Kicker>Name</Kicker>
                <Input
                  name="name"
                  required
                  maxLength={80}
                  placeholder="Marco"
                />
              </label>

              <label className="flex flex-col gap-2">
                <Kicker>Feed URL</Kicker>
                <Input
                  name="feedUrl"
                  type="url"
                  required
                  placeholder="https://marco.xyz/rss.xml"
                />
              </label>

              <label className="flex flex-col gap-2">
                <Kicker>Site URL (optional)</Kicker>
                <Input
                  name="siteUrl"
                  type="url"
                  placeholder="https://marco.xyz"
                />
              </label>

              <SubmitButton pendingLabel="Adding…" className="self-start">
                Add source
              </SubmitButton>
            </form>

            {sources.length > 0 && (
              <>
                <div className="mt-12 flex items-center justify-between">
                  <Kicker>Following</Kicker>
                  <form action="/api/sources/refresh" method="POST">
                    <MonoSubmitButton pendingLabel="Refreshing…">
                      Refresh all
                    </MonoSubmitButton>
                  </form>
                </div>

                <ul className="mt-4 flex flex-col gap-4">
                  {sources.map((source) => (
                    <li
                      key={source.id}
                      className="flex items-start justify-between gap-4 border-t border-border pt-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-foreground">{source.name}</div>
                        <div className="mt-1 truncate font-mono text-[11px] text-muted-soft">
                          {source.feedUrl}
                        </div>
                        {source.lastError ? (
                          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/80">
                            Error: {source.lastError}
                          </div>
                        ) : source.lastFetchedAt ? (
                          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
                            Last fetched {timeAgo(source.lastFetchedAt)}
                          </div>
                        ) : (
                          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
                            Not yet fetched
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <form
                          action={`/api/sources/${source.id}/refresh`}
                          method="POST"
                        >
                          <MonoSubmitButton pendingLabel="…">
                            Refresh
                          </MonoSubmitButton>
                        </form>
                        <form
                          action={`/api/sources/${source.id}/delete`}
                          method="POST"
                        >
                          <button
                            type="submit"
                            className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft transition-colors hover:text-foreground"
                          >
                            Remove
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <hr className="mt-20 border-border" />

          {/* Export — "ownership through exit." Manifesto promise made real
              (NEARSTREAM.md §05). JSON download of everything in your tenant
              namespace. */}
          <div className="mt-12">
            <Kicker>Your data</Kicker>
            <a
              href="/api/export"
              className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft transition-colors hover:text-foreground"
            >
              Download all my content →
            </a>
            <p className="mt-2 text-[11px] text-muted-soft">
              A ZIP with your profile, Letter, Stream, Essays, Inventory,
              Reader sources — and every image as actual bytes under{" "}
              <code className="font-mono">media/</code>. Self-contained
              snapshot, yours forever.
            </p>
          </div>

          {isHostEmail(user.email) && (
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
              <p className="mt-2 text-[11px] text-muted-soft">
                One-time copy of the pre-Phase-3 R2 keys into your tenant
                namespace. Idempotent.
              </p>
            </div>
          )}

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
