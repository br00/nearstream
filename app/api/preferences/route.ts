// POST /api/preferences — patch the signed-in user's rendering prefs.
//
// Slice 33 (Slice A of "user owns rendering"): only `readerLayout` is
// wired today. Adding more surfaces later is one validator + one field
// here, plus the matching schema enum in schemas/user.ts.
//
// Form-style submissions (the /settings/display picker uses one) get a
// 303 redirect back to /settings on success or with `?prefs-error=` on
// failure. JSON callers (none today, but the door is open for a future
// in-app toggle) get JSON back.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { userStore } from "@/lib/user-store";
import {
  isReaderLayout,
  isGalleryLayout,
  type UserPreferences,
} from "@/schemas/user";

export async function POST(request: Request) {
  const session = await getSession();
  const contentType = request.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!session) {
    return errorResponse(request, isJson, 401, "unauthorized");
  }

  let readerLayoutRaw: unknown;
  let galleryLayoutRaw: unknown;
  if (isJson) {
    const json = await request.json().catch(() => null);
    readerLayoutRaw = json?.readerLayout;
    galleryLayoutRaw = json?.galleryLayout;
  } else {
    const form = await request.formData();
    // Form submissions only include the field that fieldset was submitted
    // for, so missing keys come back as null. We only patch the surfaces
    // the form actually carried.
    readerLayoutRaw = form.has("readerLayout") ? form.get("readerLayout") : undefined;
    galleryLayoutRaw = form.has("galleryLayout") ? form.get("galleryLayout") : undefined;
  }

  const patch: Partial<UserPreferences> = {};
  // An explicit empty string from a form means "reset to default" — we
  // delete the key rather than write an invalid value. Anything else has
  // to validate against the known enum.
  if (readerLayoutRaw === "" || readerLayoutRaw === null) {
    patch.readerLayout = undefined;
  } else if (isReaderLayout(readerLayoutRaw)) {
    patch.readerLayout = readerLayoutRaw;
  } else if (readerLayoutRaw !== undefined) {
    return errorResponse(
      request,
      isJson,
      400,
      `unknown readerLayout: ${String(readerLayoutRaw)}`,
    );
  }

  if (galleryLayoutRaw === "" || galleryLayoutRaw === null) {
    patch.galleryLayout = undefined;
  } else if (isGalleryLayout(galleryLayoutRaw)) {
    patch.galleryLayout = galleryLayoutRaw;
  } else if (galleryLayoutRaw !== undefined) {
    return errorResponse(
      request,
      isJson,
      400,
      `unknown galleryLayout: ${String(galleryLayoutRaw)}`,
    );
  }

  if (Object.keys(patch).length === 0) {
    return errorResponse(request, isJson, 400, "no preference fields provided");
  }

  try {
    const updated = await userStore.setPreferences(session.userId, patch);
    if (!updated) return errorResponse(request, isJson, 404, "user not found");
    revalidatePath("/settings");
    revalidatePath("/reader");
    if (isJson) {
      return Response.json({ ok: true, preferences: updated.preferences });
    }
    redirect("/settings#display");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/preferences] storage failed", err);
    return errorResponse(
      request,
      isJson,
      502,
      `Could not save — ${message}. Try again.`,
    );
  }
}

function errorResponse(
  request: Request,
  isJson: boolean,
  status: number,
  message: string,
): Response {
  if (isJson) {
    return Response.json({ error: message }, { status });
  }
  const url = new URL("/settings", request.url);
  url.searchParams.set("prefs-error", message);
  return Response.redirect(url, 303);
}
