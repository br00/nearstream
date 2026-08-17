"use client";

// Browser-side upload plumbing shared by the inventory and music forms.
// Extracted in slice 40 — both flows presign, PUT with progress, and (for
// images) decode a thumbnail client-side, and none of that is worth having
// twice.
//
// Canvas + XHR, so this is client-only. It stays under `_components`
// rather than `lib/` because `lib/` is imported by server code that has no
// business pulling in a module that touches `document`.

export const THUMB_MAX_DIM = 600;
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
