"use client";

// Music upload (slice 40). Two blobs, one form: the audio file is required
// and the cover is optional.
//
// Flow per blob: presign → PUT direct to R2 → POST the metadata. The audio
// never touches our server, which is the point — a 20MB track through a
// serverless function would be both slow and expensive, and R2 egress is
// free where function time isn't.
//
// No transcode anywhere. Whatever the user picks is what gets stored and
// what the browser plays; if their browser can play the file well enough
// to read its duration in the picker, it can play it on the detail page.

import { useEffect, useRef, useState } from "react";
import { Input } from "@/app/_components/input";
import { Textarea } from "@/app/_components/textarea";
import { Kicker } from "@/app/_components/kicker";
import { buttonClasses } from "@/app/_components/button";
import {
  generateThumbnail,
  putWithProgress,
  readAudioDuration,
} from "@/app/_components/upload-helpers";
import { MUSIC_MAX_BYTES, formatTrackDuration } from "@/schemas/music";

const AUDIO_ACCEPT =
  "audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/x-wav,audio/wave,audio/flac,audio/x-flac,audio/ogg,audio/webm,.mp3,.m4a,.wav,.flac,.ogg";
const COVER_ACCEPT = "image/jpeg,image/png,image/webp";

const MAX_MB = Math.round(MUSIC_MAX_BYTES / 1024 / 1024);

type FlowState = "idle" | "reading" | "uploading" | "saving";

type PickedAudio = {
  file: File;
  durationMs?: number;
};

type PickedCover = {
  file: File;
  prepared?: { thumb: Blob; width: number; height: number };
  previewUrl?: string;
};

export function MusicUploadForm() {
  const [audio, setAudio] = useState<PickedAudio | null>(null);
  const [cover, setCover] = useState<PickedCover | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [state, setState] = useState<FlowState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Revoke the cover preview blob URL on unmount; the replace and remove
  // paths revoke the previous one as they go. The ref mirrors the current
  // URL so the unmount cleanup sees the latest value without re-running
  // (and re-revoking) every time the cover changes.
  const previewRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    previewRef.current = cover?.previewUrl;
  }, [cover?.previewUrl]);
  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  async function pickAudio(file: File) {
    setError(null);
    if (file.size > MUSIC_MAX_BYTES) {
      setError(
        `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is ${MAX_MB}MB.`,
      );
      return;
    }
    setState("reading");
    const durationMs = await readAudioDuration(file);
    setAudio({ file, durationMs });
    // Seed the title from the filename so the common case is one less
    // thing to type. Stripped of extension; the user can overwrite it.
    setTitle((curr) => curr || file.name.replace(/\.[^.]+$/, ""));
    setState("idle");
  }

  async function pickCover(file: File) {
    setError(null);
    if (cover?.previewUrl) URL.revokeObjectURL(cover.previewUrl);
    setCover({ file });
    try {
      const prepared = await generateThumbnail(file);
      const previewUrl = URL.createObjectURL(prepared.thumb);
      setCover({ file, prepared, previewUrl });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "could not read that cover image",
      );
      setCover(null);
    }
  }

  async function presign(kind: "audio" | "cover", contentType: string) {
    const res = await fetch("/api/music/upload-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, contentType }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.error ?? `could not get an upload URL (${res.status})`);
    }
    return (await res.json()) as { uploadUrl: string; key: string };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!audio || state !== "idle") return;
    if (!title.trim()) {
      setError("give the track a title");
      return;
    }
    setError(null);
    setProgress(0);

    try {
      setState("uploading");

      // Total is audio + cover + thumb so the bar reflects real work.
      const coverBytes = cover
        ? cover.file.size + (cover.prepared?.thumb.size ?? 0)
        : 0;
      const totalBytes = audio.file.size + coverBytes;
      const sent = { audio: 0, cover: 0, thumb: 0 };
      const report = () => {
        const done = sent.audio + sent.cover + sent.thumb;
        setProgress(Math.min(1, done / totalBytes));
      };

      const audioSlot = await presign("audio", audio.file.type);
      await putWithProgress(
        audioSlot.uploadUrl,
        audio.file,
        audio.file.type,
        (n) => {
          sent.audio = n;
          report();
        },
      );

      let coverPayload:
        | {
            key: string;
            contentType: string;
            sizeBytes: number;
            thumbKey?: string;
            width?: number;
            height?: number;
          }
        | undefined;

      if (cover && cover.prepared) {
        const coverSlot = await presign("cover", cover.file.type);
        await putWithProgress(
          coverSlot.uploadUrl,
          cover.file,
          cover.file.type,
          (n) => {
            sent.cover = n;
            report();
          },
        );
        const thumbSlot = await presign("cover", "image/jpeg");
        await putWithProgress(
          thumbSlot.uploadUrl,
          cover.prepared.thumb,
          "image/jpeg",
          (n) => {
            sent.thumb = n;
            report();
          },
        );
        coverPayload = {
          key: coverSlot.key,
          contentType: cover.file.type,
          sizeBytes: cover.file.size,
          thumbKey: thumbSlot.key,
          width: cover.prepared.width,
          height: cover.prepared.height,
        };
      }

      setState("saving");
      const res = await fetch("/api/music", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          artist: artist.trim() || undefined,
          description: description.trim() || undefined,
          visibility,
          audio: {
            key: audioSlot.key,
            mime: audio.file.type,
            sizeBytes: audio.file.size,
            durationMs: audio.durationMs,
          },
          cover: coverPayload,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `could not save the track (${res.status})`);
      }
      const { redirectTo } = (await res.json()) as { redirectTo: string };
      window.location.href = redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : "upload failed");
      setState("idle");
      setProgress(0);
    }
  }

  const busy = state !== "idle";
  const sizeLabel = audio
    ? `${(audio.file.size / 1024 / 1024).toFixed(1)}MB`
    : "";
  const durationLabel = audio ? formatTrackDuration(audio.durationMs) : "";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* ── Audio ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <Kicker>Track</Kicker>
        <input
          ref={audioInputRef}
          type="file"
          accept={AUDIO_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickAudio(f);
            e.target.value = "";
          }}
        />
        {audio ? (
          <div className="flex flex-wrap items-center gap-3 border border-border p-4">
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
              {audio.file.name}
            </span>
            <span className="font-mono text-[11px] tabular-nums text-muted">
              {[durationLabel, sizeLabel].filter(Boolean).join(" · ")}
            </span>
            <button
              type="button"
              onClick={() => setAudio(null)}
              disabled={busy}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground disabled:opacity-40"
            >
              Replace
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            disabled={busy}
            className="border border-border p-6 text-left transition-colors hover:border-foreground/60 disabled:opacity-40"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground">
              {state === "reading" ? "Reading…" : "Choose an audio file"}
            </span>
            <span className="mt-2 block text-[13px] text-muted-soft">
              mp3, m4a, wav, flac, ogg — up to {MAX_MB}MB. Stored as-is, no
              re-encoding.
            </span>
          </button>
        )}
      </div>

      {/* ── Cover ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <Kicker>Cover (optional)</Kicker>
        <input
          ref={coverInputRef}
          type="file"
          accept={COVER_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickCover(f);
            e.target.value = "";
          }}
        />
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            disabled={busy}
            className="h-24 w-24 flex-shrink-0 overflow-hidden border border-border bg-foreground/5 transition-colors hover:border-foreground/60 disabled:opacity-40"
          >
            {cover?.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover.previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                Add
              </span>
            )}
          </button>
          {cover && (
            <button
              type="button"
              onClick={() => {
                if (cover.previewUrl) URL.revokeObjectURL(cover.previewUrl);
                setCover(null);
              }}
              disabled={busy}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground disabled:opacity-40"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <Kicker>Title</Kicker>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What it's called"
          disabled={busy}
          required
        />
      </label>

      <label className="flex flex-col gap-2">
        <Kicker>Artist (optional)</Kicker>
        <Input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Leave blank if it's yours"
          disabled={busy}
        />
      </label>

      <label className="flex flex-col gap-2">
        <Kicker>Notes (optional)</Kicker>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Where it came from, why it's here."
          disabled={busy}
        />
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend>
          <Kicker>Visibility</Kicker>
        </legend>
        <div className="flex gap-3">
          {(["public", "private"] as const).map((v) => (
            <label
              key={v}
              className="flex cursor-pointer items-center gap-2 border border-border px-4 py-2 transition-colors hover:border-foreground/60 has-[:checked]:border-foreground has-[:checked]:bg-foreground/5"
            >
              <input
                type="radio"
                name="visibility"
                value={v}
                checked={visibility === v}
                onChange={() => setVisibility(v)}
                disabled={busy}
                className="accent-foreground"
              />
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground">
                {v}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p className="text-sm text-foreground">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            Error:{" "}
          </span>
          {error}
        </p>
      )}

      {busy && state !== "reading" && (
        <div className="flex flex-col gap-2">
          <div className="h-px w-full bg-border">
            <div
              className="h-px bg-foreground transition-[width]"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            {state === "saving"
              ? "Saving…"
              : `Uploading — ${Math.round(progress * 100)}%`}
          </span>
        </div>
      )}

      <button
        type="submit"
        disabled={busy || !audio || !title.trim()}
        className={buttonClasses}
      >
        {busy ? "Working…" : "Publish track"}
      </button>
    </form>
  );
}
