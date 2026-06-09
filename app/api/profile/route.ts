import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { userStore } from "@/lib/user-store";

const DISPLAY_NAME_MAX = 80;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return errorRedirect(request, "unauthorized");
  }

  const form = await request.formData();
  const displayName = form.get("displayName");

  if (typeof displayName !== "string" || displayName.trim().length === 0) {
    return errorRedirect(request, "display name is required");
  }
  if (displayName.length > DISPLAY_NAME_MAX) {
    return errorRedirect(
      request,
      `display name must be ${DISPLAY_NAME_MAX} characters or fewer`,
    );
  }

  try {
    const updated = await userStore.setDisplayName(
      session.userId,
      displayName.trim(),
    );
    if (!updated) return errorRedirect(request, "user not found");

    revalidatePath("/studio");
    if (updated.handle) {
      revalidatePath(`/${updated.handle}`);
      revalidatePath(`/${updated.handle}/stream`);
      revalidatePath(`/${updated.handle}/library`);
      revalidatePath(`/${updated.handle}/library/inventory`);
      revalidatePath(`/${updated.handle}/rss.xml`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/profile] storage failed", err);
    return errorRedirect(request, `Could not save — ${message}. Try again.`);
  }

  redirect("/studio#profile");
}

function errorRedirect(request: Request, message: string): Response {
  const url = new URL("/studio", request.url);
  url.searchParams.set("profile-error", message);
  url.hash = "profile";
  return Response.redirect(url, 303);
}
