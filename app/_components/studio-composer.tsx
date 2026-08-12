"use client";

import { useState } from "react";
import { SubmitButton } from "@/app/_components/submit-button";
import { Input } from "@/app/_components/input";
import { Textarea } from "@/app/_components/textarea";
import { Kicker } from "@/app/_components/kicker";
import { ModeRadioGroup } from "@/app/_components/mode-radio";
import { InventoryUploadForm } from "@/app/_components/inventory-upload-form";
import { VisibilityRadio } from "@/app/_components/visibility-radio";
import { AudioRecorder } from "@/app/_components/audio-recorder";
import { DEFAULT_MODE } from "@/schemas/stream";

// Compose-first studio. Federico's "I got lost" and Alessandro's "I don't
// post because I have to scroll past three forms" both point at the same
// thing: four stacked forms is one too many decisions before you've started.
// Pick a primitive at the top; the relevant form is the only thing below.

type Primitive = "stream" | "voice" | "picture" | "essay" | "letter";

const PRIMITIVES: { key: Primitive; label: string; hint: string }[] = [
  {
    key: "stream",
    label: "Stream",
    hint: "A short note. No title, no commitment — the most casual thing you can post.",
  },
  {
    key: "voice",
    label: "Voice",
    hint: "A short voice note — up to 60 seconds. Optional caption. Plays in the reader with an animated mark that breathes with your voice.",
  },
  {
    key: "picture",
    label: "Picture",
    hint: "An image with optional metadata. Lands at /library/inventory/[slug].",
  },
  {
    key: "essay",
    label: "Essay",
    hint: "Markdown long-form. Lands at /library/[slug].",
  },
  {
    key: "letter",
    label: "Letter",
    hint: "The dated note at the top of your home page. Update it when your head changes.",
  },
];

export type LibraryPick = { id: string; slug: string; title: string };

type Props = {
  initialActive: Primitive;
  letterBody: string | null;
  letterError?: string;
  essayError?: string;
  essays: LibraryPick[];
  inventoryItems: LibraryPick[];
};

export function StudioComposer({
  initialActive,
  letterBody,
  letterError,
  essayError,
  essays,
  inventoryItems,
}: Props) {
  const [active, setActive] = useState<Primitive>(initialActive);
  const meta = PRIMITIVES.find((p) => p.key === active)!;

  return (
    <div>
      {/* Primitive chips. -mx-6 + px-6 lets the row scroll past the page
          gutter on narrow screens without clipping. */}
      <div className="-mx-6 overflow-x-auto px-6 pb-1">
        <div className="flex gap-2">
          {PRIMITIVES.map((p) => {
            const isActive = p.key === active;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setActive(p.key)}
                className={
                  "shrink-0 border px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.22em] transition-colors " +
                  (isActive
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted hover:border-foreground hover:text-foreground")
                }
                aria-pressed={isActive}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-6 text-[13px] leading-relaxed text-muted-soft">
        {meta.hint}
      </p>

      <div className="mt-8">
        {active === "stream" && (
          <StreamForm essays={essays} inventory={inventoryItems} />
        )}
        {active === "voice" && <VoiceForm />}
        {active === "picture" && <InventoryUploadForm />}
        {active === "essay" && <EssayForm error={essayError} />}
        {active === "letter" && (
          <LetterForm body={letterBody} error={letterError} />
        )}
      </div>
    </div>
  );
}

function StreamForm({
  essays,
  inventory,
}: {
  essays: LibraryPick[];
  inventory: LibraryPick[];
}) {
  return (
    <form action="/api/stream" method="POST" className="flex flex-col gap-8">
      <label className="flex flex-col gap-2">
        <Kicker>Entry</Kicker>
        <Textarea
          name="text"
          required
          rows={5}
          placeholder="What are you doing right now?"
        />
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend>
          <Kicker>Mode</Kicker>
        </legend>
        <ModeRadioGroup current={DEFAULT_MODE} />
      </fieldset>

      {(essays.length > 0 || inventory.length > 0) && (
        <label className="flex flex-col gap-2">
          <Kicker>Link to library (optional)</Kicker>
          <select
            name="link"
            defaultValue=""
            className="border-b border-border bg-transparent px-0 py-2 font-sans text-sm text-foreground outline-none focus:border-foreground"
          >
            <option value="">— no link —</option>
            {essays.length > 0 && (
              <optgroup label="Essays">
                {essays.map((e) => (
                  <option key={`essay-${e.id}`} value={`essay::${e.slug}`}>
                    {e.title}
                  </option>
                ))}
              </optgroup>
            )}
            {inventory.length > 0 && (
              <optgroup label="Inventory">
                {inventory.map((i) => (
                  <option
                    key={`inventory-${i.id}`}
                    value={`inventory::${i.slug}`}
                  >
                    {i.title}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
            Announces a library entry with a → arrow.
          </span>
        </label>
      )}

      <VisibilityRadio defaultValue="public" />

      <SubmitButton pendingLabel="Posting…" className="self-start">
        Post
      </SubmitButton>
    </form>
  );
}

function LetterForm({
  body,
  error,
}: {
  body: string | null;
  error?: string;
}) {
  return (
    <>
      {error && (
        <div
          role="alert"
          className="mb-6 border-l-2 border-foreground/50 pl-4 py-2"
        >
          <Kicker>Could not update</Kicker>
          <p className="mt-1 text-sm text-muted">{error}</p>
        </div>
      )}
      <form action="/api/letter" method="POST" className="flex flex-col gap-8">
        <label className="flex flex-col gap-2">
          <Kicker>Body</Kicker>
          <Textarea
            name="body"
            required
            rows={5}
            defaultValue={body ?? ""}
            placeholder="Working on Soft Iron and a piece for an upcoming show. Writing about the shape of a quieter web."
          />
        </label>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
          The date appears automatically — today&rsquo;s date is set when you
          update.
        </p>
        <SubmitButton pendingLabel="Updating…" className="self-start">
          Update letter
        </SubmitButton>
      </form>
    </>
  );
}

function VoiceForm() {
  const [recorded, setRecorded] = useState<{
    blob: Blob;
    durationMs: number;
    mime: "audio/webm" | "audio/mp4";
  } | null>(null);
  const [state, setState] = useState<"idle" | "uploading" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!recorded) {
      setError("Record something first.");
      return;
    }
    // Read the mode + visibility + caption directly off the form so we
    // don't have to controlled-wrap the shared radio components.
    const formData = new FormData(e.currentTarget);
    const caption = String(formData.get("text") ?? "").trim();
    const tag = String(formData.get("tag") ?? DEFAULT_MODE);
    const visibility = String(formData.get("visibility") ?? "public");

    try {
      setState("uploading");
      const urlRes = await fetch("/api/stream/upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentType: recorded.mime }),
      });
      if (!urlRes.ok) {
        const body = await urlRes.json().catch(() => ({ error: "upload-url failed" }));
        throw new Error(body.error ?? "upload-url failed");
      }
      const { uploadUrl, key } = (await urlRes.json()) as {
        uploadUrl: string;
        key: string;
      };

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "content-type": recorded.mime },
        body: recorded.blob,
      });
      if (!putRes.ok) {
        throw new Error(`R2 PUT failed (${putRes.status})`);
      }

      setState("saving");
      const postRes = await fetch("/api/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: caption,
          tag,
          visibility,
          audioKey: key,
          audioMime: recorded.mime,
          audioDurationMs: Math.round(recorded.durationMs),
        }),
      });
      if (!postRes.ok) {
        const body = await postRes.json().catch(() => ({ error: "post failed" }));
        throw new Error(body.error ?? "post failed");
      }

      // Match the redirect-on-success behaviour of the other forms — send
      // the user back to studio so they can immediately hear it in context.
      window.location.href = "/studio";
    } catch (err) {
      setError(err instanceof Error ? err.message : "post failed");
      setState("idle");
    }
  }

  const busy = state !== "idle";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Kicker>Voice note</Kicker>
        <AudioRecorder onChange={setRecorded} />
      </div>

      <label className="flex flex-col gap-2">
        <Kicker>Caption (optional)</Kicker>
        <Textarea
          name="text"
          rows={3}
          placeholder="Anything you want to say alongside it."
        />
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend>
          <Kicker>Mode</Kicker>
        </legend>
        <ModeRadioGroup current={DEFAULT_MODE} />
      </fieldset>

      <VisibilityRadio defaultValue="public" />

      {error && (
        <div role="alert" className="border-l-2 border-foreground/50 pl-4 py-2">
          <Kicker>Could not post</Kicker>
          <p className="mt-1 text-sm text-muted">{error}</p>
        </div>
      )}

      <SubmitButton
        pendingLabel={state === "uploading" ? "Uploading…" : "Saving…"}
        disabled={!recorded || busy}
        className="self-start"
      >
        Post voice note
      </SubmitButton>
    </form>
  );
}

function EssayForm({ error }: { error?: string }) {
  return (
    <>
      {error && (
        <div
          role="alert"
          className="mb-6 border-l-2 border-foreground/50 pl-4 py-2"
        >
          <Kicker>Could not publish</Kicker>
          <p className="mt-1 text-sm text-muted">{error}</p>
        </div>
      )}
      <form action="/api/essays" method="POST" className="flex flex-col gap-8">
        <label className="flex flex-col gap-2">
          <Kicker>Title</Kicker>
          <Input
            name="title"
            required
            maxLength={200}
            placeholder="The shape of a quieter web"
          />
        </label>
        <label className="flex flex-col gap-2">
          <Kicker>Body</Kicker>
          <Textarea
            name="body"
            required
            rows={14}
            placeholder="## A heading&#10;&#10;Markdown body. Links, *italics*, **bold**, lists, code, blockquotes — all supported."
          />
        </label>
        <VisibilityRadio defaultValue="public" />
        <SubmitButton pendingLabel="Publishing…" className="self-start">
          Publish
        </SubmitButton>
      </form>
    </>
  );
}
