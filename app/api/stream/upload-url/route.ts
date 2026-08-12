// Presigned R2 PUT for a Stream voice-note (slice 39). One blob per
// request — voice notes are single-take. Mirrors the pattern in
// app/api/inventory/upload-url/route.ts but simpler (no thumb, no
// multi-image loop).
//
// The client:
//   1. POSTs `{ contentType }` here
//   2. gets back `{ uploadUrl, key, expiresInSeconds }`
//   3. PUTs the recorded blob directly to R2 with the same content-type
//   4. POSTs `/api/stream` with `{ audioKey, audioMime, audioDurationMs }`

import { mediaStore, isAllowedAudioType } from "@/lib/media-store";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!mediaStore) {
    return Response.json(
      { error: "audio uploads disabled — R2 env vars not configured" },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const contentType = body?.contentType;

  if (!isAllowedAudioType(contentType)) {
    return Response.json(
      {
        error:
          "unsupported audio type. Allowed: audio/webm, audio/mp4",
      },
      { status: 400 },
    );
  }

  const { uploadUrl, key, expiresInSeconds } =
    await mediaStore.getUploadUrl(contentType);

  return Response.json({ uploadUrl, key, expiresInSeconds });
}
