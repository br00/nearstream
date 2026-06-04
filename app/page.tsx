import Link from "next/link";
import { store } from "@/lib/store";
import { essayStore } from "@/lib/essay-store";
import { inventoryStore } from "@/lib/inventory-store";
import { getSession } from "@/lib/auth";
import { linkHref, type LibraryLink } from "@/schemas/stream";
import { PageShell } from "@/app/_components/page-shell";
import { Kicker } from "@/app/_components/kicker";
import { TagChip } from "@/app/_components/tag-chip";
import { DeleteButton } from "@/app/_components/delete-button";
import { HumanCircle } from "@/app/_components/site/human-circle";

export const dynamic = "force-dynamic";

const RECENT_PHOTOS = 6;
const RECENT_STREAM = 8;

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toTimeString().slice(0, 5);
  if (sameDay) return `today · ${time}`;
  const sameYear = d.getFullYear() === now.getFullYear();
  const month = d.toLocaleString("en", { month: "short" });
  const day = d.getDate();
  const datePart = sameYear ? `${month} ${day}` : `${month} ${day}, ${d.getFullYear()}`;
  return `${datePart} · ${time}`;
}

export default async function Home() {
  const [entries, essays, inventoryItems, session] = await Promise.all([
    store.list(),
    essayStore.list(),
    inventoryStore.list(),
    getSession(),
  ]);
  const isSignedIn = !!session;

  const essayTitles = new Map(essays.map((e) => [e.slug, e.title]));
  const inventoryTitles = new Map(inventoryItems.map((i) => [i.slug, i.title]));

  function lookupLinkTitle(link: LibraryLink): string | null {
    return (link.type === "essay" ? essayTitles : inventoryTitles).get(link.slug) ?? null;
  }

  const recentPhotos = inventoryItems.slice(0, RECENT_PHOTOS);
  const recentEntries = entries.slice(0, RECENT_STREAM);
  const hasOlderEntries = entries.length > RECENT_STREAM;

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";
  const sectionHeader =
    "flex items-baseline justify-between border-t border-border pt-6";

  return (
    <PageShell
      rightNav={
        <>
          <Link href="/library" className={navLinkClasses}>
            Library
          </Link>
          <Link href="/studio" className={navLinkClasses}>
            Studio →
          </Link>
        </>
      }
    >
      <section className="flex flex-1 justify-center px-6">
        <div className="w-full max-w-2xl py-12">
          {/* Hero — Human circle signature + name */}
          <div className="flex flex-col items-center">
            <HumanCircle
              className="block aspect-square w-full max-w-[340px] sm:max-w-[400px]"
            />
            <h1 className="mt-6 text-center text-2xl font-normal tracking-tight text-foreground">
              Alessandro Borelli
            </h1>
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-soft">
              Photography, code, notes
            </p>
          </div>

          {/* Recent photos — when there are inventory items */}
          {recentPhotos.length > 0 && (
            <section className="mt-24">
              <div className={sectionHeader}>
                <Kicker>Recent</Kicker>
                {inventoryItems.length > recentPhotos.length && (
                  <Link href="/library/inventory" className={navLinkClasses}>
                    All photos →
                  </Link>
                )}
              </div>

              <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {recentPhotos.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/library/inventory/${item.slug}`}
                      className="group block"
                    >
                      <div className="aspect-square w-full overflow-hidden border border-border bg-foreground/5">
                        <img
                          src={`/api/media/${item.image.thumbKey ?? item.image.key}`}
                          alt={item.title}
                          className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
                          loading="lazy"
                        />
                      </div>
                      <h3 className="mt-2 truncate font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft transition-colors group-hover:text-foreground">
                        {item.title}
                      </h3>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Essays — when there are any */}
          {essays.length > 0 && (
            <section className="mt-24">
              <div className={sectionHeader}>
                <Kicker>Essays</Kicker>
                <Link href="/library" className={navLinkClasses}>
                  All essays →
                </Link>
              </div>
              <ul className="mt-6 space-y-3">
                {essays.slice(0, 4).map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/library/${e.slug}`}
                      className="group flex items-baseline justify-between gap-4"
                    >
                      <span className="truncate text-[15px] text-foreground/90 transition-colors group-hover:text-foreground">
                        {e.title}
                      </span>
                      <time
                        dateTime={e.publishedAt}
                        className="flex-shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft tabular-nums"
                      >
                        {formatRelative(e.publishedAt).split(" · ")[0]}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Stream — compact list, recent entries */}
          <section className="mt-24">
            <div className={sectionHeader}>
              <Kicker>Stream</Kicker>
              {hasOlderEntries && (
                <span className={navLinkClasses + " cursor-default"}>
                  {entries.length} entries
                </span>
              )}
            </div>

            {entries.length === 0 ? (
              <p className="mt-6 text-sm leading-relaxed text-muted">
                No entries yet. Post one from the{" "}
                <Link
                  href="/studio"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  studio
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-8 space-y-6 border-l border-border pl-6">
                {recentEntries.map((entry) => (
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
                      {isSignedIn && (
                        <DeleteButton
                          action={`/api/stream/${entry.id}/delete`}
                          confirmMessage={`Delete this stream entry?\n\n"${entry.text.slice(0, 60)}${entry.text.length > 60 ? "…" : ""}"`}
                        />
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
                                href={linkHref(entry.link)}
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
          </section>
        </div>
      </section>
    </PageShell>
  );
}
