import Link from "next/link";
import { redirect } from "next/navigation";
import { DISCIPLINE_TAGS } from "@/schemas/stream";
import { essayStore } from "@/lib/essay-store";
import { inventoryStore } from "@/lib/inventory-store";
import { letterStore } from "@/lib/letter-store";
import { sourceStore } from "@/lib/source-store";
import { getSession } from "@/lib/auth";
import { SubmitButton } from "@/app/_components/submit-button";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { Input } from "@/app/_components/input";
import { Textarea } from "@/app/_components/textarea";
import { Kicker } from "@/app/_components/kicker";
import { TagRadio } from "@/app/_components/tag-chip";
import { InventoryUploadForm } from "@/app/_components/inventory-upload-form";

export const metadata = {
  title: "Studio · Nearstream",
};

type Props = {
  searchParams: Promise<{
    "essay-error"?: string;
    "letter-error"?: string;
    "source-error"?: string;
  }>;
};

export default async function StudioPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const {
    "essay-error": essayError,
    "letter-error": letterError,
    "source-error": sourceError,
  } = await searchParams;

  const [letter, essays, inventoryItems, sources] = await Promise.all([
    letterStore.get(),
    essayStore.list(),
    inventoryStore.list(),
    sourceStore.list(),
  ]);

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      leftNav={<NearstreamLockup size={24} className="text-foreground" />}
      rightNav={
        <>
          <Link href="/" className={navLinkClasses}>
            ← Home
          </Link>
          <Link href="/library" className={navLinkClasses}>
            Library
          </Link>
        </>
      }
    >
      <section className="flex flex-1 justify-center px-6">
        <div className="w-full max-w-lg py-12">
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
                The date appears automatically — today's date is set when you update.
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
                  <Kicker>Discipline</Kicker>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {DISCIPLINE_TAGS.map((tag, i) => (
                    <TagRadio
                      key={tag}
                      name="tag"
                      value={tag}
                      defaultChecked={i === 0}
                      required
                    >
                      {tag}
                    </TagRadio>
                  ))}
                </div>
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

          {/* Reader sources — the friends you follow. "Friend graph is local,
              like a phone book" (NEARSTREAM.md §05). Add by RSS URL. */}
          <div id="sources" className="scroll-mt-6">
            <h2 className="mt-20 text-2xl font-normal tracking-tight text-foreground">
              Reader sources
            </h2>
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
                  placeholder="Costanza"
                />
              </label>

              <label className="flex flex-col gap-2">
                <Kicker>Feed URL</Kicker>
                <Input
                  name="feedUrl"
                  type="url"
                  required
                  placeholder="https://costanza.example/rss.xml"
                />
              </label>

              <label className="flex flex-col gap-2">
                <Kicker>Site URL (optional)</Kicker>
                <Input
                  name="siteUrl"
                  type="url"
                  placeholder="https://costanza.example"
                />
              </label>

              <SubmitButton pendingLabel="Adding…" className="self-start">
                Add source
              </SubmitButton>
            </form>

            {sources.length > 0 && (
              <ul className="mt-12 flex flex-col gap-4">
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
                    </div>
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
                  </li>
                ))}
              </ul>
            )}
          </div>

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
