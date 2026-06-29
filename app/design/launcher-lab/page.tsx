import Link from "next/link";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { Kicker } from "@/app/_components/kicker";
import { NearstreamMarkAnimated } from "@/app/_components/site/nearstream-mark-animated";

export const metadata = {
  title: "Launcher lab · Nearstream",
  robots: { index: false, follow: false },
};

// A minimal Android launcher with the Nearstream visual DNA — moving
// points, pure mono palette, tiny type, generous emptiness. Not a
// Nearstream-content launcher (no reader / letter / friends). The
// interesting design problem is *how do you represent apps* when an icon
// grid is the thing you're trying not to be.
//
// Four directions, each takes a different swing at that:
//
//   V1 — Apps as constellation. Home is a sparse sky of dots. Each dot
//        is an app; size = use frequency. Tap a dot, the label fades in,
//        tap again to launch. The animated mark anchors the corner so the
//        whole screen reads as one drifting field.
//
//   V2 — Apps as orbit. The Nearstream `>` mark is centred and animated.
//        Apps live as satellites in slow orbital rings around it.
//        Selecting a ring reveals the apps in that orbit. The launcher
//        *is* the mark, just zoomed out.
//
//   V3 — Apps as terminal. No grid, no icons, no orbit. The home screen
//        is mono time + a single underline cursor. Start typing → apps
//        filter as a list. Empty input = clock. Most ascetic.
//
//   V4 — Apps as filmstrip. A single vertical column of app names in
//        mono caps, scroll-snap one per page. Each app gets a full screen
//        when "tuned in" — name + a tiny live signal (last opened, last
//        notification). The animated mark sits as a tuning needle.
//
// All four share the chrome: status bar, gesture bar, mono time. None
// show app icons. None use color beyond the foreground/border tokens.

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
            Minimal Android launcher &mdash; moving points DNA
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
            A launcher with the Nearstream aesthetic, not Nearstream
            content. Same identity (mono palette, moving points, tiny
            type) applied to the universal launcher problem. The
            interesting question is how to represent apps when an icon
            grid is the thing you&rsquo;re trying not to be.
          </p>

          <div className="mt-12 flex gap-6 overflow-x-auto pb-6">
            <Variant
              tag="V1"
              name="Apps as constellation"
              note="Home is a sparse sky of dots. Each dot is an app — size encodes how often you use it. Tap to reveal label, tap to launch. The animated `>` mark anchors the bottom-right corner."
            >
              <Constellation />
            </Variant>

            <Variant
              tag="V2"
              name="Apps as orbit"
              note="The animated mark is centred and big. Apps orbit it on slow rings — closer ring = more used. Tap a satellite to highlight; tap again to launch. The launcher *is* the mark, expanded."
            >
              <Orbit />
            </Variant>

            <Variant
              tag="V3"
              name="Apps as terminal"
              note="No grid, no icons. Big mono clock and a single underscore cursor. Start typing — apps filter in as a list. Empty input = clock. Most ascetic of the four; most useful if you have ~50 apps."
            >
              <Terminal />
            </Variant>

            <Variant
              tag="V4"
              name="Apps as filmstrip"
              note="A vertical column of app names in mono caps. Scroll-snaps one per page; each app gets the full screen when tuned in. The mark plays the role of a tuning needle on the right edge."
            >
              <Filmstrip />
            </Variant>
          </div>

          <p className="mt-12 max-w-xl text-sm leading-relaxed text-muted">
            <strong className="text-foreground">My read:</strong> V2 (orbit)
            is the strongest visual hook for a LinkedIn post &mdash; the
            mark is the personality, and orbiting apps is a literal
            translation of &ldquo;moving points.&rdquo; V3 is the most
            usable. V1 is the most ambient. V4 is the most genuinely
            different from any launcher you&rsquo;ve seen.
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

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-[360px] overflow-hidden border border-border bg-background"
      style={{ height: 760 }}
    >
      <StatusBar />
      <div className="absolute inset-x-0 top-[28px] bottom-0">{children}</div>
      <HomeIndicator />
    </div>
  );
}

function StatusBar() {
  return (
    <div className="absolute inset-x-0 top-0 z-10 flex h-[28px] items-center justify-between px-5 font-mono text-[10px] tabular-nums text-foreground/85">
      <span>09:41</span>
      <span aria-hidden>5G &middot; 87%</span>
    </div>
  );
}

function HomeIndicator() {
  return (
    <div className="absolute inset-x-0 bottom-2 z-10 flex justify-center">
      <span
        aria-hidden
        className="block h-[3px] w-24 rounded-full bg-foreground/40"
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   V1 — Constellation
   ───────────────────────────────────────────────────────────────────────── */

// Hand-placed constellation. Each entry is (x%, y%, sizeIdx) — size 0..3,
// 0 = whisper (rarely used), 3 = "highlighted" (most used). One entry per
// app slot in this mock; in production we'd derive these from usage stats.
const CONSTELLATION: { x: number; y: number; size: 0 | 1 | 2 | 3; label?: string }[] = [
  { x: 22, y: 18, size: 1, label: "Maps" },
  { x: 48, y: 12, size: 2, label: "Notes" },
  { x: 74, y: 22, size: 3, label: "Camera" },
  { x: 18, y: 36, size: 0 },
  { x: 56, y: 40, size: 2, label: "Phone" },
  { x: 80, y: 48, size: 1, label: "Music" },
  { x: 38, y: 52, size: 3, label: "Messages" },
  { x: 12, y: 60, size: 2, label: "Calendar" },
  { x: 64, y: 64, size: 1, label: "Mail" },
  { x: 32, y: 72, size: 0 },
  { x: 50, y: 80, size: 1, label: "Files" },
  { x: 76, y: 78, size: 2, label: "Reader" },
];

function Constellation() {
  return (
    <div className="relative h-full">
      <div className="absolute inset-x-0 top-3 px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-soft">
          Mon &middot; 29 Jun
        </p>
        <h1 className="mt-2 font-mono text-[44px] leading-none tracking-tight tabular-nums text-foreground">
          09:41
        </h1>
      </div>

      {/* The sky. Dots positioned by %; sizes encode use-frequency. */}
      <div className="absolute inset-0 top-[110px] bottom-[80px]">
        {CONSTELLATION.map((p, i) => {
          const dim =
            p.size === 0
              ? "h-1 w-1 bg-foreground/30"
              : p.size === 1
                ? "h-1.5 w-1.5 bg-foreground/55"
                : p.size === 2
                  ? "h-2 w-2 bg-foreground/80"
                  : "h-2.5 w-2.5 bg-foreground";
          return (
            <span
              key={i}
              aria-hidden
              className={`absolute rounded-full ${dim}`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            />
          );
        })}
        {/* Label for the currently-selected app (mock: the highlighted one). */}
        <p
          className="absolute font-mono text-[10px] uppercase tracking-[0.22em] text-foreground"
          style={{ left: "44%", top: "53%" }}
        >
          Messages →
        </p>
      </div>

      {/* The animated mark — anchored bottom-right corner. */}
      <div className="absolute bottom-12 right-5">
        <NearstreamMarkAnimated size={64} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   V2 — Orbit
   ───────────────────────────────────────────────────────────────────────── */

const ORBIT_RINGS: { radius: number; apps: { angle: number; label: string }[] }[] = [
  {
    radius: 70,
    apps: [
      { angle: -30, label: "Phone" },
      { angle: 60, label: "Messages" },
      { angle: 150, label: "Camera" },
      { angle: 230, label: "Music" },
    ],
  },
  {
    radius: 110,
    apps: [
      { angle: 10, label: "Notes" },
      { angle: 95, label: "Mail" },
      { angle: 180, label: "Calendar" },
      { angle: 275, label: "Maps" },
    ],
  },
  {
    radius: 150,
    apps: [
      { angle: -10, label: "Files" },
      { angle: 70, label: "Photos" },
      { angle: 145, label: "Settings" },
      { angle: 215, label: "Reader" },
      { angle: 290, label: "Wallet" },
    ],
  },
];

function Orbit() {
  return (
    <div className="relative flex h-full flex-col">
      <div className="px-6 pt-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-soft">
          Mon &middot; 29 Jun
        </p>
      </div>

      {/* Centre: the animated mark + orbits. Position relative so absolute
          children (rings, app dots) can be hung off centre. */}
      <div className="relative flex flex-1 items-center justify-center">
        <div className="relative" style={{ width: 320, height: 320 }}>
          {/* Orbit rings — drawn at the centre of this box. */}
          {ORBIT_RINGS.map((r) => (
            <span
              key={r.radius}
              aria-hidden
              className="absolute left-1/2 top-1/2 rounded-full border border-foreground/15"
              style={{
                width: r.radius * 2,
                height: r.radius * 2,
                marginLeft: -r.radius,
                marginTop: -r.radius,
              }}
            />
          ))}

          {/* App dots — each orbit places its apps around the ring. */}
          {ORBIT_RINGS.map((r) =>
            r.apps.map((app, i) => {
              const rad = (app.angle * Math.PI) / 180;
              const ax = Math.cos(rad) * r.radius;
              const ay = Math.sin(rad) * r.radius;
              return (
                <div
                  key={`${r.radius}-${i}`}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: `calc(50% + ${ax}px)`,
                    top: `calc(50% + ${ay}px)`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <span
                    aria-hidden
                    className="block h-1.5 w-1.5 rounded-full bg-foreground/85"
                  />
                  <span className="mt-1 whitespace-nowrap font-mono text-[8px] uppercase tracking-[0.18em] text-muted-soft">
                    {app.label}
                  </span>
                </div>
              );
            }),
          )}

          {/* The mark — centred. The orbit dots are explicitly NOT
              animated in this mock; the animation lives in the mark
              itself. In a real launcher each orbit would also spin
              slowly. */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <NearstreamMarkAnimated size={120} />
          </div>
        </div>
      </div>

      {/* Tuned-in app + clock as a soft bottom strip. */}
      <div className="px-6 pb-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
          09:41 &middot; Phone selected
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground">
          tap again to launch
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   V3 — Terminal
   ───────────────────────────────────────────────────────────────────────── */

function Terminal() {
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-soft">
          Mon &middot; 29 Jun
        </p>
        <h1 className="mt-3 font-mono text-[88px] leading-none tracking-tight tabular-nums text-foreground">
          09:41
        </h1>
      </div>

      <div className="mt-10 px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
          Type to find an app
        </p>
        <div className="mt-3 flex items-baseline gap-2 border-b border-border pb-2">
          <span className="font-mono text-[24px] tabular-nums text-foreground">
            mes
          </span>
          <span
            aria-hidden
            className="block h-6 w-[10px] animate-pulse bg-foreground"
          />
        </div>
      </div>

      <div className="mt-6 px-6">
        <ul className="flex flex-col gap-2 font-mono text-[14px] uppercase tracking-[0.22em] text-foreground">
          <li className="flex items-baseline justify-between border border-foreground bg-foreground/5 px-3 py-2">
            <span>Messages</span>
            <span className="text-[9px] tracking-[0.18em] text-muted-soft">
              ↵ launch
            </span>
          </li>
          <li className="px-3 py-2 text-muted">
            Mes&shy;senger
          </li>
          <li className="px-3 py-2 text-muted-soft">
            Mes&shy;sage&shy;board
          </li>
        </ul>
      </div>

      <div className="flex-1" />

      {/* Tiny mark in the corner so the launcher still has its identity. */}
      <div className="px-6 pb-12">
        <NearstreamMarkAnimated size={32} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   V4 — Filmstrip
   ───────────────────────────────────────────────────────────────────────── */

const FILMSTRIP_APPS = [
  { name: "Phone", signal: "last open · 02:14 today" },
  { name: "Messages", signal: "3 unread" },
  { name: "Camera", signal: "last shot · yesterday" },
  { name: "Music", signal: "paused · Bonobo" },
  { name: "Notes", signal: "today's note ·  in progress" },
  { name: "Maps", signal: "last search · Bellingham" },
];

function Filmstrip() {
  // Mock the "tuned in" position — the middle item is the active one.
  const activeIndex = 2;
  return (
    <div className="relative flex h-full flex-col">
      <div className="px-6 pt-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-soft">
          Mon &middot; 29 Jun &middot; 09:41
        </p>
      </div>

      {/* The strip — vertical, each entry gets a "tuning frame". The
          centre one is large + has a signal line; the rest fade to
          mute. */}
      <div className="mt-8 flex flex-1 flex-col justify-center pl-8 pr-16">
        {FILMSTRIP_APPS.map((app, i) => {
          const distance = Math.abs(i - activeIndex);
          if (distance === 0) {
            return (
              <div key={app.name} className="py-3">
                <p className="font-mono text-[32px] leading-none tracking-tight uppercase text-foreground">
                  {app.name}
                </p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
                  {app.signal}
                </p>
              </div>
            );
          }
          const opacity =
            distance === 1
              ? "text-foreground/50"
              : distance === 2
                ? "text-foreground/25"
                : "text-foreground/10";
          return (
            <p
              key={app.name}
              className={`py-1.5 font-mono text-[20px] leading-none uppercase tracking-tight ${opacity}`}
            >
              {app.name}
            </p>
          );
        })}
      </div>

      {/* Tuning needle — the mark sits on the right edge, vertically
          centred. In a real launcher it would line up with whatever is
          centred on the strip. */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <NearstreamMarkAnimated size={48} />
      </div>

      <div className="pb-12 pl-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
          scroll &middot; tap to launch
        </p>
      </div>
    </div>
  );
}
