import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { sourceStore } from "@/lib/source-store";
import { feedEntryStore } from "@/lib/feed-entry-store";
import { userStore } from "@/lib/user-store";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamMark } from "@/app/_components/nearstream-mark";
import { NearstreamMarkAnimated } from "@/app/_components/site/nearstream-mark-animated";
import { AuthedNavTop, AuthedNavBottom } from "@/app/_components/authed-nav";
import { Kicker } from "@/app/_components/kicker";
import { ReaderRefresh } from "@/app/_components/reader-refresh";
import { ReaderPicture } from "@/app/_components/reader-picture";
import type { FeedEntry } from "@/schemas/feed-entry";
import type { Source } from "@/schemas/source";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reader · Nearstream",
};

const STALE_MS = 5 * 60 * 1000;

// Pulled out of the page body so React's purity lint stays happy — server
// components only render once per request, but the rule doesn't know that.
function computeNeedsRefresh(
  sources: { lastFetchedAt?: string }[],
): boolean {
  const now = Date.now();
  return sources.some((s) => {
    if (!s.lastFetchedAt) return true;
    const age = now - new Date(s.lastFetchedAt).getTime();
    return Number.isNaN(age) || age > STALE_MS;
  });
}

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

  // Five-minute staleness window. If any source hasn't been fetched in
  // that long (or never has been), the reader auto-refreshes on visit.
  // Picked so an open reader tab doesn't hammer friends' feeds, but a
  // first visit of the morning always lands fresh.
  const needsRefresh = computeNeedsRefresh(sources);

  // Slice 33: the user picks how the room renders. Default is the
  // app-density take (slice 29); "broadsheet" is the quieter, more
  // newspaper-on-a-phone take from the mobile lab. Adding a new mode is one
  // value in schemas/user.ts + a branch here.
  const readerLayout = user?.preferences?.readerLayout ?? "default";

  return (
    <PageShell
      leftNav={<NearstreamMark size={24} className="text-foreground" />}
      rightNav={<AuthedNavTop tenantHandle={handle} />}
    >
      <section className="flex flex-1 justify-center px-6 pb-24 sm:pb-12">
        <div className="w-full max-w-[32rem] py-12">
          <Kicker>Reader</Kicker>

          {sources.length > 0 && <FriendsPill count={sources.length} />}

          {sources.length === 0 ? (
            <EmptySourcesState />
          ) : entries.length === 0 ? (
            <EmptyFeedState />
          ) : readerLayout === "broadsheet" ? (
            <BroadsheetFeed
              entries={entries}
              sourceById={sourceById}
              needsRefresh={needsRefresh}
            />
          ) : (
            <DefaultFeed
              entries={entries}
              sourceById={sourceById}
              needsRefresh={needsRefresh}
            />
          )}
        </div>
      </section>
      <AuthedNavBottom tenantHandle={handle} />
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

type ReaderImage = {
  url: string;
  width?: number;
  height?: number;
  thumbUrl?: string;
  thumbWidth?: number;
  thumbHeight?: number;
};

type EntryPropsBase = {
  entry: {
    url: string;
    title?: string;
    body?: string;
    excerpt?: string;
    image?: ReaderImage;
    images?: ReaderImage[];
  };
};

function readerImages(entry: EntryPropsBase["entry"]): ReaderImage[] {
  if (entry.images && entry.images.length > 0) return entry.images;
  if (entry.image) return [entry.image];
  return [];
}

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
      className="block whitespace-pre-wrap text-[17px] leading-[1.55] text-foreground/95 transition-colors hover:text-white"
    >
      {text}
    </a>
  );
}

function EssayBody({ entry }: EntryPropsBase) {
  return (
    <a
      href={entry.url}
      rel="noopener noreferrer"
      target="_blank"
      className="group block"
    >
      <p className="text-[20px] font-medium leading-snug tracking-tight text-foreground transition-colors group-hover:text-white">
        {entry.title ?? "Untitled"}
      </p>
      {entry.excerpt ? (
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          {entry.excerpt}
        </p>
      ) : null}
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground">
        Read essay →
      </p>
    </a>
  );
}

function PictureBody({ entry }: EntryPropsBase) {
  // Prefer the reader-sized thumbnail (Nearstream feeds emit a 600px-cap
  // JPEG via the `<nearstream:thumbnail>` extension) so we're not pulling
  // a 4032×3024 iPhone photo just to render a 4:3 card. Fall back to the
  // full-res original for arbitrary RSS feeds that don't expose a thumb.
  const images = readerImages(entry);
  if (images.length === 0) {
    return entry.title ? (
      <a
        href={entry.url}
        rel="noopener noreferrer"
        target="_blank"
        className="block text-[15px] text-foreground/95 hover:text-white"
      >
        {entry.title}
      </a>
    ) : null;
  }
  const cover = images[0];
  const coverSrc = cover.thumbUrl ?? cover.url;
  const coverW = cover.thumbWidth ?? cover.width;
  const coverH = cover.thumbHeight ?? cover.height;
  const extras = images.slice(1);
  return (
    <a
      href={entry.url}
      rel="noopener noreferrer"
      target="_blank"
      className="group block"
    >
      <div className="relative">
        <ReaderPicture
          src={coverSrc}
          width={coverW}
          height={coverH}
          alt={entry.title ?? ""}
        />
        {images.length > 1 && (
          // Bottom-right "· N" badge over the cover so you know there's a
          // gallery without us needing extra chrome above. Same vocabulary
          // as the tenant home / library grid badges.
          <span className="absolute right-2 bottom-2 border border-border bg-background/85 px-2 py-1 font-mono text-[10px] tabular-nums text-foreground backdrop-blur">
            · {images.length}
          </span>
        )}
      </div>
      {extras.length > 0 && (
        // Strip of additional thumbs underneath, horizontal scroll past
        // the page gutter (matches the cover's -mx-6 bleed). Mobile gets
        // ~3 visible per swipe, desktop fits the full row.
        <div className="-mx-6 mt-2 flex gap-1 overflow-x-auto px-6">
          {extras.slice(0, 8).map((img, i) => {
            const src = img.thumbUrl ?? img.url;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt=""
                loading="lazy"
                className="h-20 w-20 shrink-0 border border-border bg-foreground/5 object-cover"
              />
            );
          })}
          {extras.length > 8 && (
            <span className="flex h-20 w-20 shrink-0 items-center justify-center border border-border bg-background font-mono text-[11px] tabular-nums text-muted-soft">
              +{extras.length - 8}
            </span>
          )}
        </div>
      )}
      {entry.title ? (
        <div className="mt-4 text-[15px] text-foreground/95 transition-colors group-hover:text-white">
          {entry.title}
        </div>
      ) : null}
    </a>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Mode: default (the slice-29 app-density layout)
   ───────────────────────────────────────────────────────────────────────── */

type FeedProps = {
  entries: FeedEntry[];
  sourceById: Map<string, Source>;
  needsRefresh: boolean;
};

function DefaultFeed({ entries, sourceById, needsRefresh }: FeedProps) {
  return (
    <>
      <div className="mt-8 flex items-center justify-between">
        <h1 className="text-2xl font-normal tracking-tight text-foreground">
          Today
        </h1>
        <ReaderRefresh needsRefresh={needsRefresh} />
      </div>

      <ul className="mt-10 flex flex-col">
        {entries.map((entry) => {
          const source = sourceById.get(entry.sourceId);
          const authorName = entry.authorName ?? source?.name ?? "unknown";
          const authorHref = source?.siteUrl ?? entry.url;
          return (
            <li
              key={entry.id}
              className="border-t border-border py-9 first:border-t-0 first:pt-0"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <a
                  href={authorHref}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="text-[15px] font-medium text-foreground transition-colors hover:text-white"
                >
                  {authorName}
                </a>
                <div className="flex items-center gap-2">
                  {entry.type !== "unknown" && entry.type !== "note" && (
                    <span className="border border-border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.2em] text-muted">
                      {entry.type}
                    </span>
                  )}
                  <span className="whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.18em] tabular-nums text-muted-soft">
                    {formatRelative(entry.publishedAt)}
                  </span>
                </div>
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
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Mode: broadsheet (newspaper-on-a-phone — V3 from mobile-lab)
   - 28–32px header set in the serif body face used by /prose-essay
   - dated kicker "Mon, 16 Jun" instead of "Today"
   - notes set as pulled quotes
   - essay titles set serif large
   - picture entries get more breathing room (mt before bleed)
   ───────────────────────────────────────────────────────────────────────── */
function BroadsheetFeed({ entries, sourceById, needsRefresh }: FeedProps) {
  const today = new Date();
  const dateKicker = today.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return (
    <>
      <div className="mt-8 flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-soft">
            {dateKicker}
          </p>
          <h1 className="mt-3 text-[32px] leading-[1.05] tracking-tight text-foreground">
            Today
          </h1>
        </div>
        <ReaderRefresh needsRefresh={needsRefresh} />
      </div>

      <ul className="mt-10 flex flex-col">
        {entries.map((entry) => {
          const source = sourceById.get(entry.sourceId);
          const authorName = entry.authorName ?? source?.name ?? "unknown";
          const authorHref = source?.siteUrl ?? entry.url;
          return (
            <li
              key={entry.id}
              className="border-t border-border py-10 first:border-t-0 first:pt-0"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-soft">
                <a
                  href={authorHref}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="text-muted-soft transition-colors hover:text-foreground"
                >
                  {authorName}
                </a>
                <span className="text-border"> · </span>
                {formatRelative(entry.publishedAt)}
              </p>

              {entry.type === "picture" ? (
                <BroadsheetPicture entry={entry} />
              ) : entry.type === "essay" ? (
                <BroadsheetEssay entry={entry} />
              ) : (
                <BroadsheetNote entry={entry} />
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function BroadsheetNote({ entry }: EntryPropsBase) {
  const text = entry.excerpt ?? entry.title ?? "";
  return (
    <a
      href={entry.url}
      rel="noopener noreferrer"
      target="_blank"
      className="mt-4 block whitespace-pre-wrap text-[19px] leading-[1.55] text-foreground transition-colors hover:text-white"
    >
      &ldquo;{text}&rdquo;
    </a>
  );
}

function BroadsheetEssay({ entry }: EntryPropsBase) {
  return (
    <a
      href={entry.url}
      rel="noopener noreferrer"
      target="_blank"
      className="group block"
    >
      <h2 className="mt-4 text-[26px] leading-[1.15] tracking-tight text-foreground transition-colors group-hover:text-white">
        {entry.title ?? "Untitled"}
      </h2>
      {entry.excerpt ? (
        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          {entry.excerpt}
        </p>
      ) : null}
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-foreground">
        Read &rarr;
      </p>
    </a>
  );
}

function BroadsheetPicture({ entry }: EntryPropsBase) {
  const images = readerImages(entry);
  if (images.length === 0) return null;
  const cover = images[0];
  const src = cover.thumbUrl ?? cover.url;
  const w = cover.thumbWidth ?? cover.width;
  const h = cover.thumbHeight ?? cover.height;
  const extras = images.slice(1);
  return (
    <a
      href={entry.url}
      rel="noopener noreferrer"
      target="_blank"
      className="mt-5 block group"
    >
      <div className="relative">
        <ReaderPicture src={src} width={w} height={h} alt={entry.title ?? ""} />
        {images.length > 1 && (
          <span className="absolute right-2 bottom-2 border border-border bg-background/85 px-2 py-1 font-mono text-[10px] tabular-nums text-foreground backdrop-blur">
            · {images.length}
          </span>
        )}
      </div>
      {extras.length > 0 && (
        <div className="-mx-6 mt-2 flex gap-1 overflow-x-auto px-6">
          {extras.slice(0, 8).map((img, i) => {
            const tsrc = img.thumbUrl ?? img.url;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={tsrc}
                alt=""
                loading="lazy"
                className="h-20 w-20 shrink-0 border border-border bg-foreground/5 object-cover"
              />
            );
          })}
          {extras.length > 8 && (
            <span className="flex h-20 w-20 shrink-0 items-center justify-center border border-border bg-background font-mono text-[11px] tabular-nums text-muted-soft">
              +{extras.length - 8}
            </span>
          )}
        </div>
      )}
      {entry.title ? (
        <p className="mt-4 text-[17px] italic leading-snug text-foreground transition-colors group-hover:text-white">
          {entry.title}
        </p>
      ) : null}
    </a>
  );
}
