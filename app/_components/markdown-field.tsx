"use client";

// A markdown textarea with a preview tab.
//
// Essays are the one primitive where what you type isn't what you get, and
// until now the only way to see how a heading or a blockquote had come out
// was to publish it and look. For a long piece with links and structure
// that's a poor loop.
//
// Fidelity is the whole point, so the preview renders through the *same*
// `marked` call the published page uses, into the *same* `prose-essay`
// class. A preview built on a different renderer or different styles would
// be worse than none — it would be confidently wrong.
//
// Tabs rather than a side-by-side split: the studio is used on a phone, and
// two columns at 375px would give neither of them enough room.
//
// With `images`, an "Add image" button uploads a picked file straight to R2
// and writes `![Describe the image](/api/media/{key})` at the caret, with
// the description selected so typing replaces it. The image is plain
// markdown from then on: move it, cut it, the body is the truth. Each
// upload's signed token rides along as a hidden `imageTokens` field so the
// essay can own the image — see `lib/essay-images.ts`.

import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { Textarea } from "@/app/_components/textarea";
import {
  prepareEssayImage,
  putWithProgress,
} from "@/app/_components/upload-helpers";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const ALT_PLACEHOLDER = "Describe the image";

type Props = {
  name: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  /** Show the "Add image" button (essays). */
  images?: boolean;
};

type Upload =
  | { state: "idle" }
  | { state: "uploading"; percent: number }
  | { state: "error"; message: string };

export function MarkdownField({
  name,
  defaultValue = "",
  rows = 14,
  required,
  placeholder,
  images = false,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [showPreview, setShowPreview] = useState(false);
  const writeRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tokens, setTokens] = useState<string[]>([]);
  const [upload, setUpload] = useState<Upload>({ state: "idle" });
  // Selection to apply once the inserted text has rendered.
  const pendingSelection = useRef<[number, number] | null>(null);

  useEffect(() => {
    const sel = pendingSelection.current;
    const el = textareaRef.current;
    if (!sel || !el) return;
    pendingSelection.current = null;
    el.focus();
    el.setSelectionRange(sel[0], sel[1]);
  }, [value]);

  async function onImagePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // picking the same file again should still fire
    if (!file) return;
    // Where the caret was when the picker opened — the textarea keeps its
    // selection while the file dialog is up.
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;

    setUpload({ state: "uploading", percent: 0 });
    try {
      const { blob, contentType } = await prepareEssayImage(file);
      const res = await fetch("/api/essays/image-upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `upload-url failed (${res.status})`);
      }
      const { uploadUrl, src, token } = (await res.json()) as {
        uploadUrl: string;
        src: string;
        token: string;
      };
      await putWithProgress(uploadUrl, blob, contentType, (loaded) =>
        setUpload({
          state: "uploading",
          percent: Math.round((loaded / blob.size) * 100),
        }),
      );

      // Its own paragraph: blank line before and after, without piling up
      // extra blank lines when there already are some.
      setValue((current) => {
        const before = current.slice(0, start);
        const after = current.slice(end);
        const lead =
          before.length === 0 || before.endsWith("\n\n")
            ? ""
            : before.endsWith("\n")
              ? "\n"
              : "\n\n";
        const trail =
          after.length === 0 || after.startsWith("\n\n")
            ? ""
            : after.startsWith("\n")
              ? "\n"
              : "\n\n";
        const altStart = before.length + lead.length + 2; // after "!["
        pendingSelection.current = [altStart, altStart + ALT_PLACEHOLDER.length];
        return `${before}${lead}![${ALT_PLACEHOLDER}](${src})${trail}${after}`;
      });
      setTokens((t) => [...t, token]);
      setUpload({ state: "idle" });
    } catch (err) {
      setUpload({
        state: "error",
        message: err instanceof Error ? err.message : "upload failed",
      });
    }
  }
  // Preserve the height across the tab switch so the form doesn't jump when
  // a short draft is previewed.
  const [minHeight, setMinHeight] = useState<number>();

  useEffect(() => {
    if (!showPreview && writeRef.current) {
      setMinHeight(writeRef.current.offsetHeight);
    }
  }, [showPreview]);

  // `marked.parse` is synchronous unless `async: true` is passed. The
  // published page opts into async because it's a server component; here the
  // sync form is what we want, and it's the same parser either way.
  const html = useMemo(
    () => (showPreview ? (marked.parse(value) as string) : ""),
    [showPreview, value],
  );

  const words = useMemo(
    () => value.trim().split(/\s+/).filter(Boolean).length,
    [value],
  );

  const tabClasses = (active: boolean) =>
    "font-mono text-[10px] uppercase tracking-[0.2em] transition-colors " +
    (active
      ? "text-foreground underline underline-offset-4"
      : "text-muted hover:text-foreground");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-4">
        <button
          type="button"
          onClick={() => setShowPreview(false)}
          className={tabClasses(!showPreview)}
          aria-pressed={!showPreview}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className={tabClasses(showPreview)}
          aria-pressed={showPreview}
        >
          Preview
        </button>
        {images && !showPreview && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={upload.state === "uploading"}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            {upload.state === "uploading"
              ? `Uploading… ${upload.percent}%`
              : "+ Image"}
          </button>
        )}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft tabular-nums">
          {words} {words === 1 ? "word" : "words"}
        </span>
      </div>

      {images && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept={IMAGE_ACCEPT}
            onChange={onImagePicked}
            className="hidden"
            tabIndex={-1}
            aria-hidden
          />
          {tokens.map((t) => (
            <input key={t} type="hidden" name="imageTokens" value={t} />
          ))}
        </>
      )}

      {upload.state === "error" && (
        <p
          role="alert"
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/80"
        >
          Image not added — {upload.message}
        </p>
      )}

      {/* The textarea is only hidden, never unmounted — unmounting would
          drop its value from the form submission and lose the caret. */}
      <div ref={writeRef} className={showPreview ? "hidden" : "block"}>
        <Textarea
          ref={textareaRef}
          name={name}
          required={required}
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>

      {showPreview && (
        <div
          style={minHeight ? { minHeight } : undefined}
          className="border border-border p-5"
        >
          {value.trim() ? (
            <div
              // Same class and type scale as the published essay page, so
              // this is a preview rather than an approximation.
              className="prose-essay text-[15px] leading-relaxed text-foreground/90"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
              Nothing to preview yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}
