"use client";

// The "Now" block — what used to be called Letter.
//
// Two changes here, both from the same observation: this was never a post.
// Its store is get/set rather than list/add, it has no id, slug or
// visibility, and it appears nowhere in RSS, the reader or the digest. It
// never leaves your own page. Sitting in "Post something" alongside five
// things that genuinely syndicate made it look like a sixth way to publish.
//
// So it moved out of the composer into its own block, and it's called Now:
// the IndieWeb convention (the /now page) for exactly this — what you're
// up to at the moment, updated when it changes. "Letter" implied a
// newsletter, which the manifesto explicitly says this isn't.
//
// Renamed in the UI only. Storage stays at users/{id}/site/letter.json and
// the route stays /api/letter — the record has been written under that key
// since slice 14, and renaming it would orphan every existing one for a
// word change.

import { useState } from "react";
import { Textarea } from "@/app/_components/textarea";
import { Kicker } from "@/app/_components/kicker";
import { SubmitButton } from "@/app/_components/submit-button";

type Props = {
  body: string | null;
  updatedAt: string | null;
  error?: string;
};

function formatUpdated(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
}

export function NowEditor({ body, updatedAt, error }: Props) {
  // Collapsed by default when something is already written. This is a
  // once-in-a-while edit sitting on a page built for daily posting, so it
  // shouldn't take up the room a composer does — but an empty one stays
  // open, because an untouched Now is worth prompting for.
  const [open, setOpen] = useState(!body);

  return (
    <section className="border border-border p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <Kicker>Now</Kicker>
          {updatedAt && (
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft tabular-nums">
              {formatUpdated(updatedAt)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
          aria-expanded={open}
        >
          {open ? "Close" : body ? "Change" : "Write it"}
        </button>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-muted-soft">
        What you&rsquo;re up to at the moment. Sits at the top of your page and
        replaces itself &mdash; it isn&rsquo;t posted and friends won&rsquo;t
        see it in their reader.
      </p>

      {!open && body && (
        <p className="mt-5 line-clamp-3 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
          {body}
        </p>
      )}

      {open && (
        <>
          {error && (
            <div
              role="alert"
              className="mt-5 border-l-2 border-foreground/50 py-2 pl-4"
            >
              <Kicker>Could not update</Kicker>
              <p className="mt-1 text-sm text-muted">{error}</p>
            </div>
          )}
          <form
            action="/api/letter"
            method="POST"
            className="mt-5 flex flex-col gap-5"
          >
            <Textarea
              name="body"
              required
              rows={5}
              defaultValue={body ?? ""}
              placeholder="Working on Soft Iron and a piece for an upcoming show. Writing about the shape of a quieter web."
            />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
              The date sets itself &mdash; updating is dating.
            </p>
            <SubmitButton pendingLabel="Updating…" className="self-start">
              Update
            </SubmitButton>
          </form>
        </>
      )}
    </section>
  );
}
