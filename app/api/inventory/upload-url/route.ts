import { mediaStore, isAllowedContentType } from "@/lib/media-store";
import { getSession } from "@/lib/auth";

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
  const contentType = body?.contentType;

  if (!isAllowedContentType(contentType)) {
    return Response.json(
      {
        error: `unsupported image type. Allowed: image/jpeg, image/png, image/webp, image/gif`,
      },
      { status: 400 },
    );
  }

  const [original, thumb] = await Promise.all([
    mediaStore.getUploadUrl(contentType),
    mediaStore.getUploadUrl("image/jpeg"),
  ]);

  return Response.json({
    upload: { uploadUrl: original.uploadUrl, key: original.key },
    thumb: { uploadUrl: thumb.uploadUrl, key: thumb.key },
    expiresInSeconds: original.expiresInSeconds,
  });
}
