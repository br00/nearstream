import { revalidatePath } from "next/cache";
import { store } from "@/lib/store";
import {
  isModeTag,
  isLibraryLinkType,
  VOICE_NOTE_MAX_MS,
  type LibraryLink,
  type StreamAudio,
} from "@/schemas/stream";
import { isVisibility, type Visibility } from "@/schemas/visibility";
import { isAllowedAudioType } from "@/lib/media-store";
import { getSession } from "@/lib/auth";
import { userStore } from "@/lib/user-store";
import { tenantBase } from "@/lib/tenant-domains";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const entries = await store.list(session.userId);
  return Response.json({ entries });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  let text: unknown;
  let tag: unknown;
  let rawLink: unknown;
  let rawVisibility: unknown;
  let rawAudioKey: unknown;
  let rawAudioMime: unknown;
  let rawAudioDurationMs: unknown;

  if (contentType.includes("application/json")) {
    const body = await request.json();
    text = body?.text;
    tag = body?.tag;
    rawLink = body?.link;
    rawVisibility = body?.visibility;
    rawAudioKey = body?.audioKey;
    rawAudioMime = body?.audioMime;
    rawAudioDurationMs = body?.audioDurationMs;
  } else {
    const form = await request.formData();
    text = form.get("text");
    tag = form.get("tag");
    rawLink = form.get("link");
    rawVisibility = form.get("visibility");
    rawAudioKey = form.get("audioKey");
    rawAudioMime = form.get("audioMime");
    rawAudioDurationMs = form.get("audioDurationMs");
  }

  const audio = parseAudio(rawAudioKey, rawAudioMime, rawAudioDurationMs);
  if (typeof audio === "string") {
    return Response.json({ error: audio }, { status: 400 });
  }

  // Text is required when there's no audio, and optional (as caption)
  // when there is. A voice note without any words is a valid post.
  const textStr = typeof text === "string" ? text.trim() : "";
  if (!audio && textStr.length === 0) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }
  if (!isModeTag(tag)) {
    return Response.json({ error: "invalid mode" }, { status: 400 });
  }

  const link = parseLink(rawLink);
  if (typeof link === "string") {
    return Response.json({ error: link }, { status: 400 });
  }

  const visibility: Visibility = isVisibility(rawVisibility)
    ? rawVisibility
    : "public";

  const entry = await store.add(session.userId, {
    text: textStr,
    tag,
    link,
    visibility,
    audio,
  });

  const user = await userStore.getById(session.userId);
  const handle = user?.handle ?? "";
  revalidatePath(`/${handle}`);
  revalidatePath(`/${handle}/stream`);
  revalidatePath(`/${handle}/rss.xml`);

  if (contentType.includes("application/json")) {
    return Response.json({ entry }, { status: 201 });
  }

  return Response.redirect(new URL(tenantBase(handle), request.url), 303);
}

// Voice-note attachment parse (slice 39). All three fields must appear
// together or the audio is treated as absent. Returns:
//  - undefined  → no audio submitted
//  - StreamAudio → validated audio payload
//  - string     → validation error message
function parseAudio(
  key: unknown,
  mime: unknown,
  durationRaw: unknown,
): StreamAudio | undefined | string {
  // "All absent" is a valid non-audio submission.
  if (
    (key === undefined || key === null || key === "") &&
    (mime === undefined || mime === null || mime === "") &&
    (durationRaw === undefined || durationRaw === null || durationRaw === "")
  ) {
    return undefined;
  }
  if (typeof key !== "string" || key.length === 0) {
    return "audio key is required when submitting audio";
  }
  if (!isAllowedAudioType(mime)) {
    return "audio mime must be audio/webm or audio/mp4";
  }
  // Form fields arrive as strings; JSON arrives as numbers.
  const duration =
    typeof durationRaw === "number"
      ? durationRaw
      : typeof durationRaw === "string"
        ? Number(durationRaw)
        : NaN;
  if (!Number.isFinite(duration) || duration <= 0) {
    return "audio duration is required (ms)";
  }
  if (duration > VOICE_NOTE_MAX_MS) {
    return `voice note too long (${Math.round(duration / 1000)}s > ${VOICE_NOTE_MAX_MS / 1000}s cap)`;
  }
  return { key, mime, durationMs: Math.round(duration) };
}

// Accepts either a structured object (JSON) or a "type::slug" string (form).
// Returns the parsed LibraryLink, undefined for no link, or an error message string.
function parseLink(value: unknown): LibraryLink | undefined | string {
  if (value === undefined || value === null || value === "") return undefined;

  if (typeof value === "string") {
    const parts = value.split("::");
    if (parts.length !== 2) return "invalid link format";
    const [type, slug] = parts;
    if (!isLibraryLinkType(type)) return "invalid link type";
    if (slug.length === 0) return "invalid link slug";
    return { type, slug };
  }

  if (typeof value === "object") {
    const { type, slug } = value as Record<string, unknown>;
    if (!isLibraryLinkType(type)) return "invalid link type";
    if (typeof slug !== "string" || slug.length === 0) {
      return "invalid link slug";
    }
    return { type, slug };
  }

  return "invalid link";
}
