// Presigned R2 PUT for a music upload (slice 40). Handles both blobs a
// track needs — the audio file and the optional cover — via a `kind`
// discriminator, because they accept different content-types and letting
// one endpoint serve both keeps the client flow to a single helper.
//
// The client:
//   1. POSTs `{ kind: "audio" | "cover", contentType }` here
//   2. gets back `{ uploadUrl, key, expiresInSeconds }`
//   3. PUTs the file directly to R2 with the same content-type
//   4. POSTs `/api/music` with the resulting keys + metadata
//
// On the size cap: a presigned PUT can't enforce one without a
// content-length-range policy, which R2's S3 compatibility doesn't give us
// here. So the cap is checked in the browser before the PUT and again
// server-side against the declared `sizeBytes` when the metadata lands. A
// determined caller with a valid session could still push a larger blob;
// that's an authenticated-user-only footgun on a closed instance, not an
// exposure, and it's noted rather than pretended away.

import {
  mediaStore,
  isAllowedMusicAudioType,
  isAllowedContentType,
} from "@/lib/media-store";
import { getSession } from "@/lib/auth";

const COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!mediaStore) {
    return Response.json(
      { error: "music uploads disabled — R2 env vars not configured" },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const kind = body?.kind;
  const contentType = body?.contentType;

  if (kind !== "audio" && kind !== "cover") {
    return Response.json(
      { error: 'kind must be "audio" or "cover"' },
      { status: 400 },
    );
  }

  if (kind === "audio") {
    if (!isAllowedMusicAudioType(contentType)) {
      return Response.json(
        {
          error:
            "unsupported audio type. Allowed: mp3, m4a/aac, wav, flac, ogg, webm",
        },
        { status: 400 },
      );
    }
  } else {
    // Covers are a narrower set than the general image allowlist — no GIF,
    // since an animated cover behind a player is a distraction rather than
    // a feature.
    if (!isAllowedContentType(contentType) || !COVER_TYPES.includes(contentType)) {
      return Response.json(
        { error: "unsupported cover type. Allowed: image/jpeg, image/png, image/webp" },
        { status: 400 },
      );
    }
  }

  const { uploadUrl, key, expiresInSeconds } =
    await mediaStore.getUploadUrl(contentType);

  return Response.json({ uploadUrl, key, expiresInSeconds });
}
