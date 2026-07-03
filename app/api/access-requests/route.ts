// POST /api/access-requests — public endpoint. Anyone can submit; we
// don't distinguish allowlisted from non-allowlisted here (that's the
// whole point — telling the requester "you're already invited" would
// leak whose email is on the list).
//
// Rate limiting is intentionally missing for now. A public instance
// gets a burst of curious LinkedIn readers on launch day and that's
// fine — R2 puts are cheap. If someone hostile spams, we add limits.

import { accessRequestStore } from "@/lib/access-request-store";
import { normalizeEmail } from "@/lib/auth";
import { MESSAGE_MAX } from "@/schemas/access-request";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  let email: unknown;
  let message: unknown;
  if (isJson) {
    const json = await request.json().catch(() => null);
    email = json?.email;
    message = json?.message;
  } else {
    const form = await request.formData();
    email = form.get("email");
    message = form.get("message");
  }

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email)) {
    return respond(request, isJson, 400, "That doesn't look like an email.");
  }
  if (typeof message !== "string" || message.trim().length === 0) {
    return respond(
      request,
      isJson,
      400,
      "Tell me a little about yourself — even one sentence.",
    );
  }
  if (message.length > MESSAGE_MAX) {
    return respond(
      request,
      isJson,
      400,
      `Message is too long (${MESSAGE_MAX} chars max).`,
    );
  }

  try {
    // Idempotency by hand: if the same email already has a pending
    // request, don't create a duplicate. The requester gets the same
    // acknowledgement page — they can't tell whether it was new or a
    // repeat, which is fine.
    const existing = await accessRequestStore.findByEmail(email);
    const pending = existing.find((r) => r.status === "pending");
    if (!pending) {
      await accessRequestStore.create({
        email: normalizeEmail(email),
        message: message.trim(),
      });
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/access-requests] store failed", err);
    return respond(
      request,
      isJson,
      502,
      `Couldn't submit the request — ${detail}. Try again later.`,
    );
  }

  if (isJson) return Response.json({ ok: true });
  const url = new URL("/request-access", request.url);
  url.searchParams.set("sent", "1");
  return Response.redirect(url, 303);
}

function respond(
  request: Request,
  isJson: boolean,
  status: number,
  message: string,
): Response {
  if (isJson) return Response.json({ error: message }, { status });
  const url = new URL("/request-access", request.url);
  url.searchParams.set("error", message);
  return Response.redirect(url, 303);
}
