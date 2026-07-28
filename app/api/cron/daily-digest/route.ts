// Daily digest cron. Vercel Cron pings this once a day (schedule in
// vercel.json). We iterate users, build each user's digest from their
// locally-cached FeedEntry rows, and email if there's activity.
//
// Auth: Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. We
// refuse anything else — the endpoint is otherwise public, which is
// fine given the check, but not fine without it.
//
// Idempotency: `user.lastDigestAt` is updated after each successful
// send. If the cron accidentally fires twice within ~20 hours we skip.
// If it doesn't fire for a day we miss a digest — that's fine, we'd
// rather skip than double-send.

import { userStore } from "@/lib/user-store";
import { sourceStore } from "@/lib/source-store";
import { feedEntryStore } from "@/lib/feed-entry-store";
import { sendDigestEmail } from "@/lib/email";
import { buildUserDigest } from "@/lib/digest";

export const dynamic = "force-dynamic";
// Digest can take a bit for a room of 50+ users. Vercel serverless is
// capped at 60s on Hobby; we're well inside that at small scale.
export const maxDuration = 60;

// Skip if we already sent a digest within the last MIN_INTERVAL. Set to
// 20 hours so a "run again same day" cron misfire is a no-op but a
// legitimate next-day run passes.
const MIN_INTERVAL_MS = 20 * 60 * 60 * 1000;
// Fallback window when a user has never received a digest before —
// look 24h back so their first digest is bounded.
const FIRST_WINDOW_MS = 24 * 60 * 60 * 1000;

function nowMs(): number {
  return Date.now();
}

// GET or POST — Vercel Cron sends GET; we accept both so manual tests
// via curl work.
export async function GET(request: Request) {
  return handle(request);
}
export async function POST(request: Request) {
  return handle(request);
}

async function handle(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { error: "CRON_SECRET is not set on this instance" },
      { status: 500 },
    );
  }
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const instanceUrl =
    process.env.NEARSTREAM_SITE_URL ?? "https://www.nearstream.app";
  const readerUrl = `${instanceUrl.replace(/\/$/, "")}/reader`;

  const users = await userStore.list();
  const results: Array<{
    userId: string;
    email: string;
    status: "sent" | "quiet" | "opted-out" | "too-recent" | "error";
    detail?: string;
    items?: number;
  }> = [];

  const now = nowMs();
  const nowIso = new Date(now).toISOString();

  for (const user of users) {
    // Opted out? Skip.
    if (user.preferences?.emailDigest === "off") {
      results.push({
        userId: user.id,
        email: user.email,
        status: "opted-out",
      });
      continue;
    }

    // Dedupe: don't send if we already sent in the last MIN_INTERVAL.
    if (user.lastDigestAt) {
      const last = Date.parse(user.lastDigestAt);
      if (Number.isFinite(last) && now - last < MIN_INTERVAL_MS) {
        results.push({
          userId: user.id,
          email: user.email,
          status: "too-recent",
          detail: user.lastDigestAt,
        });
        continue;
      }
    }

    try {
      const [sources, entries] = await Promise.all([
        sourceStore.list(user.id),
        feedEntryStore.list(user.id),
      ]);

      // No friends yet — no digest to build. Not an error, just skip.
      if (sources.length === 0) {
        results.push({ userId: user.id, email: user.email, status: "quiet" });
        continue;
      }

      const since = user.lastDigestAt
        ? user.lastDigestAt
        : new Date(now - FIRST_WINDOW_MS).toISOString();
      const digest = buildUserDigest(entries, sources, since, nowIso);
      if (!digest) {
        results.push({ userId: user.id, email: user.email, status: "quiet" });
        // Still update lastDigestAt so tomorrow's window is 24h, not
        // 48h. Otherwise we'd send double-content digests on the
        // second consecutive quiet day-then-active day.
        await userStore.setLastDigestAt(user.id, nowIso);
        continue;
      }

      // The digest's reader URL should be the recipient's — same host,
      // but signed in as them. We don't do per-user URLs; anyone on
      // the instance visits the same /reader path.
      await sendDigestEmail(user.email, digest, readerUrl);
      await userStore.setLastDigestAt(user.id, nowIso);
      results.push({
        userId: user.id,
        email: user.email,
        status: "sent",
        items: digest.items.length,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error(`[daily-digest] ${user.id} failed`, err);
      results.push({
        userId: user.id,
        email: user.email,
        status: "error",
        detail,
      });
    }
  }

  return Response.json({
    ok: true,
    ranAt: nowIso,
    total: users.length,
    results,
  });
}

