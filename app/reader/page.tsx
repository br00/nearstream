import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { sourceStore } from "@/lib/source-store";
import { feedEntryStore } from "@/lib/feed-entry-store";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { Kicker } from "@/app/_components/kicker";
import { MonoSubmitButton } from "@/app/_components/mono-submit-button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reader · Nearstream",
};

// Quiet relative format for the reader stamp. We keep timestamps lowercase
// (mono-uppercased by CSS later) and never show seconds — the reader is for
// keeping up, not for forensics.
function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `today · ${d.toTimeString().slice(0, 5)}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "yesterday";
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays >= 2 && diffDays < 8) return `${diffDays} days`;
  const month = d.toLocaleString("en", { month: "short" });
  return `${month} ${d.getDate()}`;
}

export default async function ReaderPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [sources, entries] = await Promise.all([
    sourceStore.list(session.userId),
    feedEntryStore.list(session.userId),
  ]);

  const sourceById = new Map(sources.map((s) => [s.id, s]));

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      leftNav={<NearstreamLockup size={24} className="text-foreground" />}
      rightNav={
        <Link href="/studio" className={navLinkClasses}>
          Studio →
        </Link>
      }
    >
      <section className="flex flex-1 justify-center px-6">
        <div className="w-full max-w-[32rem] py-12">
          <Kicker>Reader</Kicker>

          {sources.length === 0 ? (
            <EmptySourcesState />
          ) : entries.length === 0 ? (
            <EmptyFeedState />
          ) : (
            <>
              <div className="mt-2 flex items-center justify-between">
                <h1 className="text-2xl font-normal tracking-tight text-foreground">
                  Today
                </h1>
                <form action="/api/sources/refresh" method="POST">
                  <MonoSubmitButton pendingLabel="Refreshing…">
                    Refresh all
                  </MonoSubmitButton>
                </form>
              </div>

              <ul className="mt-12 flex flex-col">
                {entries.map((entry) => {
                  const source = sourceById.get(entry.sourceId);
                  const authorName =
                    entry.authorName ?? source?.name ?? "unknown";
                  const authorHref = source?.siteUrl ?? entry.url;
                  return (
                    <li
                      key={entry.id}
                      className="border-t border-border py-12 first:border-t-0 first:pt-0"
                    >
                      <div className="mb-5 flex items-baseline justify-between gap-4">
                        <a
                          href={authorHref}
                          rel="noopener noreferrer"
                          target="_blank"
                          className="text-[13px] text-foreground transition-colors hover:text-white"
                        >
                          {authorName}
                        </a>
                        <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.22em] tabular-nums text-muted-soft">
                          {formatRelative(entry.publishedAt)}
                          {entry.type !== "unknown" && entry.type !== "note" ? (
                            <>
                              <span className="text-border"> · </span>
                              {entry.type}
                            </>
                          ) : null}
                        </span>
                      </div>

                      {entry.type === "picture" ? (
                        <PictureBody entry={entry} />
                      ) : entry.type === "essay" ? (
                        <EssayBody entry={entry} />
                      ) : (
                        <NoteBody entry={entry} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </section>
    </PageShell>
  );
}

// Empty-state wordmark — quiet platform identity when the reader has nothing
// to show. We only render this when the page would otherwise be just a Kicker
// + a paragraph, so the room never feels anonymous on first load.
function EmptyStateMark() {
  return (
    <div className="mt-16 flex justify-center">
      <NearstreamLockup size={28} className="text-muted" />
    </div>
  );
}

function EmptySourcesState() {
  return (
    <div>
      <EmptyStateMark />
      <div className="mt-12 text-center">
        <h1 className="text-2xl font-normal tracking-tight text-foreground">
          No friends followed yet
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Nearstream pulls posts from friends&rsquo; sites and lays them out in a
          single chronological feed. Add a friend by their RSS URL in the studio
          to begin.
        </p>
        <Link
          href="/studio#sources"
          className="mt-8 inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-foreground underline underline-offset-4 decoration-muted-soft transition-colors hover:decoration-foreground"
        >
          Add a source →
        </Link>
      </div>
    </div>
  );
}

function EmptyFeedState() {
  return (
    <div>
      <EmptyStateMark />
      <div className="mt-12 text-center">
        <h1 className="text-2xl font-normal tracking-tight text-foreground">
          Quiet so far
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Your sources are set up but no entries have been fetched yet. Try a
          refresh.
        </p>
        <form action="/api/sources/refresh" method="POST" className="mt-8 inline-block">
          <button
            type="submit"
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground underline underline-offset-4 decoration-muted-soft transition-colors hover:decoration-foreground"
          >
            Refresh all →
          </button>
        </form>
      </div>
    </div>
  );
}

type EntryPropsBase = {
  entry: {
    url: string;
    title?: string;
    body?: string;
    excerpt?: string;
    image?: { url: string };
  };
};

function NoteBody({ entry }: EntryPropsBase) {
  // For notes we show the excerpt (plain text, length-bounded). HTML in
  // notes is rare and the prototype's note shape is plain text. If a feed's
  // note has a title (some clients emit one), show it inline at the top of
  // the text for context.
  const text = entry.excerpt ?? entry.title ?? "";
  return (
    <a
      href={entry.url}
      rel="noopener noreferrer"
      target="_blank"
      className="block whitespace-pre-wrap text-[15px] leading-relaxed text-foreground transition-colors hover:text-white"
    >
      {text}
    </a>
  );
}

function EssayBody({ entry }: EntryPropsBase) {
  return (
    <div className="border-l border-border pl-5">
      <a
        href={entry.url}
        rel="noopener noreferrer"
        target="_blank"
        className="block text-[22px] leading-snug tracking-tight text-foreground transition-colors hover:text-white"
      >
        {entry.title ?? "Untitled"} →
      </a>
      {entry.excerpt ? (
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
          {entry.excerpt}
        </p>
      ) : null}
    </div>
  );
}

function PictureBody({ entry }: EntryPropsBase) {
  return (
    <a
      href={entry.url}
      rel="noopener noreferrer"
      target="_blank"
      className="group block"
    >
      {entry.image ? (
        <div className="aspect-[4/3] overflow-hidden border border-border bg-foreground/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.image.url}
            alt={entry.title ?? ""}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      {entry.title ? (
        <div className="mt-4 text-[14px] text-foreground transition-colors group-hover:text-white">
          {entry.title}
        </div>
      ) : null}
    </a>
  );
}
