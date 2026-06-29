import Link from "next/link";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { Kicker } from "@/app/_components/kicker";
import { NearstreamMarkAnimated } from "@/app/_components/site/nearstream-mark-animated";

export const metadata = {
  title: "Launcher lab · Nearstream",
  robots: { index: false, follow: false },
};

// Mockups for an Android home-screen launcher with the Nearstream identity.
// Not wired to anything — these are visual prototypes for the LinkedIn post
// + the eventual native Android project. Each prototype is rendered inside
// a 360×760 phone frame at life size so they read as they would on a real
// device.
//
// Three directional takes:
//
//   V1 — Mark + Clock: minimal home, the room is mostly empty. The mark
//        is the personality. Dock at bottom. App grid hidden behind swipe.
//
//   V2 — Reader-as-home: the launcher *is* the feed. The most recent
//        friend post fills the upper half; mono apps live as a tiny dock.
//        Home screen = "what are my friends up to right now."
//
//   V3 — Notebook: not a computer, more a notebook. Date in serif, today's
//        letter prominent, friend snippets as small cards. Apps as text
//        labels in the dock — no icons.
//
// The actual Android launcher is a multi-week native project (Kotlin /
// React Native + HOME intent). These mockups are the design conversation
// before any of that.

export default function LauncherLabPage() {
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
        <div className="w-full max-w-6xl">
          <Kicker>Launcher lab</Kicker>
          <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
            Android home, Nearstream identity
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
            What a Nearstream launcher could look like. Mockups, not code —
            the real launcher is a separate native project. Rendered inside
            phone frames at life size (360 × 760, roughly Pixel 7 logical).
          </p>

          <div className="mt-12 flex gap-6 overflow-x-auto pb-6">
            <Variant
              tag="V1"
              name="Mark + clock"
              note="Minimal home. The animated `>` mark is the personality. Big mono clock, sparse date below, dock at bottom. App drawer hidden behind swipe-up. The room is mostly empty — that's the point."
            >
              <MarkAndClock />
            </Variant>

            <Variant
              tag="V2"
              name="Reader-as-home"
              note="The launcher *is* the feed. Most recent friend post fills the upper half. Below: a strip of tiny cards from the rest of today. Mono app dock at bottom. Home screen answers `what are my friends up to right now`."
            >
              <ReaderAsHome />
            </Variant>

            <Variant
              tag="V3"
              name="Notebook"
              note="Less computer, more notebook. Date in serif at top, today's letter (your own) underneath. Two small friend snippets below. Apps as mono text labels in the dock — no icons. The launcher reads like a page from a journal."
            >
              <Notebook />
            </Variant>
          </div>

          <p className="mt-12 max-w-xl text-sm leading-relaxed text-muted">
            <strong className="text-foreground">My read:</strong> V1 is the
            cleanest pitch &mdash; the animated mark + sparse chrome is the
            visual identity, and a launcher is the most ambient surface to
            put it on. V2 is the most useful (you literally see your
            friends when you unlock your phone). V3 is the most Nearstream
            (it reads like a notebook, not an OS).
          </p>
        </div>
      </section>
    </PageShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Shells
   ───────────────────────────────────────────────────────────────────────── */

function Variant({
  tag,
  name,
  note,
  children,
}: {
  tag: string;
  name: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <article className="flex w-[360px] shrink-0 flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
          {tag}
        </span>
        <span className="text-sm text-foreground">{name}</span>
      </div>
      <p className="text-[12.5px] leading-relaxed text-muted">{note}</p>
      <PhoneFrame>{children}</PhoneFrame>
    </article>
  );
}

// 360 × 760 — Pixel 7 logical resolution, minus a sliver for chrome. We
// keep the bezel intentionally faint so the eye reads the launcher, not
// the frame.
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-[360px] overflow-hidden border border-border bg-background"
      style={{ height: 760 }}
    >
      {/* Status bar — every variant gets it so the comparison stays honest. */}
      <StatusBar />
      <div className="absolute inset-x-0 top-[28px] bottom-0">{children}</div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="absolute inset-x-0 top-0 flex h-[28px] items-center justify-between px-5 font-mono text-[10px] tabular-nums text-foreground/85">
      <span>09:41</span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden>•</span>
        <span aria-hidden>5G</span>
        <span aria-hidden>·</span>
        <span aria-hidden>87%</span>
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   V1 — Mark + clock
   ───────────────────────────────────────────────────────────────────────── */

function MarkAndClock() {
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-soft">
          Mon · 29 Jun
        </p>
        <h1 className="mt-2 font-mono text-[64px] leading-none tracking-tight tabular-nums text-foreground">
          09:41
        </h1>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <NearstreamMarkAnimated size={180} />
      </div>

      {/* The "letter ticker" — your own latest status line, soft underfoot
          so the launcher has something to say without shouting. */}
      <div className="px-6 pb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
          Letter
        </p>
        <p className="mt-1.5 text-[13px] leading-snug text-foreground/85">
          Working on the launcher. Bench is quiet today.
        </p>
      </div>

      <LauncherDock variant="icon" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   V2 — Reader-as-home
   ───────────────────────────────────────────────────────────────────────── */

function ReaderAsHome() {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-4 pb-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-soft">
          Today &middot; 2 friends posted
        </p>
      </div>

      {/* Most recent post — fills the upper half */}
      <div className="px-5">
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-foreground/22 via-foreground/8 to-foreground/3">
          <span className="absolute right-2 bottom-2 border border-border bg-background/85 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-foreground">
            · 6
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-[14px] font-medium text-foreground">
            Federico Gangemi
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
            today &middot; 09:12
          </span>
        </div>
        <p className="mt-1 text-[13px] text-foreground/85">
          First two weeks at jewellery school
        </p>
      </div>

      {/* Strip of additional cards */}
      <div className="mt-5 px-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
          Earlier
        </p>
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="aspect-square w-24 shrink-0 overflow-hidden border border-border bg-gradient-to-br from-foreground/15 to-foreground/3"
            />
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <LauncherDock variant="mono-icon" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   V3 — Notebook
   ───────────────────────────────────────────────────────────────────────── */

function Notebook() {
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-soft">
          Sunday
        </p>
        <h1 className="mt-3 text-[34px] leading-none tracking-tight text-foreground">
          June 29
        </h1>
      </div>

      <div className="mt-8 px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
          Letter
        </p>
        <p className="mt-2 text-[15px] leading-[1.55] text-foreground">
          Working on the launcher. Bench is quiet today. The rains held off
          so I&rsquo;m walking the canal.
        </p>
      </div>

      <div className="mt-8 px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
          Friends &middot; today
        </p>
        <div className="mt-3 flex flex-col gap-4 border-t border-border pt-4">
          <NotebookSnippet
            author="Federico"
            when="09:12"
            text="First two weeks at jewellery school. Six pieces from the bench."
          />
          <NotebookSnippet
            author="Gosia"
            when="yesterday"
            text="Bellingham at last light. Wanted you to see this."
          />
        </div>
      </div>

      <div className="flex-1" />

      <LauncherDock variant="text-label" />
    </div>
  );
}

function NotebookSnippet({
  author,
  when,
  text,
}: {
  author: string;
  when: string;
  text: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 border-l border-border pl-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
        {author} &middot; {when}
      </p>
      <p className="text-[13px] leading-snug text-foreground/90">{text}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Dock — three flavours used by the three variants
   ───────────────────────────────────────────────────────────────────────── */

function LauncherDock({
  variant,
}: {
  variant: "icon" | "mono-icon" | "text-label";
}) {
  // Pixel-launcher convention: 4–5 items, plus gesture hint for the home
  // bar. We keep four to avoid crowding the mono palette.
  const items: { label: string; glyph: React.ReactNode }[] = [
    { label: "Phone", glyph: <PhoneGlyph /> },
    { label: "Reader", glyph: <ReaderGlyph /> },
    { label: "Studio", glyph: <StudioGlyph /> },
    { label: "Camera", glyph: <CameraGlyph /> },
  ];
  return (
    <div className="border-t border-border pt-3 pb-7">
      <ul className="grid grid-cols-4 px-3">
        {items.map((it) => (
          <li key={it.label} className="flex flex-col items-center gap-1.5">
            {variant === "text-label" ? (
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground">
                {it.label}
              </span>
            ) : (
              <>
                <span
                  className={
                    "flex h-10 w-10 items-center justify-center " +
                    (variant === "icon"
                      ? "rounded-2xl bg-foreground/8 text-foreground"
                      : "text-foreground")
                  }
                >
                  {it.glyph}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-soft">
                  {it.label}
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
      {/* Android home-indicator bar */}
      <div className="mt-4 flex justify-center">
        <span aria-hidden className="block h-[3px] w-24 rounded-full bg-foreground/40" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Tiny mono glyphs. Hand-rolled SVG so they match the rest of the chrome
   (mode glyphs / nav icons elsewhere in the codebase use the same line
   weight + stroke).
   ───────────────────────────────────────────────────────────────────────── */

function PhoneGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-5 w-5">
      <path d="M5 4.5l3 .5 1 4-2 1.5c1 2.5 3 4.5 5.5 5.5l1.5-2 4 1 .5 3-2 2c-7 0-13-6-13-13l1.5-2.5z" />
    </svg>
  );
}

function ReaderGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-5 w-5">
      <path d="M4 6h16M4 11h16M4 16h10" />
    </svg>
  );
}

function StudioGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-5 w-5">
      <path d="M4 20l4-1 10-10-3-3L5 16l-1 4z" />
      <path d="M14 6l3 3" />
    </svg>
  );
}

function CameraGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-5 w-5">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <circle cx="12" cy="13.5" r="3.5" />
      <path d="M9 7l1.5-2h3L15 7" />
    </svg>
  );
}
