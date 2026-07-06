// POST /api/access-requests/{id}/deny — host-only. Marks the request
// denied. We deliberately don't email the requester — a silent no is
// the kindest thing a small closed-group instance can do. If they
// really need in, they can DM you directly.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession, isHostEmail } from "@/lib/auth";
import { userStore } from "@/lib/user-store";
import { accessRequestStore } from "@/lib/access-request-store";

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

  try {
    await accessRequestStore.setStatus(req.id, "denied", user.id);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[deny access request ${id}]`, err);
    return jsonOrRedirect(request, 502, `Could not deny — ${detail}.`);
  }

  revalidatePath("/settings");
  if ((request.headers.get("content-type") ?? "").includes("application/json")) {
    return Response.json({ ok: true });
  }
  redirect("/settings#host");
}

function jsonOrRedirect(
  request: Request,
  status: number,
  message: string,
): Response {
  if ((request.headers.get("content-type") ?? "").includes("application/json")) {
    return Response.json({ error: message }, { status });
  }
  const url = new URL("/settings", request.url);
  url.searchParams.set("host-error", message);
  return Response.redirect(url, 303);
}
