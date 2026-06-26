import Link from "next/link";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { Kicker } from "@/app/_components/kicker";

export const metadata = {
  title: "Multi-image lab · Nearstream",
  robots: { index: false, follow: false },
};

// Round 4 — scaling test. Each direction has to work at 2 (a pair, the
// minimum interesting case), 6 (a small series), and 12 (a big set). The
// shapes mix landscape / portrait / square in each list so the ratio
// problem is visible at every count.

type Shot = {
  ratio: string;
  hint: "landscape" | "portrait" | "square";
};

const POOL: Shot[] = [
  { ratio: "aspect-[4/3]", hint: "landscape" },
  { ratio: "aspect-[3/4]", hint: "portrait" },
  { ratio: "aspect-[3/4]", hint: "portrait" },
  { ratio: "aspect-[1/1]", hint: "square" },
  { ratio: "aspect-[3/4]", hint: "portrait" },
  { ratio: "aspect-[4/3]", hint: "landscape" },
  { ratio: "aspect-[1/1]", hint: "square" },
  { ratio: "aspect-[3/4]", hint: "portrait" },
  { ratio: "aspect-[4/3]", hint: "landscape" },
  { ratio: "aspect-[3/4]", hint: "portrait" },
  { ratio: "aspect-[1/1]", hint: "square" },
  { ratio: "aspect-[4/3]", hint: "landscape" },
];

// 2 = a pair (1 landscape + 1 portrait — worst-case mismatch)
// 6 = the canonical series
// 12 = a "lots of pics from a single trip / show" set
const SHOTS_2: Shot[] = [POOL[0], POOL[1]];
const SHOTS_6: Shot[] = POOL.slice(0, 6);
const SHOTS_12: Shot[] = POOL.slice(0, 12);

export default function MultiImageLabPage() {
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
        <div className="w-full max-w-[1400px]">
          <Kicker>Multi-image lab — round 4 (scale test)</Kicker>
          <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
            Each direction at 2, 6, and 12
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
            A direction that only works at one count is the wrong direction.
            Each row below is one design at three counts: a pair (worst-case
            mismatch — landscape + portrait), the canonical six, and a long
            set of twelve.
          </p>

          <Direction
            tag="V11"
            name="Contact sheet"
            note="Lightroom Library. Lands on the tile grid; tap a tile to open the viewer."
            myRead="Scales the best. At 2, it just looks like a pair laid out cleanly. At 12, it's still legible and reads like a folio."
          >
            <ContactSheet shots={SHOTS_2} />
            <ContactSheet shots={SHOTS_6} />
            <ContactSheet shots={SHOTS_12} />
          </Direction>

          <Direction
            tag="V12"
            name="Filmstrip + preview"
            note="Big image with a persistent thumb strip pinned to bottom. Lightroom Develop."
            myRead="At 2, the filmstrip with 2 thumbs feels token. At 6 it's perfect. At 12 the strip scrolls — which is honest."
          >
            <FilmstripPreview shots={SHOTS_2} activeIndex={0} />
            <FilmstripPreview shots={SHOTS_6} activeIndex={1} />
            <FilmstripPreview shots={SHOTS_12} activeIndex={3} />
          </Direction>

          <Direction
            tag="V13"
            name="Wall hang"
            note="Curated exhibition — varied sizes, deliberate negative space."
            myRead="Doesn't scale. At 2 it's just two stacked pictures. At 12 the variation rules collapse into noise. This is a 4–6 only design."
          >
            <WallHang shots={SHOTS_2} />
            <WallHang shots={SHOTS_6} />
            <WallHang shots={SHOTS_12} />
          </Direction>

          <Direction
            tag="V14"
            name="Projector + side index"
            note="Single image in a black void, vertical index dots in the gutter."
            myRead="At 2, the 2 dots feel silly. At 12, the dots feel like a status bar. The viewer itself scales — but you'd want a smarter index than dots when N > ~8."
          >
            <ProjectorVoid shots={SHOTS_2} activeIndex={0} />
            <ProjectorVoid shots={SHOTS_6} activeIndex={2} />
            <ProjectorVoid shots={SHOTS_12} activeIndex={5} />
          </Direction>

          <Direction
            tag="V15"
            name="Pair / Sheet (adaptive)"
            note="Two images: side-by-side pair (or stacked if both portrait). 3+: tile contact sheet. Different layout per N, same vocabulary."
            myRead="The boring-honest answer. At 2 we don't pretend it's a series — it's just a pair. At 6+ we admit it's a set. Cheap to build, hard to argue with."
          >
            <Adaptive shots={SHOTS_2} />
            <Adaptive shots={SHOTS_6} />
            <Adaptive shots={SHOTS_12} />
          </Direction>

          <Direction
            tag="V16"
            name="V11 + V14 modal (the actual answer)"
            note="Detail page = V11 contact sheet, scrolls normally with all metadata below. Tapping a tile opens a modal overlay that locks page scroll and presents V14's projector viewer. Horizontal swipe inside the modal, dismiss with swipe-down or close. No vertical-gesture conflict."
            myRead="This is how iOS Photos and Lightroom Library → Loupe work. V11 and V14 aren't competing — they're the two halves of the same answer. Modal opens are cheap on web, give an obvious dismiss affordance, and let each surface keep its native gesture."
          >
            <ModalComposition shots={SHOTS_2} />
            <ModalComposition shots={SHOTS_6} />
            <ModalComposition shots={SHOTS_12} />
          </Direction>

          <p className="mt-16 max-w-2xl text-sm leading-relaxed text-muted">
            <strong className="text-foreground">My read across the table:</strong>{" "}
            V16 is the actual answer once you account for the page having to
            scroll. The detail page stays a contact sheet (V11) and scrolls
            normally with all the metadata below; tapping a tile opens a
            modal viewer (V14&rsquo;s projector treatment) that locks page
            scroll and uses horizontal swipe. V15&rsquo;s adaptive logic
            still applies underneath: at N === 2, the &ldquo;contact
            sheet&rdquo; framing collapses to a pair.
          </p>
        </div>
      </section>
    </PageShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Shells
   ───────────────────────────────────────────────────────────────────────── */

function Direction({
  tag,
  name,
  note,
  myRead,
  children,
}: {
  tag: string;
  name: string;
  note: string;
  myRead: string;
  children: React.ReactNode;
}) {
  // children = exactly three phone-frame variants in order [2, 6, 12]
  return (
    <section className="mt-20 border-t border-border pt-10">
      <div className="flex flex-wrap items-baseline gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
          {tag}
        </span>
        <h2 className="text-xl font-normal tracking-tight text-foreground">
          {name}
        </h2>
      </div>
      <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted">
        {note}
      </p>
      <p className="mt-3 max-w-2xl text-[12.5px] leading-relaxed text-muted-soft">
        <span className="text-foreground">Scale read:</span> {myRead}
      </p>
      <div className="mt-8 flex gap-6 overflow-x-auto pb-6">
        {[2, 6, 12].map((count, i) => (
          <ColumnLabel key={count} count={count}>
            {Array.isArray(children) ? children[i] : children}
          </ColumnLabel>
        ))}
      </div>
    </section>
  );
}

function ColumnLabel({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground">
          {String(count).padStart(2, "0")} images
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-soft">
          {count === 2 ? "pair" : count === 6 ? "series" : "long set"}
        </span>
      </div>
      <PhoneFrame>{children}</PhoneFrame>
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[820px] w-[375px] overflow-hidden border border-border bg-background">
      <div className="h-full overflow-y-auto">{children}</div>
    </div>
  );
}

function DetailHeader({ count }: { count: number }) {
  const label =
    count === 2 ? "Two pieces" : count === 6 ? "Six pieces" : `${count} pieces`;
  return (
    <div className="px-5 pt-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
        Inventory · Federico Gangemi
      </p>
      <h2 className="mt-3 text-[20px] leading-snug tracking-tight text-foreground">
        First two weeks at jewellery school
      </h2>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
        {label}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Image placeholder
   ───────────────────────────────────────────────────────────────────────── */
function Placeholder({
  shot,
  index,
  className = "",
}: {
  shot: Shot;
  index: number;
  className?: string;
}) {
  const tones = [
    "from-foreground/22 via-foreground/8 to-foreground/3",
    "from-foreground/16 via-foreground/6 to-foreground/3",
    "from-foreground/28 via-foreground/10 to-foreground/4",
    "from-foreground/12 via-foreground/4 to-foreground/2",
    "from-foreground/20 via-foreground/7 to-foreground/3",
    "from-foreground/18 via-foreground/9 to-foreground/4",
  ];
  return (
    <div
      className={`relative overflow-hidden ${shot.ratio} bg-gradient-to-br ${tones[index % tones.length]} ${className}`}
    >
      <span className="absolute left-2 top-2 font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/60">
        {shot.hint}
      </span>
      <span className="absolute right-2 bottom-2 font-mono text-[10px] tabular-nums text-foreground/40">
        {String(index + 1).padStart(2, "0")}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   V11 — Contact sheet
   ───────────────────────────────────────────────────────────────────────── */
function ContactSheet({ shots }: { shots: Shot[] }) {
  return (
    <div>
      <DetailHeader count={shots.length} />
      <div className="mt-4 grid grid-cols-2 gap-2 px-5">
        {shots.map((s, i) => (
          <Placeholder key={i} shot={s} index={i} />
        ))}
      </div>
      <div className="mt-6 border-t border-border px-5 py-6">
        <p className="text-[13.5px] leading-relaxed text-muted">
          Some I&rsquo;ll keep, some I won&rsquo;t.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   V12 — Filmstrip + preview
   ───────────────────────────────────────────────────────────────────────── */
function FilmstripPreview({
  shots,
  activeIndex,
}: {
  shots: Shot[];
  activeIndex: number;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
          Federico Gangemi
        </p>
        <p className="mt-1 font-mono text-[10px] tabular-nums text-foreground">
          {String(activeIndex + 1).padStart(2, "0")} /{" "}
          {String(shots.length).padStart(2, "0")}
        </p>
      </div>
      <div className="flex-1 px-5 py-5">
        <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-foreground/26 via-foreground/10 to-foreground/4">
          <span className="absolute left-3 top-3 font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/60">
            {shots[activeIndex].hint}
          </span>
        </div>
      </div>
      <div className="border-t border-border px-3 py-3">
        <div className="flex gap-1.5 overflow-x-auto">
          {shots.map((s, i) => (
            <button
              key={i}
              type="button"
              className={`relative h-16 w-16 shrink-0 overflow-hidden border ${i === activeIndex ? "border-foreground" : "border-border"}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-foreground/20 via-foreground/7 to-foreground/3" />
              <span className="absolute right-1 bottom-0.5 font-mono text-[8px] tabular-nums text-foreground/60">
                {String(i + 1).padStart(2, "0")}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   V13 — Wall hang (rules are hand-crafted up to 6; beyond that, falls
   apart on purpose — that's the scale finding)
   ───────────────────────────────────────────────────────────────────────── */
function WallHang({ shots }: { shots: Shot[] }) {
  if (shots.length === 2) {
    return (
      <div>
        <DetailHeader count={2} />
        <div className="mt-10 px-8 pb-10">
          <Placeholder shot={shots[0]} index={0} />
        </div>
        <div className="px-12 pb-10">
          <Placeholder shot={shots[1]} index={1} />
        </div>
      </div>
    );
  }
  if (shots.length === 6) {
    return (
      <div>
        <DetailHeader count={6} />
        <div className="mt-10 flex flex-col">
          <div className="px-8 pb-10">
            <Placeholder shot={shots[0]} index={0} />
          </div>
          <div className="grid grid-cols-2 gap-2 px-5 pb-12">
            <div className="pr-3">
              <Placeholder shot={shots[1]} index={1} />
            </div>
            <div className="pl-3 pt-8">
              <Placeholder shot={shots[2]} index={2} />
            </div>
          </div>
          <div className="px-5 pb-10">
            <div className="w-1/2">
              <Placeholder shot={shots[3]} index={3} />
            </div>
          </div>
          <div className="flex justify-end px-5 pb-12">
            <div className="w-2/3">
              <Placeholder shot={shots[4]} index={4} />
            </div>
          </div>
          <div className="px-3 pb-8">
            <Placeholder shot={shots[5]} index={5} />
          </div>
        </div>
      </div>
    );
  }
  // 12 — the rules don't extend, so it just loops the 6-image rules, which
  // demonstrates the scale problem (the curated feel becomes a pattern).
  return (
    <div>
      <DetailHeader count={shots.length} />
      <div className="mt-10 flex flex-col">
        {shots.map((s, i) => (
          <div
            key={i}
            className={
              i % 6 === 0
                ? "px-8 pb-10"
                : i % 6 === 3
                  ? "px-5 pb-10"
                  : "px-5 pb-8"
            }
          >
            <div
              className={
                i % 6 === 3 ? "w-1/2" : i % 6 === 4 ? "w-2/3 ml-auto" : ""
              }
            >
              <Placeholder shot={s} index={i} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   V14 — Projector + side index
   ───────────────────────────────────────────────────────────────────────── */
function ProjectorVoid({
  shots,
  activeIndex,
}: {
  shots: Shot[];
  activeIndex: number;
}) {
  const showDots = shots.length <= 8;
  return (
    <div className="relative h-full">
      <div className="absolute inset-0 flex items-center justify-center px-8 py-16">
        <div
          className={`w-full ${shots[activeIndex].ratio} relative overflow-hidden bg-gradient-to-br from-foreground/30 via-foreground/12 to-foreground/4`}
        >
          <span className="absolute left-2 top-2 font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/60">
            {shots[activeIndex].hint}
          </span>
        </div>
      </div>
      <div className="absolute bottom-6 left-5 right-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
          Federico Gangemi
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground">
          {String(activeIndex + 1).padStart(2, "0")} /{" "}
          {String(shots.length).padStart(2, "0")} &middot;{" "}
          {shots[activeIndex].hint}
        </p>
      </div>
      <div className="absolute top-6 left-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
          ← back to set
        </p>
      </div>
      {showDots ? (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <div className="flex flex-col gap-3">
            {shots.map((_, i) => (
              <span
                key={i}
                aria-hidden
                className={`block h-1 w-1 rounded-full ${i === activeIndex ? "bg-foreground" : "bg-foreground/20"}`}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-right">
          <p className="font-mono text-[10px] tabular-nums text-foreground">
            {String(activeIndex + 1).padStart(2, "0")}
          </p>
          <div className="my-1 ml-auto h-12 w-px bg-foreground/20" />
          <p className="font-mono text-[10px] tabular-nums text-muted-soft">
            {String(shots.length).padStart(2, "0")}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   V16 — V11 contact sheet + V14 projector modal
   Renders the contact-sheet detail page underneath (dimmed) with the
   projector modal overlay on top, so the composition is visible in one
   phone frame. In production the modal is `position: fixed` with scroll
   locked on the body underneath.
   ───────────────────────────────────────────────────────────────────────── */
function ModalComposition({ shots }: { shots: Shot[] }) {
  const activeIndex = Math.min(1, shots.length - 1);
  return (
    <div className="relative h-full">
      {/* The detail page underneath. Dimmed so the modal reads as on top. */}
      <div className="absolute inset-0 overflow-hidden opacity-40">
        <div>
          <DetailHeader count={shots.length} />
          <div className="mt-4 grid grid-cols-2 gap-2 px-5">
            {shots.map((s, i) => (
              <Placeholder key={i} shot={s} index={i} />
            ))}
          </div>
          <div className="mt-6 border-t border-border px-5 py-6">
            <p className="text-[13.5px] leading-relaxed text-muted">
              Some I&rsquo;ll keep, some I won&rsquo;t.
            </p>
          </div>
        </div>
      </div>
      {/* The scrim. Solid-enough that the page underneath is just a hint. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-background/85 backdrop-blur-sm"
      />
      {/* The modal viewer itself — V14's projector treatment. */}
      <div className="absolute inset-0 flex flex-col">
        <div className="flex items-center justify-between px-5 pt-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
            ↓ swipe to close
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground">
            ✕
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div
            className={`w-full ${shots[activeIndex].ratio} relative overflow-hidden bg-gradient-to-br from-foreground/30 via-foreground/12 to-foreground/4`}
          >
            <span className="absolute left-2 top-2 font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/60">
              {shots[activeIndex].hint}
            </span>
          </div>
        </div>
        <div className="px-5 pb-8">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
                Federico Gangemi
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground">
                {String(activeIndex + 1).padStart(2, "0")} /{" "}
                {String(shots.length).padStart(2, "0")} &middot;{" "}
                {shots[activeIndex].hint}
              </p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
              ← swipe →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   V15 — Pair / Sheet (adaptive)
   The "boring-honest" answer: two images is a pair, not a series. Three+
   is a series. Different layouts, same vocabulary, no pretending.
   ───────────────────────────────────────────────────────────────────────── */
function Adaptive({ shots }: { shots: Shot[] }) {
  if (shots.length === 2) {
    // Pair view: stacked, full-width, generous breathing room.
    // No "Six pieces" label, no contact-sheet framing — this is a pair.
    return (
      <div>
        <div className="px-5 pt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
            Inventory · Federico Gangemi
          </p>
          <h2 className="mt-3 text-[20px] leading-snug tracking-tight text-foreground">
            First two weeks at jewellery school
          </h2>
        </div>
        <div className="mt-8 px-5">
          <Placeholder shot={shots[0]} index={0} />
        </div>
        <div className="mt-3 px-5">
          <Placeholder shot={shots[1]} index={1} />
        </div>
        <div className="mt-6 border-t border-border px-5 py-6">
          <p className="text-[13.5px] leading-relaxed text-muted">
            Some I&rsquo;ll keep, some I won&rsquo;t.
          </p>
        </div>
      </div>
    );
  }
  // 3+ → contact sheet (same as V11).
  return (
    <div>
      <DetailHeader count={shots.length} />
      <div className="mt-4 grid grid-cols-2 gap-2 px-5">
        {shots.map((s, i) => (
          <Placeholder key={i} shot={s} index={i} />
        ))}
      </div>
      <div className="mt-6 border-t border-border px-5 py-6">
        <p className="text-[13.5px] leading-relaxed text-muted">
          Some I&rsquo;ll keep, some I won&rsquo;t.
        </p>
      </div>
    </div>
  );
}
