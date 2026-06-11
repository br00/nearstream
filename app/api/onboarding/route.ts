import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { userStore } from "@/lib/user-store";
import { isValidHandle } from "@/schemas/user";
import { normalizeProfileMark } from "@/lib/profile-mark-variants";

const DISPLAY_NAME_MAX = 80;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const handleRaw = form.get("handle");
  const displayName = form.get("displayName");
  const profileMarkRaw = form.get("profileMark");
  const profileMark = normalizeProfileMark(
    typeof profileMarkRaw === "string" ? Number(profileMarkRaw) : undefined,
  );

  if (typeof handleRaw !== "string") {
    return errorRedirect(request, "handle is required");
  }
  const handle = handleRaw.trim().toLowerCase();
  if (!isValidHandle(handle)) {
    return errorRedirect(
      request,
      "Handle must be 2–32 chars, lowercase letters / digits / hyphens, and not a reserved word.",
    );
  }
  if (typeof displayName !== "string" || displayName.trim().length === 0) {
    return errorRedirect(request, "display name is required");
  }
  if (displayName.length > DISPLAY_NAME_MAX) {
    return errorRedirect(
      request,
      `display name must be ${DISPLAY_NAME_MAX} characters or fewer`,
    );
  }

  // Reject if the handle is already taken.
  const taken = await userStore.getByHandle(handle);
  if (taken && taken.id !== session.userId) {
    return errorRedirect(request, `the handle "${handle}" is taken`);
  }

  // Idempotent: if the current user already has a handle, refuse to change.
  const current = await userStore.getById(session.userId);
  if (!current) return errorRedirect(request, "user not found");
  if (current.handle) {
    return Response.redirect(new URL("/studio", request.url), 303);
  }

  await userStore.setHandleAndName(
    current.id,
    handle,
    displayName.trim(),
    profileMark,
  );

  return Response.redirect(new URL("/studio", request.url), 303);
}

function errorRedirect(request: Request, message: string): Response {
  const url = new URL("/onboarding", request.url);
  url.searchParams.set("error", message);
  return Response.redirect(url, 303);
}
