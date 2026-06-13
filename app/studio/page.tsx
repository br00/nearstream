import Link from "next/link";
import { redirect } from "next/navigation";
import { DEFAULT_MODE } from "@/schemas/stream";
import { essayStore } from "@/lib/essay-store";
import { inventoryStore } from "@/lib/inventory-store";
import { letterStore } from "@/lib/letter-store";
import { store as streamStore } from "@/lib/store";
import { userStore } from "@/lib/user-store";
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

// Studio is the *posting* surface only. Slice 25 split everything else out:
// reader sources live at /reader/friends; profile + export + sign-out + host
// tools live at /settings. Federico got lost in the previous monolith — this
// is the recovery.

export const metadata = {
  title: "Studio · Nearstream",
};

type Props = {
  searchParams: Promise<{
    "essay-error"?: string;
    "letter-error"?: string;
  }>;
};

export default async function StudioPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await userStore.getById(session.userId);
  if (!user) redirect("/login");
  if (!user.handle) redirect("/onboarding");

  const { "essay-error": essayError, "letter-error": letterError } =
    await searchParams;

  const [letter, essays, inventoryItems, streams] = await Promise.all([
    letterStore.get(user.id),
    essayStore.list(user.id),
    inventoryStore.list(user.id),
    streamStore.list(user.id),
  ]);

  // First-time empty state is gauged on *posting* signals only — sources
  // moved to /reader/friends and are out of scope for "did you start yet?"
  const isFirstTime =
    !letter &&
    streams.length === 0 &&
    essays.length === 0 &&
    inventoryItems.length === 0;

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      leftNav={<NearstreamLockup size={24} className="text-foreground" />}
      rightNav={
        <>
          <Link href="/reader" className={navLinkClasses}>
            Reader
          </Link>
          <Link href="/settings" className={navLinkClasses}>
            Settings
          </Link>
        </>
      }
    >
      <section className="flex flex-1 justify-center px-6">
        <div className="w-full max-w-lg py-12">
          {/* First-time empty state — disappears the moment the user posts
              anything or edits the Letter. */}
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

              <VisibilityRadio defaultValue="public" />

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

              <VisibilityRadio defaultValue="public" />

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
        </div>
      </section>
    </PageShell>
  );
}
