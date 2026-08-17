"use client";

// Composer-lab. The studio's primitive picker is a single scrolling chip
// row, and with six primitives it breaks: measured at 375px the row is
// 537px wide against 327px of usable width, so only THREE of six chips are
// visible and Essay + Letter sit behind a horizontal scroll on every phone.
//
// Overflow is the symptom. Two deeper problems:
//
//   1. It grows linearly. Every new primitive makes it worse, and slice 40
//      only added the third-to-last one.
//   2. It flattens hierarchy. All six read as equal weight, so posting a
//      one-line note looks like the same commitment as writing an essay —
//      the opposite of what the manifesto says Stream is for.
//
// Three approaches below, each shown at full width and in a 375px frame.
// Pick one and it gets wired into `studio-composer.tsx`.

import Link from "next/link";
import { useState } from "react";
import { PageShell } from "@/app/_components/page-shell";
import { Kicker } from "@/app/_components/kicker";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";

type Primitive = "stream" | "voice" | "music" | "picture" | "essay" | "letter";

const META: Record<Primitive, { label: string; hint: string }> = {
  stream: {
    label: "Stream",
    hint: "A short note. No title, no commitment — the most casual thing you can post.",
  },
  voice: {
    label: "Voice",
    hint: "A short voice note — up to 60 seconds. Optional caption.",
  },
  music: {
    label: "Music",
    hint: "A track with a cover. Lands at /library/music/[slug].",
  },
  picture: {
    label: "Picture",
    hint: "An image with optional metadata. Lands at /library/inventory/[slug].",
  },
  essay: { label: "Essay", hint: "Markdown long-form. Lands at /library/[slug]." },
  letter: {
    label: "Letter",
    hint: "The dated note at the top of your home page.",
  },
};

const ALL: Primitive[] = ["stream", "voice", "music", "picture", "essay", "letter"];

const chipBase =
  "border px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.22em] transition-colors";
const chipOn = "border-foreground bg-foreground text-background";
const chipOff =
  "border-border text-muted hover:border-foreground hover:text-foreground";

/** Stand-in for whichever real form would render. */
function FormSlot({ active }: { active: Primitive }) {
  return (
    <div className="mt-8">
      <p className="text-[13px] leading-relaxed text-muted-soft">
        {META[active].hint}
      </p>
      <div className="mt-4 border border-dashed border-border p-6 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
          {META[active].label} form
        </span>
      </div>
    </div>
  );
}

// ── A — wrapping grid ───────────────────────────────────────────────────
// Smallest possible change: stop scrolling, start wrapping. Everything is
// visible at every width and it scales to eight or ten primitives without
// a redesign. Doesn't touch the hierarchy problem — all six still read as
// equal weight — and at 375px it costs three rows of vertical space above
// the form.
function OptionA() {
  const [active, setActive] = useState<Primitive>("stream");
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {ALL.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setActive(k)}
            className={`${chipBase} ${active === k ? chipOn : chipOff}`}
          >
            {META[k].label}
          </button>
        ))}
      </div>
      <FormSlot active={active} />
    </div>
  );
}

// ── B — stream-first ────────────────────────────────────────────────────
// The note composer is just *there*, open, no selection required — which
// is what "the most casual thing you can post" should feel like. The other
// five are a quieter line of text links underneath that wraps naturally at
// any width.
//
// Fewest taps for the common case and it never overflows. The cost: the
// other primitives are visibly demoted, so a track or an essay is a
// second-class action rather than a peer.
function OptionB() {
  const [active, setActive] = useState<Primitive>("stream");
  const others = ALL.filter((k) => k !== active);
  return (
    <div>
      {active !== "stream" && (
        <button
          type="button"
          onClick={() => setActive("stream")}
          className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground"
        >
          ← Back to a note
        </button>
      )}
      <div className="border border-dashed border-border p-6 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
          {META[active].label} form
        </span>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-muted-soft">
        {META[active].hint}
      </p>
      <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2 border-t border-border pt-5">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
          Or post
        </span>
        {others.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setActive(k)}
            className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {META[k].label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── C — grouped by territory ────────────────────────────────────────────
// Three groups instead of six items, matching the model the manifesto
// already uses: Stream is the running feed, Library is the things that
// keep their own URL, Letter is the note pinned to your home page.
//
// Always three chips wide no matter how many primitives exist — a new
// Library type joins a group instead of extending the row. The cost is a
// second tap for anything that isn't the group's default.
const GROUPS: { key: string; label: string; members: Primitive[] }[] = [
  { key: "stream", label: "Stream", members: ["stream", "voice"] },
  { key: "library", label: "Library", members: ["music", "picture", "essay"] },
  { key: "letter", label: "Letter", members: ["letter"] },
];

function OptionC() {
  const [group, setGroup] = useState(GROUPS[0]);
  const [active, setActive] = useState<Primitive>("stream");

  return (
    <div>
      <div className="flex gap-2">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => {
              setGroup(g);
              setActive(g.members[0]);
            }}
            className={`${chipBase} flex-1 ${group.key === g.key ? chipOn : chipOff}`}
          >
            {g.label}
          </button>
        ))}
      </div>
      {group.members.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {group.members.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setActive(k)}
              className={
                "font-mono text-[10.5px] uppercase tracking-[0.18em] underline-offset-4 transition-colors " +
                (active === k
                  ? "text-foreground underline"
                  : "text-muted hover:text-foreground")
              }
            >
              {META[k].label}
            </button>
          ))}
        </div>
      )}
      <FormSlot active={active} />
    </div>
  );
}

const OPTIONS = [
  {
    tag: "A",
    name: "Wrapping grid",
    blurb:
      "Stop scrolling, start wrapping. Smallest change, everything visible at every width, scales to ten primitives. Doesn't fix the hierarchy — all six still read as equal — and costs three rows of height at 375px.",
    render: () => <OptionA />,
  },
  {
    tag: "B",
    name: "Stream-first",
    blurb:
      "The note composer is already open; the rest are quiet text links that wrap. Fewest taps for the common case, never overflows, and matches what the manifesto says Stream is. Cost: the other five read as second-class.",
    render: () => <OptionB />,
  },
  {
    tag: "C",
    name: "Grouped by territory",
    blurb:
      "Three groups — Stream / Library / Letter — matching the model the manifesto already uses. Always three chips wide however many primitives exist. Cost: a second tap for anything that isn't the group's default.",
    render: () => <OptionC />,
  },
];

export default function ComposerLab() {
  return (
    <PageShell
      leftNav={<NearstreamLockup size={24} className="text-foreground" />}
      rightNav={
        <Link
          href="/design"
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground"
        >
          ← Design
        </Link>
      }
    >
      <section className="flex flex-1 justify-center px-6 py-16">
        <div className="w-full max-w-5xl">
          <Kicker>Composer lab</Kicker>
          <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
            Six primitives, one row
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
            The current chip row measures 537px against 327px of usable width
            at 375px — so three of six chips are visible and Essay and Letter
            are behind a horizontal scroll on every phone. Overflow is the
            symptom; the row also grows linearly with each primitive and makes
            a one-line note look like the same commitment as an essay.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Each option below is live — click through it. The narrow column on
            the right is a real 375px frame, which is the width that actually
            decides this.
          </p>

          <div className="mt-14 space-y-16">
            {OPTIONS.map((opt) => (
              <div key={opt.tag} className="border border-border p-6 sm:p-8">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-soft">
                    {opt.tag}
                  </span>
                  <h2 className="text-base font-normal tracking-tight text-foreground">
                    {opt.name}
                  </h2>
                </div>
                <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
                  {opt.blurb}
                </p>

                <div className="mt-8 flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
                      Desktop
                    </div>
                    {opt.render()}
                  </div>
                  <div className="flex-shrink-0">
                    <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
                      375px
                    </div>
                    {/* A real 375px box with the studio's px-6 gutters, so
                        what's shown is the actual constraint rather than a
                        scaled-down approximation. */}
                    <div className="w-[375px] border border-border/60 bg-background px-6 py-6">
                      {opt.render()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
