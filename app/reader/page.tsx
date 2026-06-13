import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { sourceStore } from "@/lib/source-store";
import { feedEntryStore } from "@/lib/feed-entry-store";
import { userStore } from "@/lib/user-store";
import { tenantBase } from "@/lib/tenant-domains";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { NearstreamMarkAnimated } from "@/app/_components/site/nearstream-mark-animated";
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

  const [sources, entries, user] = await Promise.all([
    sourceStore.list(session.userId),
    feedEntryStore.list(session.userId),
    userStore.getById(session.userId),
  ]);
  // Tenant nav links — defensively fall back to a placeholder if the user
  // record vanished mid-request (shouldn't happen post-onboarding; we still
  // render rather than 500).
  const handle = user?.handle ?? "";

  const sourceById = new Map(sources.map((s) => [s.id, s]));

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      leftNav={<NearstreamLockup size={24} className="text-foreground" />}
      rightNav={
        <>
          {handle && (
            <>
              <Link href={tenantBase(handle)} className={navLinkClasses}>
                Site
              </Link>
              <Link
                href={`${tenantBase(handle)}/library`}
                className={navLinkClasses}
              >
                Library
              </Link>
            </>
          )}
          <Link href="/studio" className={navLinkClasses}>
            Studio
          </Link>
          <Link href="/settings" className={navLinkClasses}>
            Settings
          </Link>
        </>
      }
    >
      <section className="flex flex-1 justify-center px-6">
        <div className="w-full max-w-[32rem] py-12">
          <Kicker>Reader</Kicker>

          {sources.length > 0 && <FriendsPill count={sources.length} />}

          {sources.length === 0 ? (
            <EmptySourcesState />
          ) : entries.length === 0 ? (
            <EmptyFeedState />
          ) : (
            <>
              <div className="mt-8 flex items-center justify-between">
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

// Empty-state mark — the animated `>` (Final from /design/logo-lab), left-
// aligned in the same column as the heading + copy. Disappears the moment
// there's real content.
function EmptyStateMark() {
  return (
    <div className="mt-12">
      <NearstreamMarkAnimated size={120} />
    </div>
  );
}

function EmptySourcesState() {
  return (
    <div>
      <EmptyStateMark />
      <h1 className="mt-8 text-2xl font-normal tracking-tight text-foreground">
        No friends yet
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Nearstream pulls posts from friends&rsquo; sites and lays them out in a
        single chronological feed. Add the first friend by their RSS URL to
        begin.
      </p>
      <Link
        href="/reader/friends"
        className="mt-8 inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-foreground underline underline-offset-4 decoration-muted-soft transition-colors hover:decoration-foreground"
      >
        Add a friend →
      </Link>
    </div>
  );
}

// "Friends · N →" pill below the Reader kicker, linking to /reader/friends.
// Sole entry point to the friend-graph management surface from the feed.
function FriendsPill({ count }: { count: number }) {
  return (
    <Link
      href="/reader/friends"
      className="mt-3 inline-flex items-center gap-2 border border-border px-3 py-1.5 transition-colors hover:border-foreground"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground">
        Friends · {count}
      </span>
      <span className="font-mono text-[10px] text-muted-soft">→</span>
    </Link>
  );
}

function EmptyFeedState() {
  return (
    <div>
      <EmptyStateMark />
      <h1 className="mt-8 text-2xl font-normal tracking-tight text-foreground">
        Quiet so far
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Your sources are set up but no entries have been fetched yet. Try a
        refresh.
      </p>
      <form action="/api/sources/refresh" method="POST" className="mt-8">
        <button
          type="submit"
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground underline underline-offset-4 decoration-muted-soft transition-colors hover:decoration-foreground"
        >
          Refresh all →
        </button>
      </form>
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
