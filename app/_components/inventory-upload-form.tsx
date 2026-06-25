"use client";

import { useEffect, useState } from "react";
import { Input } from "@/app/_components/input";
import { Textarea } from "@/app/_components/textarea";
import { Kicker } from "@/app/_components/kicker";
import { buttonClasses } from "@/app/_components/button";
import { INVENTORY_STATUSES } from "@/schemas/inventory";

const ACCEPTED_MIME = "image/jpeg,image/png,image/webp,image/gif";
const THUMB_MAX_DIM = 600;
const THUMB_QUALITY = 0.85;

type FlowState = "idle" | "thumbnailing" | "uploading" | "saving";

// What `generateThumbnail` produces. We hold this in state so the same blob
// renders as the preview *and* gets uploaded on submit — no regenerating.
type Prepared = {
  thumb: Blob;
  width: number;
  height: number;
};

export function InventoryUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [materials, setMaterials] = useState("");
  const [edition, setEdition] = useState("");
  const [status, setStatus] = useState<string>("");
  const [price, setPrice] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [state, setState] = useState<FlowState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const sizeMB = file ? file.size / (1024 * 1024) : 0;

  // Unmount cleanup so an in-progress preview URL doesn't leak if the user
  // navigates away mid-form. Pick-time cleanup happens inside the handler.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build the thumbnail the moment a file is picked. Two wins: the preview
  // appears without waiting on submit, and we don't have to re-decode +
  // re-encode the image when the form is posted. Lives in the change
  // handler (not a useEffect on `file`) because React's purity rules don't
  // allow setting state from inside an effect — and we have a clean
  // imperative moment to do the work here anyway.
  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null;
    setError(null);
    setFile(next);
    setPrepared(null);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);

    if (!next) return;
    try {
      const result = await generateThumbnail(next);
      setPrepared(result);
      setPreviewUrl(URL.createObjectURL(result.thumb));
    } catch (err) {
      setError(
        err instanceof Error
          ? `could not preview: ${err.message}`
          : "could not preview image",
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("please pick an image");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError("file too large (100 MB max for v1)");
      return;
    }

    if (sizeMB > 5 && isOnCellular()) {
      const ok = confirm(
        `This file is ${sizeMB.toFixed(1)} MB and you appear to be on cellular data. Upload anyway?`,
      );
      if (!ok) return;
    }

    setError(null);
    setProgress(0);

    try {
      // The thumbnail was prepared on file pick so the preview could show
      // immediately. Re-run on the fly only if something went wrong then
      // (rare: format the browser refuses to decode).
      let pre = prepared;
      if (!pre) {
        setState("thumbnailing");
        pre = await generateThumbnail(file);
      }
      const { thumb, width, height } = pre;

      setState("uploading");
      const urlRes = await fetch("/api/inventory/upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentType: file.type, sizeBytes: file.size }),
      });
      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({ error: "upload-url failed" }));
        throw new Error(err.error ?? "upload-url failed");
      }
      const urls = (await urlRes.json()) as {
        upload: { uploadUrl: string; key: string };
        thumb: { uploadUrl: string; key: string };
      };

      const totalBytes = file.size + thumb.size;
      let originalLoaded = 0;
      let thumbLoaded = 0;
      const updateProgress = () => {
        const loaded = originalLoaded + thumbLoaded;
        setProgress(
          totalBytes > 0 ? Math.round((loaded / totalBytes) * 100) : 0,
        );
      };

      await Promise.all([
        putWithProgress(
          urls.upload.uploadUrl,
          file,
          file.type,
          (loaded) => {
            originalLoaded = loaded;
            updateProgress();
          },
        ),
        putWithProgress(
          urls.thumb.uploadUrl,
          thumb,
          "image/jpeg",
          (loaded) => {
            thumbLoaded = loaded;
            updateProgress();
          },
        ),
      ]);

      setState("saving");

      const metaRes = await fetch("/api/inventory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          image: {
            key: urls.upload.key,
            thumbKey: urls.thumb.key,
            contentType: file.type,
            sizeBytes: file.size,
            width,
            height,
          },
          description: description.trim() || undefined,
          dimensions: dimensions.trim() || undefined,
          materials: materials.trim() || undefined,
          edition: edition.trim() || undefined,
          status: status || undefined,
          price: price.trim() || undefined,
          visibility,
        }),
      });
      if (!metaRes.ok) {
        const err = await metaRes.json().catch(() => ({ error: "save failed" }));
        throw new Error(err.error ?? "save failed");
      }
      const { redirectTo } = (await metaRes.json()) as {
        item: { slug: string };
        redirectTo: string;
      };

      window.location.href = redirectTo;
    } catch (err) {
      const message = err instanceof Error ? err.message : "upload failed";
      setError(message);
      setState("idle");
      setProgress(0);
    }
  }

  const disabled = state !== "idle";

  return (
    <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-8">
      <label className="flex flex-col gap-3">
        <Kicker>Image</Kicker>
        <input
          type="file"
          accept={ACCEPTED_MIME}
          onChange={onFileChange}
          disabled={disabled}
          className="text-sm text-foreground/80 file:mr-4 file:border file:border-border file:bg-transparent file:px-3 file:py-1.5 file:font-mono file:text-[10px] file:uppercase file:tracking-[0.2em] file:text-muted file:transition-colors hover:file:border-foreground hover:file:text-foreground file:cursor-pointer disabled:opacity-50"
        />
        {file && (
          // Preview block: thumbnail on the left, filename + size +
          // dimensions on the right. Empty placeholder slot while the
          // browser is still decoding (rare, but iPhone HEIC→JPEG
          // conversion can be slow on first pick).
          <div className="flex items-start gap-4 border border-border p-3">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden border border-border bg-foreground/5">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span aria-hidden className="absolute inset-0 shimmer-sweep" />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-1.5 text-[12px] leading-snug">
              <span className="truncate text-foreground">{file.name}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
                {sizeMB.toFixed(1)} MB
                {prepared
                  ? ` · ${prepared.width}×${prepared.height}`
                  : " · preparing…"}
              </span>
            </div>
          </div>
        )}
      </label>

      <label className="flex flex-col gap-2">
        <Kicker>Title</Kicker>
        <Input
          name="title"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={disabled}
          placeholder="Stoneware vessel, low tide"
        />
      </label>

      <label className="flex flex-col gap-2">
        <Kicker>Description (optional)</Kicker>
        <Textarea
          name="description"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={disabled}
          placeholder="Markdown. A paragraph or two about the piece."
        />
      </label>

      <details className="border-t border-border pt-6">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.2em] text-muted hover:text-foreground">
          Object metadata (optional)
        </summary>
        <div className="mt-6 flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <Kicker>Dimensions</Kicker>
            <Input
              name="dimensions"
              value={dimensions}
              onChange={(e) => setDimensions(e.target.value)}
              disabled={disabled}
              placeholder="30 × 40 × 15 cm"
            />
          </label>
          <label className="flex flex-col gap-2">
            <Kicker>Materials</Kicker>
            <Input
              name="materials"
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
              disabled={disabled}
              placeholder="Stoneware, slip glaze"
            />
          </label>
          <label className="flex flex-col gap-2">
            <Kicker>Edition</Kicker>
            <Input
              name="edition"
              value={edition}
              onChange={(e) => setEdition(e.target.value)}
              disabled={disabled}
              placeholder="Edition of 3, 1/3"
            />
          </label>
          <label className="flex flex-col gap-2">
            <Kicker>Status</Kicker>
            <select
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={disabled}
              className="border-b border-border bg-transparent px-0 py-2 font-sans text-sm text-foreground outline-none focus:border-foreground"
            >
              <option value="">— none —</option>
              {INVENTORY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <Kicker>Price</Kicker>
            <Input
              name="price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={disabled}
              placeholder="€200"
            />
          </label>
        </div>
      </details>

      <fieldset className="flex flex-col gap-3">
        <legend>
          <Kicker>Visibility</Kicker>
        </legend>
        <div className="flex flex-col gap-2">
          {(["public", "private"] as const).map((level) => (
            <label
              key={level}
              className="flex items-baseline gap-3 cursor-pointer"
            >
              <input
                type="radio"
                name="visibility"
                value={level}
                checked={visibility === level}
                onChange={() => setVisibility(level)}
                disabled={disabled}
                className="accent-foreground"
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
                  {level}
                </span>
                <span className="text-[12px] text-muted-soft">
                  {level === "public"
                    ? "Anyone with the URL."
                    : "Only you. Hidden from the public site and your RSS feed."}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <div
          role="alert"
          className="border-l-2 border-foreground/50 pl-4 py-2"
        >
          <Kicker>Could not publish</Kicker>
          <p className="mt-1 text-sm text-muted">{error}</p>
        </div>
      )}

      {state === "thumbnailing" && (
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Generating thumbnail…
        </div>
      )}
      {state === "uploading" && (
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Uploading… {progress}%
        </div>
      )}
      {state === "saving" && (
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Saving…
        </div>
      )}

      <button
        type="submit"
        disabled={disabled || !file || title.trim().length === 0}
        className={`${buttonClasses} self-start disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {state === "idle"
          ? "Publish"
          : state === "thumbnailing"
            ? "Preparing…"
            : state === "uploading"
              ? "Uploading…"
              : "Saving…"}
      </button>
    </form>
  );
}

function isOnCellular(): boolean {
  const conn = (
    navigator as unknown as {
      connection?: { effectiveType?: string; type?: string };
    }
  ).connection;
  if (!conn) return false;
  if (conn.type === "wifi" || conn.type === "ethernet") return false;
  const eff = conn.effectiveType ?? "";
  return eff === "2g" || eff === "3g" || eff === "4g" || eff === "slow-2g";
}

async function generateThumbnail(
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

function putWithProgress(
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
    xhr.addEventListener("abort", () =>
      reject(new Error("upload aborted")),
    );
    xhr.send(body);
  });
}
