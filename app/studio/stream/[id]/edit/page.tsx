import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { store } from "@/lib/store";
import { essayStore } from "@/lib/essay-store";
import { inventoryStore } from "@/lib/inventory-store";
import { userStore } from "@/lib/user-store";
import { DISCIPLINE_TAGS } from "@/schemas/stream";
import { SubmitButton } from "@/app/_components/submit-button";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { Textarea } from "@/app/_components/textarea";
import { Kicker } from "@/app/_components/kicker";
import { TagRadio } from "@/app/_components/tag-chip";

export const metadata = {
  title: "Edit entry · Studio",
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditStreamEntry({ params, searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const { error } = await searchParams;

  const [entry, essays, inventoryItems, user] = await Promise.all([
    store.getById(session.userId, id),
    essayStore.list(session.userId),
    inventoryStore.list(session.userId),
    userStore.getById(session.userId),
  ]);

  if (!entry) notFound();

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  const linkValue = entry.link ? `${entry.link.type}::${entry.link.slug}` : "";

  return (
    <PageShell
      leftNav={<NearstreamLockup size={24} className="text-foreground" />}
      rightNav={
        <Link href="/studio" className={navLinkClasses}>
          ← Studio
        </Link>
      }
    >
      <section className="flex flex-1 justify-center px-6">
        <div className="w-full max-w-lg py-12">
          <Kicker>Edit</Kicker>
          <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
            Stream entry
          </h1>
          <p className="mt-2 text-sm text-muted-soft">
            Edit the text, discipline tag, and link. Publish date stays the
            same.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-8 border-l-2 border-foreground/50 pl-4 py-2"
            >
              <Kicker>Could not save</Kicker>
              <p className="mt-1 text-sm text-muted">{error}</p>
            </div>
          )}

          <form
            action={`/api/stream/${id}/update`}
            method="POST"
            className="mt-10 flex flex-col gap-8"
          >
            <label className="flex flex-col gap-2">
              <Kicker>Entry</Kicker>
              <Textarea name="text" required rows={5} defaultValue={entry.text} />
            </label>

            <fieldset className="flex flex-col gap-3">
              <legend>
                <Kicker>Discipline</Kicker>
              </legend>
              <div className="flex flex-wrap gap-2">
                {DISCIPLINE_TAGS.map((tag) => (
                  <TagRadio
                    key={tag}
                    name="tag"
                    value={tag}
                    defaultChecked={tag === entry.tag}
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
                  defaultValue={linkValue}
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
              </label>
            )}

            <div className="flex items-center gap-4">
              <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
              <Link
                href={`/${user?.handle ?? ""}/stream#entry-${id}`}
                className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft transition-colors hover:text-foreground"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </section>
    </PageShell>
  );
}
