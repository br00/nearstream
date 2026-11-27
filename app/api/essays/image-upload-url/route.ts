// POST /api/essays/image-upload-url — presign one image for an essay.
//
// Same direct-to-R2 flow as Pictures (presign → browser PUT), but a single
// original and no thumbnail: an essay image is read inline at column width,
// never as a card. Returns the token the editor sends back with the form,
// which is what lets the essay own (and later delete) the image —
// see `lib/essay-images.ts`.

import { mediaStore, isAllowedContentType } from "@/lib/media-store";
import { getSession } from "@/lib/auth";
import { essayImageSrc, signEssayImage } from "@/lib/essay-images";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!mediaStore) {
    return Response.json(
      { error: "image uploads disabled — R2 env vars not configured" },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const contentType: unknown = body?.contentType;
  if (
    typeof contentType !== "string" ||
    !IMAGE_TYPES.includes(contentType) ||
    !isAllowedContentType(contentType)
  ) {
    return Response.json(
      { error: `unsupported image type. Allowed: ${IMAGE_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const { uploadUrl, key, expiresInSeconds } =
    await mediaStore.getUploadUrl(contentType);

  return Response.json({
    uploadUrl,
    key,
    src: essayImageSrc(key),
    token: await signEssayImage(session.userId, key),
    expiresInSeconds,
  });
}
