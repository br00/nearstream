// Shared plumbing for the signed-in sharing routes under /api/shares and
// /api/pending-shares: session → user, and the form-vs-JSON reply. Forms
// come from /reader/friends and bounce back there; JSON is for the app
// and the protocol lab test.

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { userStore } from "@/lib/user-store";
import type { User } from "@/schemas/user";

export async function currentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await userStore.getById(session.userId);
  return user?.handle ? user : null;
}

export function isJson(request: Request): boolean {
  return (request.headers.get("content-type") ?? "").includes("application/json");
}

/** Reply to a sharing action. Forms redirect to /reader/friends with a
 *  one-word status (`share=sent`) or an error message. */
export function reply(
  request: Request,
  status: number,
  payload: Record<string, unknown> & { error?: string },
  formStatus?: { key: string; value: string },
): Response {
  revalidatePath("/reader");
  revalidatePath("/reader/friends");
  if (isJson(request)) return Response.json(payload, { status });
  const url = new URL("/reader/friends", request.url);
  if (payload.error) url.searchParams.set("share-error", payload.error);
  else if (formStatus) url.searchParams.set(formStatus.key, formStatus.value);
  return Response.redirect(url, 303);
}

export const unauthorized = (request: Request) =>
  isJson(request)
    ? Response.json({ error: "unauthorized" }, { status: 401 })
    : Response.redirect(new URL("/login", request.url), 303);
