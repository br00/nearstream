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
// Mirror of the server-side cap in /api/inventory/route.ts. If you bump
// one, bump the other.
const MAX_IMAGES = 12;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024; // 100 MB across the whole series

type FlowState = "idle" | "thumbnailing" | "uploading" | "saving";

// A picked file paired with its decoded thumbnail + the blob URL we render
// in the preview tile. We hold the prepared thumbnail in state so submit
// reuses the same blob — no decode + re-encode round trip.
type Tile = {
  /** Stable across renders. Used as the React key + to identify a tile in
   *  the remove handler. crypto.randomUUID() since multiple "IMG_1234.HEIC"
   *  picks from a phone collide on filename. */
  id: string;
  file: File;
  prepared?: { thumb: Blob; width: number; height: number };
  previewUrl?: string;
  error?: string;
};

export function InventoryUploadForm() {
  const [tiles, setTiles] = useState<Tile[]>([]);
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

  const totalBytes = tiles.reduce((acc, t) => acc + t.file.size, 0);
  const totalMB = totalBytes / (1024 * 1024);

  // Revoke any blob URLs we created when the form unmounts. The per-tile
  // remove handler does the same when a tile is dropped.
  useEffect(() => {
    return () => {
      for (const t of tiles) {
        if (t.previewUrl) URL.revokeObjectURL(t.previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prepare a new tile: decode → thumb → blob URL → patch the tile in
  // state. Done outside the change handler so we can run it on each newly
  // appended file without blocking the picker UI.
  async function prepareTile(id: string, file: File) {
    try {
      const prepared = await generateThumbnail(file);
      const previewUrl = URL.createObjectURL(prepared.thumb);
      setTiles((curr) =>
        curr.map((t) =>
          t.id === id ? { ...t, prepared, previewUrl, error: undefined } : t,
        ),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "could not preview image";
      setTiles((curr) =>
        curr.map((t) => (t.id === id ? { ...t, error: message } : t)),
      );
    }
  }

  function onFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ""; // let the user pick the same file twice if they removed it
    setError(null);
    if (picked.length === 0) return;
    const room = MAX_IMAGES - tiles.length;
    if (room <= 0) {
      setError(`max ${MAX_IMAGES} images per item`);
      return;
    }
    const accepted = picked.slice(0, room);
    if (picked.length > room) {
      setError(
        `only added the first ${room} (max ${MAX_IMAGES} images per item)`,
      );
    }
    const newTiles: Tile[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
    }));
    setTiles((curr) => [...curr, ...newTiles]);
    // Fire off the prepare for each new tile. Doesn't matter if state
    // change above hasn't committed yet — `prepareTile` patches by id.
    for (const t of newTiles) prepareTile(t.id, t.file);
  }

  function removeTile(id: string) {
    setTiles((curr) => {
      const target = curr.find((t) => t.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return curr.filter((t) => t.id !== id);
    });
  }

  // Promote any tile to position 0 (the cover). The cover badge follows
  // because it's rendered against `i === 0`. We splice rather than sort so
  // the relative order of the rest stays as the user picked it.
  function makeCover(id: string) {
    setTiles((curr) => {
      const i = curr.findIndex((t) => t.id === id);
      if (i <= 0) return curr;
      const next = [...curr];
      const [pulled] = next.splice(i, 1);
      next.unshift(pulled);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tiles.length === 0) {
      setError("please pick at least one image");
      return;
    }
    if (tiles.some((t) => t.error)) {
      setError("some images failed to preview — remove them and try again");
      return;
    }
    if (totalBytes > MAX_TOTAL_BYTES) {
      setError(
        `total size ${totalMB.toFixed(1)} MB exceeds ${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)} MB cap`,
      );
      return;
    }
    if (totalMB > 5 && isOnCellular()) {
      const ok = confirm(
        `Total upload is ${totalMB.toFixed(1)} MB and you appear to be on cellular data. Upload anyway?`,
      );
      if (!ok) return;
    }

    setError(null);
    setProgress(0);

    try {
      // Every tile should have its thumbnail prepared by now (the picker
      // kicks off prepareTile per file). For safety, regenerate any that
      // somehow slipped through — rare, but the alternative is a confusing
      // "no thumbnail" failure mid-submit.
      setState("thumbnailing");
      const ready = await Promise.all(
        tiles.map(async (t) =>
          t.prepared
            ? { tile: t, prepared: t.prepared }
            : { tile: t, prepared: await generateThumbnail(t.file) },
        ),
      );

      setState("uploading");
      const urlRes = await fetch("/api/inventory/upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          images: ready.map((r) => ({ contentType: r.tile.file.type })),
        }),
      });
      if (!urlRes.ok) {
        const err = await urlRes
          .json()
          .catch(() => ({ error: "upload-url failed" }));
        throw new Error(err.error ?? "upload-url failed");
      }
      const urls = (await urlRes.json()) as {
        uploads: {
          upload: { uploadUrl: string; key: string };
          thumb: { uploadUrl: string; key: string };
        }[];
      };

      // Aggregate byte counter across all originals + all thumbs.
      const totalUpBytes = ready.reduce(
        (acc, r) => acc + r.tile.file.size + r.prepared.thumb.size,
        0,
      );
      const loadedPer = new Map<string, number>();
      const updateProgress = () => {
        const loaded = Array.from(loadedPer.values()).reduce(
          (a, b) => a + b,
          0,
        );
        setProgress(
          totalUpBytes > 0 ? Math.round((loaded / totalUpBytes) * 100) : 0,
        );
      };

      // Upload every original + every thumb in parallel. The browser will
      // queue beyond its concurrent-connection budget; we don't manually
      // throttle because R2 handles it fine and the alternative would
      // serialize on a slow first file.
      const ops: Promise<void>[] = [];
      ready.forEach((r, i) => {
        const u = urls.uploads[i];
        const origKey = `o:${r.tile.id}`;
        const thumbKey = `t:${r.tile.id}`;
        ops.push(
          putWithProgress(u.upload.uploadUrl, r.tile.file, r.tile.file.type, (n) => {
            loadedPer.set(origKey, n);
            updateProgress();
          }),
          putWithProgress(
            u.thumb.uploadUrl,
            r.prepared.thumb,
            "image/jpeg",
            (n) => {
              loadedPer.set(thumbKey, n);
              updateProgress();
            },
          ),
        );
      });
      await Promise.all(ops);

      setState("saving");

      const metaRes = await fetch("/api/inventory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          images: ready.map((r, i) => ({
            key: urls.uploads[i].upload.key,
            thumbKey: urls.uploads[i].thumb.key,
            contentType: r.tile.file.type,
            sizeBytes: r.tile.file.size,
            width: r.prepared.width,
            height: r.prepared.height,
          })),
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
        const err = await metaRes
          .json()
          .catch(() => ({ error: "save failed" }));
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
      <fieldset className="flex flex-col gap-3">
        <legend>
          <Kicker>
            {tiles.length === 0
              ? "Images"
              : `Images (${tiles.length}${tiles.length === 1 ? "" : ""} · first is the cover)`}
          </Kicker>
        </legend>

        <input
          type="file"
          accept={ACCEPTED_MIME}
          multiple
          onChange={onFilesPicked}
          disabled={disabled || tiles.length >= MAX_IMAGES}
          className="text-sm text-foreground/80 file:mr-4 file:border file:border-border file:bg-transparent file:px-3 file:py-1.5 file:font-mono file:text-[10px] file:uppercase file:tracking-[0.2em] file:text-muted file:transition-colors hover:file:border-foreground hover:file:text-foreground file:cursor-pointer disabled:opacity-50"
        />
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
          {tiles.length === 0
            ? `Pick one or more · max ${MAX_IMAGES} · ${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)} MB total`
            : `${tiles.length} / ${MAX_IMAGES} · ${totalMB.toFixed(1)} MB total`}
        </p>

        {tiles.length > 0 && (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tiles.map((t, i) => (
              <li
                key={t.id}
                className="relative flex flex-col gap-2 border border-border p-2"
              >
                <div className="relative aspect-square overflow-hidden border border-border bg-foreground/5">
                  {t.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.previewUrl}
                      alt={`preview ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="absolute inset-0 shimmer-sweep"
                    />
                  )}
                  {i === 0 ? (
                    <span className="absolute left-1 top-1 border border-foreground bg-foreground px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-background">
                      cover
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => makeCover(t.id)}
                      disabled={disabled}
                      aria-label={`Make image ${i + 1} the cover`}
                      className="absolute left-1 top-1 border border-border bg-background/85 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
                    >
                      make cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeTile(t.id)}
                    disabled={disabled}
                    aria-label={`remove image ${i + 1}`}
                    className="absolute right-1 top-1 border border-border bg-background/85 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
                  >
                    ×
                  </button>
                </div>
                <div className="flex min-w-0 flex-col text-[11px] leading-snug">
                  <span className="truncate text-foreground" title={t.file.name}>
                    {t.file.name}
                  </span>
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-soft">
                    {(t.file.size / 1024 / 1024).toFixed(1)} MB
                    {t.prepared
                      ? ` · ${t.prepared.width}×${t.prepared.height}`
                      : " · preparing…"}
                  </span>
                  {t.error && (
                    <span className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-foreground/80">
                      {t.error}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

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
              className="flex items-baseline gap-3 cursor-pointer border border-border p-3 transition-colors hover:border-foreground/60 has-[:checked]:border-foreground has-[:checked]:bg-foreground/5"
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
        <div role="alert" className="border-l-2 border-foreground/50 pl-4 py-2">
          <Kicker>Could not publish</Kicker>
          <p className="mt-1 text-sm text-muted">{error}</p>
        </div>
      )}

      {state === "thumbnailing" && (
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Preparing thumbnails…
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
        disabled={disabled || tiles.length === 0 || title.trim().length === 0}
        className={`${buttonClasses} self-start disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {state === "idle"
          ? tiles.length > 1
            ? `Publish ${tiles.length} images`
            : "Publish"
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
