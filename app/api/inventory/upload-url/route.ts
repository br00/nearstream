import { mediaStore, isAllowedContentType } from "@/lib/media-store";
import { getSession } from "@/lib/auth";

// Returns one pair (original + thumb) per image the client wants to upload.
// Single-image callers (which is what the form was before slice 33) send
// `{ contentType }` and get one pair under `upload` + `thumb`. Multi-image
// callers send `{ images: [{ contentType }, ...] }` and get back
// `{ uploads: [{ upload, thumb }] }`. Both shapes are returned on a
// multi-image request so the call site doesn't need to know which it is.

const MAX_IMAGES = 12;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!mediaStore) {
    return Response.json(
      { error: "media uploads disabled — R2 env vars not configured" },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);

  // Normalize: contentTypes is the source of truth, with single-image legacy
  // input promoted into a 1-element array.
  let contentTypes: unknown[];
  if (Array.isArray(body?.images)) {
    contentTypes = body.images.map((i: unknown) =>
      i && typeof i === "object" && "contentType" in i
        ? (i as { contentType: unknown }).contentType
        : undefined,
    );
  } else if (body?.contentType !== undefined) {
    contentTypes = [body.contentType];
  } else {
    contentTypes = [];
  }

  if (contentTypes.length === 0) {
    return Response.json(
      { error: "at least one image is required" },
      { status: 400 },
    );
  }
  if (contentTypes.length > MAX_IMAGES) {
    return Response.json(
      { error: `too many images (max ${MAX_IMAGES} per item)` },
      { status: 400 },
    );
  }
  for (const ct of contentTypes) {
    if (!isAllowedContentType(ct)) {
      return Response.json(
        {
          error: `unsupported image type. Allowed: image/jpeg, image/png, image/webp, image/gif`,
        },
        { status: 400 },
      );
    }
  }

  // Promise.all-style burst: one presigned URL pair (original + jpeg thumb)
  // per image. Each pair gets its own random key so concurrent PUTs from
  // the browser don't collide.
  const pairs = await Promise.all(
    contentTypes.map(async (ct) => {
      const [original, thumb] = await Promise.all([
        mediaStore!.getUploadUrl(ct as string),
        mediaStore!.getUploadUrl("image/jpeg"),
      ]);
      return {
        upload: { uploadUrl: original.uploadUrl, key: original.key },
        thumb: { uploadUrl: thumb.uploadUrl, key: thumb.key },
      };
    }),
  );

  const expiresInSeconds = 300;

  // Always include the array form. Single-image callers (legacy form
  // shape) still get the singular fields too for backward compatibility
  // during the transition.
  return Response.json({
    uploads: pairs,
    upload: pairs[0].upload,
    thumb: pairs[0].thumb,
    expiresInSeconds,
  });
}
