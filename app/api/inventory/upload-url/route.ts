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

  const { uploadUrl, key, expiresInSeconds } = await mediaStore.getUploadUrl(
    contentType,
  );

  return Response.json({ uploadUrl, key, expiresInSeconds });
}
