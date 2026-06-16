// POST /api/friends/follow — one-click "add as friend" from a tenant page.
// Form posts `handle`; we resolve to the tenant's site + feed URL, dedupe,
// and add a Source to the signed-in user's reader.
//
// Why this endpoint and not /api/sources: the tenant page only knows the
// handle. The user hasn't typed an RSS URL — we derive it. This is the
// recovery from the round-1 tester wall where pasting `nearstream.app/{handle}`
// into the reader did nothing because the reader expects `…/rss.xml`.

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { sourceStore } from "@/lib/source-store";
import { userStore } from "@/lib/user-store";
import { tenantAbsoluteBase } from "@/lib/tenant-domains";

function instanceUrl(request: Request): string {
  const envUrl = process.env.NEARSTREAM_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  // Fallback: derive from request. Useful for local dev where
  // NEARSTREAM_SITE_URL isn't set.
  const u = new URL(request.url);
  return `${u.protocol}//${u.host}`;
}

export async function POST(request: Request) {
  const session = await getSession();
  const contentType = request.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!session) {
    return respond(request, isJson, 401, { error: "unauthorized" });
  }

  let handle: unknown;
  if (isJson) {
    const json = await request.json();
    handle = json?.handle;
  } else {
    const form = await request.formData();
    handle = form.get("handle");
  }

  if (typeof handle !== "string" || handle.trim().length === 0) {
    return respond(request, isJson, 400, { error: "handle is required" });
  }

  const target = await userStore.getByHandle(handle.trim());
  if (!target) {
    return respond(request, isJson, 404, { error: "no one at that handle" });
  }

  if (target.id === session.userId) {
    return respond(request, isJson, 400, {
      error: "you can’t add yourself as a friend",
    });
  }

  const siteUrl = tenantAbsoluteBase(target.handle, instanceUrl(request));
  const feedUrl = `${siteUrl}/rss.xml`;
  const name = target.displayName || target.handle;

  try {
    const existing = await sourceStore.list(session.userId);
    const already = existing.find(
      (s) => s.feedUrl === feedUrl || s.siteUrl === siteUrl,
    );
    if (already) {
      // Idempotent: treat "already following" as success rather than 409.
      // The user clicked "add as friend"; they care about the end state,
      // not whether we did the work.
      return success(request, isJson, target.handle, already.id);
    }

    const source = await sourceStore.add(session.userId, {
      name,
      feedUrl,
      siteUrl,
    });
    revalidatePath("/reader");
    revalidatePath("/reader/friends");
    revalidatePath(`/${target.handle}`);
    return success(request, isJson, target.handle, source.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[POST /api/friends/follow] storage failed`, err);
    return respond(request, isJson, 502, {
      error: `Could not add — ${message}. Try again in a moment.`,
    });
  }
}

function success(
  request: Request,
  isJson: boolean,
  handle: string,
  sourceId: string,
): Response {
  if (isJson) {
    return Response.json({ ok: true, sourceId }, { status: 201 });
  }
  // Redirect back to the tenant page with a `?friend=added` flag so the
  // page can render confirmation chrome. Stays in-app — no flash of the
  // friends list, which would feel like a context switch.
  const url = new URL(`/${handle}`, request.url);
  url.searchParams.set("friend", "added");
  return Response.redirect(url, 303);
}

function respond(
  request: Request,
  isJson: boolean,
  status: number,
  payload: { error: string },
): Response {
  if (isJson) return Response.json(payload, { status });
  // For form submits, bounce back to the referer (the tenant page) with
  // the error in the query string.
  const referer = request.headers.get("referer");
  const url = referer ? new URL(referer) : new URL("/", request.url);
  url.searchParams.set("friend-error", payload.error);
  return Response.redirect(url, 303);
}
