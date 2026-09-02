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

import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { Textarea } from "@/app/_components/textarea";

type Props = {
  name: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
};

export function MarkdownField({
  name,
  defaultValue = "",
  rows = 14,
  required,
  placeholder,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [showPreview, setShowPreview] = useState(false);
  const writeRef = useRef<HTMLDivElement>(null);
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
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft tabular-nums">
          {words} {words === 1 ? "word" : "words"}
        </span>
      </div>

      {/* The textarea is only hidden, never unmounted — unmounting would
          drop its value from the form submission and lose the caret. */}
      <div ref={writeRef} className={showPreview ? "hidden" : "block"}>
        <Textarea
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
