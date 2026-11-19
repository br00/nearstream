// /reader/friends — the friend graph management surface, split out of
// /studio in slice 25. "Friend graph is local, like a phone book"
// (NEARSTREAM.md §05). Add by RSS URL, see who you're reading + when the
// feed last refreshed, remove anyone. Local to you — no one else sees this
// list.

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { sourceStore } from "@/lib/source-store";
import { userStore } from "@/lib/user-store";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamMark } from "@/app/_components/nearstream-mark";
import { AuthedNavBottom } from "@/app/_components/authed-nav";
import { SubmitButton } from "@/app/_components/submit-button";
import { MonoSubmitButton } from "@/app/_components/mono-submit-button";
import { Input } from "@/app/_components/input";
import { Kicker } from "@/app/_components/kicker";
import { timeAgo } from "@/lib/time-ago";
import { shareStore } from "@/lib/share-store";
import { addressOf } from "@/lib/protocol";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Friends · Nearstream",
};

type Props = {
  searchParams: Promise<{
    "friend-error"?: string;
    "share-error"?: string;
    share?: string;
  }>;
};

// One line of confirmation per sharing action (PROTOCOL.md §8).
const SHARE_STATUS: Record<string, string> = {
  sent: "Shared. They’ll see it once they accept.",
  accepted: "Accepted. Their posts are in your reader.",
  ignored: "Ignored.",
  revoked: "Stopped sharing. They no longer see your friends-only posts.",
};

export default async function FriendsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [sources, user, keys, pending] = await Promise.all([
    sourceStore.list(session.userId),
    userStore.getById(session.userId),
    shareStore.liveKeys(session.userId),
    shareStore.listPending(session.userId),
  ]);
  const handle = user?.handle ?? "";
  const myAddress = user?.handle ? addressOf(user) : null;
  const {
    "friend-error": friendError,
    "share-error": shareError,
    share: shareStatus,
  } = await searchParams;

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      leftNav={<NearstreamMark size={24} className="text-foreground" />}
      rightNav={
        <Link href="/reader" className={navLinkClasses}>
          ← Reader
        </Link>
      }
    >
      <section className="flex flex-1 justify-center px-6 pb-24 sm:pb-12">
        <div className="w-full max-w-lg py-12">
          <Kicker>Friends</Kicker>
          <div className="mt-2 flex items-baseline justify-between gap-4">
            <h1 className="text-2xl font-normal tracking-tight text-foreground">
              {sources.length === 0
                ? "Add your first friend"
                : `${sources.length} ${sources.length === 1 ? "person" : "people"}`}
            </h1>
            {sources.length > 0 && (
              <form action="/api/sources/refresh" method="POST">
                <MonoSubmitButton pendingLabel="Refreshing…">
                  Refresh all
                </MonoSubmitButton>
              </form>
            )}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-soft">
            Whose sites you&rsquo;re reading. Local to you — no one else sees
            this list.
          </p>

          {friendError && (
            <div
              role="alert"
              className="mt-8 border-l-2 border-foreground/50 pl-4 py-2"
            >
              <Kicker>Could not add friend</Kicker>
              <p className="mt-1 text-sm text-muted">{friendError}</p>
            </div>
          )}

          {shareError && (
            <div
              role="alert"
              className="mt-8 border-l-2 border-foreground/50 pl-4 py-2"
            >
              <Kicker>Could not share</Kicker>
              <p className="mt-1 text-sm text-muted">{shareError}</p>
            </div>
          )}

          {shareStatus && SHARE_STATUS[shareStatus] && (
            <div role="status" className="mt-8 border-l-2 border-border pl-4 py-2">
              <p className="text-sm text-muted">{SHARE_STATUS[shareStatus]}</p>
            </div>
          )}

          {pending.length > 0 && (
            <ul className="mt-12 flex flex-col gap-4">
              {pending.map((p) => (
                <li key={p.id} className="border border-border p-4">
                  <p className="text-sm text-foreground">
                    {p.fromName} wants to share with you.
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-muted-soft">
                    {p.fromAddress}
                  </p>
                  <div className="mt-4 flex items-center gap-6">
                    <form action={`/api/pending-shares/${p.id}/accept`} method="POST">
                      <MonoSubmitButton pendingLabel="Accepting…">
                        Accept
                      </MonoSubmitButton>
                    </form>
                    <form action={`/api/pending-shares/${p.id}/ignore`} method="POST">
                      <button
                        type="submit"
                        className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft transition-colors hover:text-foreground"
                      >
                        Ignore
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {sources.length > 0 && (
            <ul className="mt-12 flex flex-col">
              {sources.map((source) => (
                <li
                  key={source.id}
                  className="flex items-start justify-between gap-4 border-t border-border py-5 first:border-t-0 first:pt-0"
                >
                  <div className="min-w-0 flex-1">
                    {source.siteUrl ? (
                      <a
                        href={source.siteUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                        className="text-sm text-foreground underline underline-offset-4 decoration-muted-soft transition-colors hover:decoration-foreground"
                      >
                        {source.name}
                      </a>
                    ) : (
                      <div className="text-sm text-foreground">
                        {source.name}
                      </div>
                    )}
                    {/* A key URL is a credential — show the address, never the key. */}
                    <div className="mt-1 truncate font-mono text-[11px] text-muted-soft">
                      {source.address ?? source.feedUrl}
                    </div>
                    {source.lastError ? (
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/80">
                        Error: {source.lastError}
                      </div>
                    ) : source.lastFetchedAt ? (
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
                        Last fetched {timeAgo(source.lastFetchedAt)}
                      </div>
                    ) : (
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
                        Not yet fetched
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <form
                      action={`/api/sources/${source.id}/refresh`}
                      method="POST"
                    >
                      <MonoSubmitButton pendingLabel="…">
                        Refresh
                      </MonoSubmitButton>
                    </form>
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
                  </div>
                </li>
              ))}
            </ul>
          )}

          <hr className="mt-16 border-border" />

          <div className="mt-12">
            <Kicker>Share with someone</Kicker>
            <p className="mt-2 text-sm leading-relaxed text-muted-soft">
              They&rsquo;ll see your friends-only posts once they accept.
              {myAddress && (
                <>
                  {" "}Your address is{" "}
                  <code className="font-mono text-foreground">{myAddress}</code>{" "}
                  — give it to people you want to hear from.
                </>
              )}
            </p>
            <form
              action="/api/shares"
              method="POST"
              className="mt-8 flex flex-col gap-8"
            >
              <label className="flex flex-col gap-2">
                <Kicker>Their address</Kicker>
                <Input
                  name="address"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="nearstream.app/gosia"
                />
              </label>
              <SubmitButton pendingLabel="Sharing…" className="self-start">
                Share
              </SubmitButton>
            </form>

            {keys.length > 0 && (
              <>
                <div className="mt-12">
                  <Kicker>You share with</Kicker>
                </div>
                <ul className="mt-4 flex flex-col">
                  {keys.map((k) => (
                    <li
                      key={k.token}
                      className="flex items-start justify-between gap-4 border-t border-border py-4 first:border-t-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-foreground">{k.friendName}</div>
                        <div className="mt-1 truncate font-mono text-[11px] text-muted-soft">
                          {k.friendAddress}
                        </div>
                      </div>
                      <form action={`/api/shares/${k.token}/revoke`} method="POST">
                        <button
                          type="submit"
                          className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft transition-colors hover:text-foreground"
                        >
                          Stop sharing
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <hr className="mt-16 border-border" />

          <div className="mt-12">
            <Kicker>Add a feed by hand</Kicker>
            <p className="mt-2 text-sm leading-relaxed text-muted-soft">
              You need their RSS feed URL — usually something like{" "}
              <code className="font-mono">site.com/rss.xml</code>. If they
              sent you their site URL (like{" "}
              <code className="font-mono">site.com</code>), append{" "}
              <code className="font-mono">/rss.xml</code> and use that.
            </p>

            <form
              action="/api/sources"
              method="POST"
              className="mt-8 flex flex-col gap-8"
            >
              <label className="flex flex-col gap-2">
                <Kicker>Name</Kicker>
                <Input
                  name="name"
                  required
                  maxLength={80}
                  placeholder="Marco"
                />
              </label>

              <label className="flex flex-col gap-2">
                <Kicker>Feed URL</Kicker>
                <Input
                  name="feedUrl"
                  type="url"
                  required
                  placeholder="https://marco.xyz/rss.xml"
                />
              </label>

              <label className="flex flex-col gap-2">
                <Kicker>Site URL (optional)</Kicker>
                <Input
                  name="siteUrl"
                  type="url"
                  placeholder="https://marco.xyz"
                />
              </label>

              <SubmitButton pendingLabel="Adding…" className="self-start">
                Add friend
              </SubmitButton>
            </form>
          </div>
        </div>
      </section>
      <AuthedNavBottom tenantHandle={handle} />
    </PageShell>
  );
}
