// POST /api/access-requests/{id}/approve — host-only. Adds the request's
// email to the persisted allowlist + updates the request status + sends
// a welcome magic link so the new friend can sign in immediately.
//
// Approving is idempotent: if the request is already approved, we still
// re-send the welcome link. If it's denied, we refuse (the host can
// unrevoke by finding the record and setting status back to pending in
// R2 — no UI for that, deliberately).

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession, isHostEmail, createMagicLinkToken } from "@/lib/auth";
import { userStore } from "@/lib/user-store";
import { accessRequestStore } from "@/lib/access-request-store";
import { allowlistStore } from "@/lib/allowlist-store";
import { sendWelcomeMagicLink } from "@/lib/email";
import { headers } from "next/headers";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return jsonOrRedirect(request, 401, "unauthorized");
  }
  const user = await userStore.getById(session.userId);
  if (!user || !isHostEmail(user.email)) {
    return jsonOrRedirect(request, 403, "host only");
  }

  const { id } = await params;
  const req = await accessRequestStore.get(id);
  if (!req) return jsonOrRedirect(request, 404, "request not found");
  if (req.status === "denied") {
    return jsonOrRedirect(
      request,
      409,
      "request was denied; edit the record if you meant to approve",
    );
  }

  try {
    await allowlistStore.add({
      email: req.email,
      approvedAt: new Date().toISOString(),
      fromRequestId: req.id,
    });
    await accessRequestStore.setStatus(req.id, "approved", user.id);

    // Send a welcome magic link — same shape as the /login flow (15-min
    // token to /auth/callback) but with copy that reads as "you're in,
    // welcome" rather than a routine sign-in. If it expires the new
    // friend can just head to /login with the same email since they're
    // now on the allowlist.
    const token = await createMagicLinkToken(req.email);
    const hdrs = await headers();
    const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
    const proto = hdrs.get("x-forwarded-proto") ?? "http";
    if (host) {
      const url = `${proto}://${host}/auth/callback?token=${encodeURIComponent(token)}`;
      await sendWelcomeMagicLink(req.email, url);
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[approve access request ${id}]`, err);
    return jsonOrRedirect(request, 502, `Could not approve — ${detail}.`);
  }

  revalidatePath("/settings");
  if (isJsonRequest(request)) {
    return Response.json({ ok: true });
  }
  redirect("/settings#host");
}

function isJsonRequest(request: Request): boolean {
  return (request.headers.get("content-type") ?? "").includes(
    "application/json",
  );
}

function jsonOrRedirect(
  request: Request,
  status: number,
  message: string,
): Response {
  if (isJsonRequest(request)) {
    return Response.json({ error: message }, { status });
  }
  const url = new URL("/settings", request.url);
  url.searchParams.set("host-error", message);
  return Response.redirect(url, 303);
}
