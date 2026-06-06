import Link from "next/link";
import { store } from "@/lib/store";
import { essayStore } from "@/lib/essay-store";
import { inventoryStore } from "@/lib/inventory-store";
import { letterStore } from "@/lib/letter-store";
import { linkHref, type LibraryLink } from "@/schemas/stream";
import { PageShell } from "@/app/_components/page-shell";
import { HumanCircle } from "@/app/_components/site/human-circle";

export const dynamic = "force-dynamic";

const RECENT_STREAM = 4;
const RECENT_PICTURES = 4;
const RECENT_ESSAYS = 3;

const ELSEWHERE = [
  { label: "moving.points", href: "https://www.instagram.com/moving.points/" },
  { label: "rss", href: "/rss.xml" },
  { label: "say hi", href: "mailto:alessandroxborelli@gmail.com" },
];

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toTimeString().slice(0, 5);
  if (sameDay) return `today · ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "yesterday";
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays >= 2 && diffDays < 8) return `${diffDays} days`;
  const month = d.toLocaleString("en", { month: "short" });
  const day = d.getDate();
  return `${month} ${day}`;
}

function formatShort(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleString("en", { month: "short" });
  return `${month} ${d.getDate()}`;
}

// "June 6" — CSS uppercases it to "JUNE 6". Full month name reads better at
// the masthead size than the abbreviated form used elsewhere on the page.
function formatLetterDate(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleString("en", { month: "long" });
  return `${month} ${d.getDate()}`;
}

export default async function Home() {
  const [letter, entries, essays, inventoryItems] = await Promise.all([
    letterStore.get(),
    store.list(),
    essayStore.list(),
    inventoryStore.list(),
  ]);

  const essayTitles = new Map(essays.map((e) => [e.slug, e.title]));
  const inventoryTitles = new Map(inventoryItems.map((i) => [i.slug, i.title]));
  function lookupLinkTitle(link: LibraryLink): string | null {
    return (link.type === "essay" ? essayTitles : inventoryTitles).get(link.slug) ?? null;
  }

  const recentStream = entries.slice(0, RECENT_STREAM);
  const recentPictures = inventoryItems.slice(0, RECENT_PICTURES);
  const recentEssays = essays.slice(0, RECENT_ESSAYS);

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";
  const sectionLabelClasses =
    "block font-mono text-[10px] uppercase tracking-[0.25em] text-muted-soft transition-colors hover:text-foreground";

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
        <div className="w-full max-w-[30rem] pt-12 pb-32">
          {/* Hero — Human Circle + name */}
          <div className="flex flex-col items-center">
            <HumanCircle size={280} className="block" />
            <h1 className="mt-6 text-[17px] font-normal text-foreground">
              Alessandro Borelli
            </h1>
          </div>

          {/* Letter — dated (auto from updatedAt), signed dispatch */}
          {letter ? (
            <div className="mt-10">
              <div className="mb-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-soft">
                {formatLetterDate(letter.updatedAt)} ─
              </div>
              <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                {letter.body}
              </p>
              <div className="mt-6 text-right font-mono text-[10px] uppercase tracking-[0.3em] text-muted-soft">
                — A.
              </div>
            </div>
          ) : null}

          {/* Stream */}
          <section className="mt-18" style={{ marginTop: "4.5rem" }}>
            <Link href="/stream" className={sectionLabelClasses + " mb-8"}>
              Stream
            </Link>
            {recentStream.length === 0 ? (
              <p className="mt-6 text-sm text-muted">
                No notes yet.
              </p>
            ) : (
              <ul className="mt-8 flex flex-col gap-4">
                {recentStream.map((entry) => (
                  <li
                    key={entry.id}
                    className="grid grid-cols-[7rem_1fr] gap-4 text-sm leading-relaxed text-foreground"
                  >
                    <time
                      dateTime={entry.publishedAt}
                      className="pt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-soft tabular-nums"
                    >
                      {formatRelative(entry.publishedAt)}
                    </time>
                    <div>
                      <span className="whitespace-pre-wrap">{entry.text}</span>
                      {entry.link &&
                        (() => {
                          const title = lookupLinkTitle(entry.link);
                          if (!title) return null;
                          return (
                            <>
                              {" "}
                              <Link
                                href={linkHref(entry.link)}
                                className="text-foreground underline underline-offset-4 decoration-muted-soft hover:decoration-foreground"
                              >
                                {title} →
                              </Link>
                            </>
                          );
                        })()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Pictures */}
          {recentPictures.length > 0 && (
            <section style={{ marginTop: "4.5rem" }}>
              <Link
                href="/library/inventory"
                className={sectionLabelClasses + " mb-8"}
              >
                Pictures
              </Link>
              <ul className="mt-8 flex flex-col gap-5">
                {recentPictures.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/library/inventory/${item.slug}`}
                      className="group flex items-center gap-5 text-foreground transition-colors hover:text-white"
                    >
                      <div className="aspect-[4/3] w-24 flex-shrink-0 overflow-hidden border border-border bg-foreground/5">
                        <img
                          src={`/api/media/${item.image.thumbKey ?? item.image.key}`}
                          alt={item.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex flex-1 items-baseline justify-between gap-4">
                        <span className="text-[15px] leading-snug">
                          {item.title}
                        </span>
                        <time
                          dateTime={item.publishedAt}
                          className="flex-shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft tabular-nums"
                        >
                          {formatShort(item.publishedAt)}
                        </time>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Essays */}
          {recentEssays.length > 0 && (
            <section style={{ marginTop: "4.5rem" }}>
              <Link href="/library" className={sectionLabelClasses + " mb-8"}>
                Essays
              </Link>
              <ul className="mt-8 flex flex-col gap-5">
                {recentEssays.map((essay) => (
                  <li key={essay.id}>
                    <Link
                      href={`/library/${essay.slug}`}
                      className="group flex items-baseline justify-between gap-4 text-foreground transition-colors hover:text-white"
                    >
                      <span className="text-[15px] leading-snug">
                        {essay.title}
                      </span>
                      <time
                        dateTime={essay.publishedAt}
                        className="flex-shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft tabular-nums whitespace-nowrap"
                      >
                        {formatShort(essay.publishedAt)}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Elsewhere */}
          <section style={{ marginTop: "4.5rem" }}>
            <div className={sectionLabelClasses + " mb-8"}>Elsewhere</div>
            <ul className="mt-8 flex flex-col gap-3">
              {ELSEWHERE.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-[14px] text-muted transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </PageShell>
  );
}
