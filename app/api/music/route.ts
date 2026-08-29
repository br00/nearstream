import { revalidatePath } from "next/cache";
import { musicStore } from "@/lib/music-store";
import { slugify, MUSIC_MAX_BYTES } from "@/schemas/music";
import type { MusicAudio, MusicCover } from "@/schemas/music";
import { isVisibility, type Visibility } from "@/schemas/visibility";
import { isAllowedMusicAudioType, isAllowedContentType } from "@/lib/media-store";
import { getSession } from "@/lib/auth";
import { userStore } from "@/lib/user-store";
import { tenantBase } from "@/lib/tenant-domains";

const TITLE_MAX = 200;
const ARTIST_MAX = 200;
const DESCRIPTION_MAX = 50_000;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const tracks = await musicStore.list(session.userId);
  return Response.json({ tracks });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const {
    title,
    artist,
    audio,
    cover,
    description,
    visibility: rawVisibility,
  } = body as Record<string, unknown>;

  const visibility: Visibility = isVisibility(rawVisibility)
    ? rawVisibility
    : "public";

  if (typeof title !== "string" || title.trim().length === 0) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }
  if (title.length > TITLE_MAX) {
    return Response.json(
      { error: `title must be ${TITLE_MAX} characters or fewer` },
      { status: 400 },
    );
  }

  const validatedAudio = validateAudio(audio);
  if (typeof validatedAudio === "string") {
    return Response.json({ error: validatedAudio }, { status: 400 });
  }

  const validatedCover = validateCover(cover);
  if (typeof validatedCover === "string") {
    return Response.json({ error: validatedCover }, { status: 400 });
  }

  const trimmedTitle = title.trim();
  const slug = slugify(trimmedTitle);
  if (slug.length === 0) {
    return Response.json(
      { error: "title must contain at least one letter or number" },
      { status: 400 },
    );
  }
  const existing = await musicStore.getBySlug(session.userId, slug);
  if (existing) {
    return Response.json(
      {
        error: `a track with the slug "${slug}" already exists — pick a different title`,
      },
      { status: 409 },
    );
  }

  let validatedArtist: string | undefined;
  if (artist !== undefined && artist !== null && artist !== "") {
    if (typeof artist !== "string") {
      return Response.json({ error: "artist must be a string" }, { status: 400 });
    }
    if (artist.length > ARTIST_MAX) {
      return Response.json(
        { error: `artist must be ${ARTIST_MAX} characters or fewer` },
        { status: 400 },
      );
    }
    validatedArtist = artist.trim() || undefined;
  }

  let validatedDescription: string | undefined;
  if (description !== undefined && description !== null && description !== "") {
    if (typeof description !== "string") {
      return Response.json(
        { error: "description must be a string" },
        { status: 400 },
      );
    }
    if (description.length > DESCRIPTION_MAX) {
      return Response.json(
        { error: `description must be ${DESCRIPTION_MAX} characters or fewer` },
        { status: 400 },
      );
    }
    validatedDescription = description.trim() || undefined;
  }

  const track = await musicStore.add(session.userId, {
    title: trimmedTitle,
    artist: validatedArtist,
    audio: validatedAudio,
    cover: validatedCover,
    description: validatedDescription,
    visibility,
  });

  const user = await userStore.getById(session.userId);
  const handle = user?.handle ?? "";
  revalidatePath(`/${handle}`);
  revalidatePath(`/${handle}/library`);
  revalidatePath(`/${handle}/library/music`);
  revalidatePath(`/${handle}/library/music/${track.slug}`);
  revalidatePath(`/${handle}/rss.xml`);

  const redirectTo = `${tenantBase(handle)}/library/music/${track.slug}`;
  return Response.json({ track, redirectTo }, { status: 201 });
}

function validateAudio(value: unknown): MusicAudio | string {
  if (!value || typeof value !== "object") return "audio is required";
  const { key, mime, sizeBytes, durationMs } = value as Record<string, unknown>;

  if (
    typeof key !== "string" ||
    key.length === 0 ||
    key.includes("/") ||
    key.includes("..")
  ) {
    return "audio.key is invalid";
  }
  if (!isAllowedMusicAudioType(mime)) {
    return "audio.mime is not an allowed audio type";
  }
  if (
    typeof sizeBytes !== "number" ||
    sizeBytes <= 0 ||
    !Number.isFinite(sizeBytes)
  ) {
    return "audio.sizeBytes is invalid";
  }
  // Re-check the cap the browser already enforced. The presigned PUT can't
  // police its own body size, so this is the authoritative check.
  if (sizeBytes > MUSIC_MAX_BYTES) {
    return `audio file is too large (max ${Math.round(MUSIC_MAX_BYTES / 1024 / 1024)}MB)`;
  }

  const out: MusicAudio = { key, mime, sizeBytes };

  if (durationMs !== undefined && durationMs !== null) {
    // A file the browser couldn't fully decode reports Infinity or NaN;
    // treat that as "unknown" rather than rejecting an otherwise fine
    // upload, and let the player read duration from the element instead.
    if (
      typeof durationMs === "number" &&
      Number.isFinite(durationMs) &&
      durationMs > 0
    ) {
      out.durationMs = Math.round(durationMs);
    }
  }

  return out;
}

function validateCover(value: unknown): MusicCover | undefined | string {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object") return "cover is invalid";
  const { key, contentType, sizeBytes, thumbKey, width, height } =
    value as Record<string, unknown>;

  if (
    typeof key !== "string" ||
    key.length === 0 ||
    key.includes("/") ||
    key.includes("..")
  ) {
    return "cover.key is invalid";
  }
  if (!isAllowedContentType(contentType)) {
    return "cover.contentType is not allowed";
  }
  if (
    typeof sizeBytes !== "number" ||
    sizeBytes <= 0 ||
    !Number.isFinite(sizeBytes)
  ) {
    return "cover.sizeBytes is invalid";
  }

  const out: MusicCover = { key, contentType, sizeBytes };

  if (thumbKey !== undefined && thumbKey !== null) {
    if (
      typeof thumbKey !== "string" ||
      thumbKey.length === 0 ||
      thumbKey.includes("/") ||
      thumbKey.includes("..")
    ) {
      return "cover.thumbKey is invalid";
    }
    out.thumbKey = thumbKey;
  }
  if (width !== undefined && width !== null) {
    if (typeof width !== "number" || width <= 0 || !Number.isFinite(width)) {
      return "cover.width is invalid";
    }
    out.width = Math.round(width);
  }
  if (height !== undefined && height !== null) {
    if (typeof height !== "number" || height <= 0 || !Number.isFinite(height)) {
      return "cover.height is invalid";
    }
    out.height = Math.round(height);
  }

  return out;
}
