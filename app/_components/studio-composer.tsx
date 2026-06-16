"use client";

import { useState } from "react";
import { SubmitButton } from "@/app/_components/submit-button";
import { Input } from "@/app/_components/input";
import { Textarea } from "@/app/_components/textarea";
import { Kicker } from "@/app/_components/kicker";
import { ModeRadioGroup } from "@/app/_components/mode-radio";
import { InventoryUploadForm } from "@/app/_components/inventory-upload-form";
import { VisibilityRadio } from "@/app/_components/visibility-radio";
import { DEFAULT_MODE } from "@/schemas/stream";

// Compose-first studio. Federico's "I got lost" and Alessandro's "I don't
// post because I have to scroll past three forms" both point at the same
// thing: four stacked forms is one too many decisions before you've started.
// Pick a primitive at the top; the relevant form is the only thing below.

type Primitive = "stream" | "picture" | "essay" | "letter";

const PRIMITIVES: { key: Primitive; label: string; hint: string }[] = [
  {
    key: "stream",
    label: "Stream",
    hint: "A short note. No title, no commitment — the most casual thing you can post.",
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
