import Link from "next/link";
import { notFound } from "next/navigation";
import { store } from "@/lib/store";
import { essayStore } from "@/lib/essay-store";
import { inventoryStore } from "@/lib/inventory-store";
import { userStore } from "@/lib/user-store";
import { getSession } from "@/lib/auth";
import { tenantBase } from "@/lib/tenant-domains";
import { linkHref, type LibraryLink } from "@/schemas/stream";
import { PageShell } from "@/app/_components/page-shell";
import { Kicker } from "@/app/_components/kicker";
import { TagChip } from "@/app/_components/tag-chip";
import { DeleteButton } from "@/app/_components/delete-button";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { handle } = await params;
  const user = await userStore.getByHandle(handle);
  return {
    title: user ? `Stream · ${user.displayName || handle}` : "Stream",
    robots: { index: false, follow: false },
  };
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toTimeString().slice(0, 5);
  if (sameDay) return `today · ${time}`;
  const sameYear = d.getFullYear() === now.getFullYear();
  const month = d.toLocaleString("en", { month: "short" });
  const day = d.getDate();
  const datePart = sameYear
    ? `${month} ${day}`
    : `${month} ${day}, ${d.getFullYear()}`;
  return `${datePart} · ${time}`;
}

export default async function StreamArchive({ params }: Props) {
  const { handle } = await params;
  const user = await userStore.getByHandle(handle);
  if (!user) notFound();

  const [entries, essays, inventoryItems, session] = await Promise.all([
    store.list(user.id),
    essayStore.list(user.id),
    inventoryStore.list(user.id),
    getSession(),
  ]);
  const isOwner = session?.userId === user.id;

  const essayTitles = new Map(essays.map((e) => [e.slug, e.title]));
  const inventoryTitles = new Map(inventoryItems.map((i) => [i.slug, i.title]));
  function lookupLinkTitle(link: LibraryLink): string | null {
    return (
      (link.type === "essay" ? essayTitles : inventoryTitles).get(link.slug) ??
      null
    );
  }

  const base = tenantBase(handle);
  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      rightNav={
        <Link href={base} className={navLinkClasses}>
          ← Home
        </Link>
      }
    >
      <section className="flex flex-1 justify-center px-6">
        <div className="w-full max-w-lg py-12">
          <Kicker>Stream</Kicker>
          <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
            {user.displayName || handle}
          </h1>

          {entries.length === 0 ? (
            <p className="mt-12 text-sm leading-relaxed text-muted">
              No entries yet.
              {isOwner && (
                <>
                  {" "}Post one from the{" "}
                  <Link
                    href="/studio"
                    className="text-foreground underline-offset-4 hover:underline"
                  >
                    studio
                  </Link>
                  .
                </>
              )}
            </p>
          ) : (
            <ul className="mt-12 space-y-8 border-l border-border pl-6">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  id={`entry-${entry.id}`}
                  className="relative"
                >
                  <span className="absolute -left-[29px] top-2 inline-block h-1 w-1 rounded-full bg-foreground/70" />
                  <div className="flex flex-wrap items-center gap-3">
                    <time
                      dateTime={entry.publishedAt}
                      className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted tabular-nums"
                    >
                      {formatRelative(entry.publishedAt)}
                    </time>
                    <TagChip>{entry.tag}</TagChip>
                    {isOwner && (
                      <>
                        <Link
                          href={`/studio/stream/${entry.id}/edit`}
                          className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft transition-colors hover:text-foreground"
                        >
                          Edit
                        </Link>
                        <DeleteButton
                          action={`/api/stream/${entry.id}/delete`}
                          confirmMessage={`Delete this stream entry?\n\n"${entry.text.slice(0, 60)}${entry.text.length > 60 ? "…" : ""}"`}
                        />
                      </>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
                    {entry.text}
                    {entry.link &&
                      (() => {
                        const title = lookupLinkTitle(entry.link);
                        if (!title) return null;
                        return (
                          <>
                            {" "}
                            <Link
                              href={`${base}${linkHref(entry.link)}`}
                              className="inline text-foreground underline-offset-4 hover:underline"
                            >
                              {title} →
                            </Link>
                          </>
                        );
                      })()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </PageShell>
  );
}
