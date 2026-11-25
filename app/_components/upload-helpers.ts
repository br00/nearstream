"use client";

// Browser-side upload plumbing shared by the inventory, music and essay
// (image button) forms.
// Extracted in slice 40 — both flows presign, PUT with progress, and (for
// images) decode a thumbnail client-side, and none of that is worth having
// twice.
//
// Canvas + XHR, so this is client-only. It stays under `_components`
// rather than `lib/` because `lib/` is imported by server code that has no
// business pulling in a module that touches `document`.

// Re-exported from lib/thumbnails so the client and server agree by
// construction rather than by comment. Imported as well as re-exported,
// because a bare `export … from` doesn't bind the name locally.
import { THUMB_MAX_DIM } from "@/lib/thumbnails";
export { THUMB_MAX_DIM };
const THUMB_QUALITY = 0.85;

/**
 * Decode an image and produce a JPEG thumbnail capped at THUMB_MAX_DIM on
 * its long edge, alongside the original's intrinsic dimensions.
 *
 * `OffscreenCanvas` where available — a phone picking several 12MP photos
 * would otherwise block the main thread on each decode — with a plain
 * canvas fallback for Safari versions that lack it.
 */
export async function generateThumbnail(
  file: File,
): Promise<{ thumb: Blob; width: number; height: number }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (err) {
    throw new Error(
      `could not decode image for thumbnailing (browser may not support this format): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  const fullWidth = bitmap.width;
  const fullHeight = bitmap.height;
  const ratio = Math.min(
    THUMB_MAX_DIM / fullWidth,
    THUMB_MAX_DIM / fullHeight,
    1,
  );
  const w = Math.max(1, Math.round(fullWidth * ratio));
  const h = Math.max(1, Math.round(fullHeight * ratio));

  let blob: Blob;

  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("could not get 2d context for thumbnail");
    ctx.drawImage(bitmap, 0, 0, w, h);
    blob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: THUMB_QUALITY,
    });
  } else {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("could not get 2d context for thumbnail");
    ctx.drawImage(bitmap, 0, 0, w, h);
    blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(new Error("canvas toBlob returned null")),
        "image/jpeg",
        THUMB_QUALITY,
      );
    });
  }

  bitmap.close?.();

  return { thumb: blob, width: fullWidth, height: fullHeight };
}

/** Long edge an essay image is scaled down to: twice the ~34rem column, so
 *  it stays sharp on a retina screen without shipping a 12MP original. */
const ESSAY_IMAGE_MAX_DIM = 2400;
const ESSAY_IMAGE_QUALITY = 0.86;

/**
 * Get a picked file ready to go inside an essay. Photos (JPEG / WebP)
 * larger than ESSAY_IMAGE_MAX_DIM are re-encoded down to it, because a
 * phone original is several MB for a picture read at column width. PNG
 * and GIF go up untouched: PNG is usually a diagram or screenshot, where
 * JPEG would smear the text, and re-encoding a GIF would drop its
 * animation.
 */
export async function prepareEssayImage(
  file: File,
): Promise<{ blob: Blob; contentType: string }> {
  if (file.type !== "image/jpeg" && file.type !== "image/webp") {
    return { blob: file, contentType: file.type };
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Can't decode it here; let it go up as-is rather than refuse it.
    return { blob: file, contentType: file.type };
  }
  const ratio = Math.min(
    ESSAY_IMAGE_MAX_DIM / bitmap.width,
    ESSAY_IMAGE_MAX_DIM / bitmap.height,
  );
  if (ratio >= 1) {
    bitmap.close?.();
    return { blob: file, contentType: file.type };
  }
  const w = Math.round(bitmap.width * ratio);
  const h = Math.round(bitmap.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return { blob: file, contentType: file.type };
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", ESSAY_IMAGE_QUALITY),
  );
  return blob
    ? { blob, contentType: "image/jpeg" }
    : { blob: file, contentType: file.type };
}

/**
 * PUT a blob to a presigned URL, reporting bytes sent. `fetch` has no
 * upload-progress event, which is why this is XHR — a 20MB track upload on
 * a phone needs a progress bar or it reads as a hang.
 */
export function putWithProgress(
  url: string,
  body: Blob,
  contentType: string,
  onProgress: (loaded: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", contentType);
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(e.loaded);
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(body.size);
        resolve();
      } else {
        reject(new Error(`R2 PUT failed: ${xhr.status} ${xhr.statusText}`));
      }
    });
    xhr.addEventListener("error", () =>
      reject(new Error("network error during upload")),
    );
    xhr.addEventListener("abort", () => reject(new Error("upload aborted")));
    xhr.send(body);
  });
}

/**
 * Length of an audio file in ms, read by letting the browser decode just
 * the metadata. Resolves `undefined` rather than rejecting when the format
 * is one the browser can't measure — a track that plays but reports no
 * duration is still a fine upload, and the player falls back to the
 * element's own metadata.
 */
export function readAudioDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (value: number | undefined) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", () => {
      const secs = audio.duration;
      done(Number.isFinite(secs) && secs > 0 ? Math.round(secs * 1000) : undefined);
    });
    audio.addEventListener("error", () => done(undefined));
    audio.src = url;
  });
}
