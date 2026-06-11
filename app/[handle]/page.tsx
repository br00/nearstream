import Link from "next/link";
import { notFound } from "next/navigation";
import { store } from "@/lib/store";
import { essayStore } from "@/lib/essay-store";
import { inventoryStore } from "@/lib/inventory-store";
import { letterStore } from "@/lib/letter-store";
import { userStore } from "@/lib/user-store";
import { linkHref, type LibraryLink } from "@/schemas/stream";
import { PageShell } from "@/app/_components/page-shell";
import { HumanCircle } from "@/app/_components/site/human-circle";
import { isHostEmail, getSession } from "@/lib/auth";
import { tenantBase } from "@/lib/tenant-domains";
import { visibilityOf } from "@/schemas/visibility";

export const dynamic = "force-dynamic";

// Soft-privacy default for tenant pages: keep them out of search indexes and
// out of crawlers' link graphs. The URL is still reachable to anyone who has
// it — this just stops "search myself, find my stream" surprises. Real
// per-post privacy (public / friends / private) is a future slice.
export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const user = await userStore.getByHandle(handle);
  return {
    title: user ? `${user.displayName || handle} · Nearstream` : "Nearstream",
    robots: { index: false, follow: false },
  };
}

const RECENT_STREAM = 4;
const RECENT_PICTURES = 4;
const RECENT_ESSAYS = 3;

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

function formatLetterDate(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleString("en", { month: "long" });
  return `${month} ${d.getDate()}`;
}

type Props = {
  params: Promise<{ handle: string }>;
};

export default async function TenantHome({ params }: Props) {
  const { handle } = await params;
  const user = await userStore.getByHandle(handle);
  if (!user) notFound();

  const isHost = isHostEmail(user.email);

  const [letter, allEntries, allEssays, allInventory, session] =
    await Promise.all([
      letterStore.get(user.id),
      store.list(user.id),
      essayStore.list(user.id),
      inventoryStore.list(user.id),
      getSession(),
    ]);

  // Owner sees everything (including their own private entries); anyone else
  // only sees public ones. Letter has no per-entry visibility yet — it's the
  // host's broadcast slot.
  const isOwner = session?.userId === user.id;
  const entries = isOwner
    ? allEntries
    : allEntries.filter((e) => visibilityOf(e) === "public");
  const essays = isOwner
    ? allEssays
    : allEssays.filter((e) => visibilityOf(e) === "public");
  const inventoryItems = isOwner
    ? allInventory
    : allInventory.filter((i) => visibilityOf(i) === "public");

  const essayTitles = new Map(essays.map((e) => [e.slug, e.title]));
  const inventoryTitles = new Map(inventoryItems.map((i) => [i.slug, i.title]));
  function lookupLinkTitle(link: LibraryLink): string | null {
    return (
      (link.type === "essay" ? essayTitles : inventoryTitles).get(link.slug) ??
      null
    );
  }

  const base = tenantBase(handle);

  function tenantPath(link: LibraryLink): string {
    return `${base}${linkHref(link)}`;
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
          <Link href={`${base}/library`} className={navLinkClasses}>
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
          {/* Hero — HumanCircle only for the host (Alessandro's signature).
              Other tenants get a quiet typographic masthead. */}
          <div className="flex flex-col items-center">
            {isHost ? <HumanCircle size={280} className="block" /> : null}
            <h1
              className={`text-[17px] font-normal text-foreground ${isHost ? "mt-6" : "mt-12"}`}
            >
              {user.displayName || handle}
            </h1>
          </div>

          {letter ? (
            <div className="mt-10">
              <div className="mb-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-soft">
                {formatLetterDate(letter.updatedAt)} ─
              </div>
              <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                {letter.body}
              </p>
              <div className="mt-6 text-right font-mono text-[10px] uppercase tracking-[0.3em] text-muted-soft">
                — {(user.displayName || handle).split(" ")[0][0] ?? "A"}.
              </div>
            </div>
          ) : null}

          <section style={{ marginTop: "4.5rem" }}>
            <Link
              href={`${base}/stream`}
              className={sectionLabelClasses + " mb-8"}
            >
              Stream
            </Link>
            {recentStream.length === 0 ? (
              <p className="mt-6 text-sm text-muted">No notes yet.</p>
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
                                href={tenantPath(entry.link)}
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

          {recentPictures.length > 0 && (
            <section style={{ marginTop: "4.5rem" }}>
              <Link
                href={`${base}/library/inventory`}
                className={sectionLabelClasses + " mb-8"}
              >
                Pictures
              </Link>
              <ul className="mt-8 flex flex-col gap-5">
                {recentPictures.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`${base}/library/inventory/${item.slug}`}
                      className="group flex items-center gap-5 text-foreground transition-colors hover:text-white"
                    >
                      <div className="aspect-[4/3] w-24 flex-shrink-0 overflow-hidden border border-border bg-foreground/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
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

          {recentEssays.length > 0 && (
            <section style={{ marginTop: "4.5rem" }}>
              <Link
                href={`${base}/library`}
                className={sectionLabelClasses + " mb-8"}
              >
                Essays
              </Link>
              <ul className="mt-8 flex flex-col gap-5">
                {recentEssays.map((essay) => (
                  <li key={essay.id}>
                    <Link
                      href={`${base}/library/${essay.slug}`}
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

          {/* Elsewhere — host-only for now; tenant elsewhere links are a
              future primitive. */}
          {isHost && (
            <section style={{ marginTop: "4.5rem" }}>
              <div className={sectionLabelClasses + " mb-8"}>Elsewhere</div>
              <ul className="mt-8 flex flex-col gap-3">
                <li>
                  <a
                    href="https://www.instagram.com/moving.points/"
                    className="text-[14px] text-muted transition-colors hover:text-foreground"
                  >
                    moving.points
                  </a>
                </li>
                <li>
                  <a
                    href={`${base}/rss.xml`}
                    className="text-[14px] text-muted transition-colors hover:text-foreground"
                  >
                    rss
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:alessandroxborelli@gmail.com"
                    className="text-[14px] text-muted transition-colors hover:text-foreground"
                  >
                    say hi
                  </a>
                </li>
              </ul>
            </section>
          )}

          {!isHost && (
            <section style={{ marginTop: "4.5rem" }}>
              <div className={sectionLabelClasses + " mb-8"}>Elsewhere</div>
              <ul className="mt-8 flex flex-col gap-3">
                <li>
                  <a
                    href={`${base}/rss.xml`}
                    className="text-[14px] text-muted transition-colors hover:text-foreground"
                  >
                    rss
                  </a>
                </li>
              </ul>
            </section>
          )}
        </div>
      </section>
    </PageShell>
  );
}
