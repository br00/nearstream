import Link from "next/link";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { Kicker } from "@/app/_components/kicker";
import { HumanCircle, AnimatedMark } from "@/app/_components/site/human-circle";

export const metadata = {
  title: "Launcher lab · Nearstream",
  robots: { index: false, follow: false },
};

// Minimal Android launcher with the Nearstream visual DNA — moving
// points, mono palette, tiny type, generous emptiness. Round 2: the
// chevron mark is out, the *human-circle* (Alessandro's moving.points
// signature) is in. It reads as more organic — a breathing cloud rather
// than a chevron shape — which suits the launcher's role as ambient
// chrome.
//
// Three takes on representing apps without an icon grid, each using the
// human-circle in a different structural role:
//
//   V1 — Terminal. Big mono clock + a single underscore cursor. Start
//        typing → apps filter as a list. The human-circle is a tiny
//        signature stamp in the bottom corner.
//
//   V2 — Filmstrip. Vertical column of app names in mono caps,
//        scroll-snaps one at a time. The "tuned in" app gets a big
//        name and a live signal line. The human-circle plays the role
//        of a tuning indicator on the right edge.
//
//   V3 — Field. The human-circle takes over the whole screen — softly,
//        as a breathing cloud behind everything. Clock and a small list
//        of recents float above. The "apps" emerge from the cloud the
//        way they would from looking at a real landscape: ambient until
//        you focus on one.

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
            Minimal Android launcher &mdash; human-circle DNA
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
            Round 2: the chevron mark is out, the human-circle (the
            moving.points signature) is in. It&rsquo;s more organic at
            launcher scale &mdash; reads as a breathing cloud rather than
            a logo, which is the right vibe for ambient chrome.
          </p>

          <div className="mt-12 flex gap-6 overflow-x-auto pb-6">
            <Variant
              tag="V1"
              name="Terminal"
              note="No grid, no icons. Big mono clock + single underscore cursor. Type → apps filter as a list. The human-circle is a tiny signature stamp in the corner. Most ascetic; most useful for power users."
            >
              <Terminal />
            </Variant>

            <Variant
              tag="V2"
              name="Filmstrip"
              note="Vertical column of app names in mono caps, scroll-snaps one per page. The tuned-in app gets a big name + a live signal line. The human-circle floats on the right edge as a tuning indicator that breathes with the active app."
            >
              <Filmstrip />
            </Variant>

            <Variant
              tag="V3"
              name="Field"
              note="The human-circle takes over the whole screen, softly, as a breathing cloud behind everything. Clock + a small list of recent apps float above. Apps emerge from the cloud the way they would from a landscape: ambient until you focus on one."
            >
              <Field />
            </Variant>
          </div>

          <p className="mt-12 max-w-xl text-sm leading-relaxed text-muted">
            <strong className="text-foreground">My read:</strong> V3 Field
            is the strongest LinkedIn hero shot &mdash; it&rsquo;s the
            most &ldquo;moving.points&rdquo; in pure form. V2 Filmstrip is
            the most usable as a real launcher. V1 Terminal is the most
            different from anything else on the market.
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
    <div className="absolute inset-x-0 top-0 z-20 flex h-[28px] items-center justify-between px-5 font-mono text-[10px] tabular-nums text-foreground/85">
      <span>09:41</span>
      <span aria-hidden>5G &middot; 87%</span>
    </div>
  );
}

function HomeIndicator() {
  return (
    <div className="absolute inset-x-0 bottom-2 z-20 flex justify-center">
      <span
        aria-hidden
        className="block h-[3px] w-24 rounded-full bg-foreground/40"
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   V1 — Terminal
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

      {/* Tiny human-circle stamp in the corner — the launcher signature. */}
      <div className="px-6 pb-12">
        <HumanCircle size={48} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   V2 — Filmstrip
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
  const activeIndex = 2;
  return (
    <div className="relative flex h-full flex-col">
      <div className="px-6 pt-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-soft">
          Mon &middot; 29 Jun &middot; 09:41
        </p>
      </div>

      <div className="mt-8 flex flex-1 flex-col justify-center pl-8 pr-20">
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

      {/* Tuning indicator — the human-circle on the right edge,
          vertically centred against the tuned-in app. Slightly slowed
          and densified vs the default params so it reads as ambient
          rather than busy. */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <AnimatedMark
          size={72}
          params={{ seedSpeed: 0.0014, angleStep: 0.018 }}
          ariaLabel="Tuning indicator"
        />
      </div>

      <div className="pb-12 pl-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
          scroll &middot; tap to launch
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   V3 — Field
   The human-circle fills the screen as a slow breathing cloud; apps and
   clock float on top in mono, faintly bordered so they read against the
   field without fighting it.
   ───────────────────────────────────────────────────────────────────────── */

function Field() {
  return (
    <div className="relative h-full">
      {/* The cloud. Bigger than the frame, centred, slower morph — so it
          fills the negative space without distracting from the content
          on top. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <AnimatedMark
          size={520}
          params={{
            seedSpeed: 0.0012,
            angleStep: 0.009,
            baseRadiusFrac: 0.55,
            radiusRangeFrac: 0.18,
          }}
          ariaLabel="Field"
        />
      </div>

      {/* Foreground — clock + small list of recents. Floats on top. The
          inner box uses no fill so the cloud reads through it. */}
      <div className="relative z-10 flex h-full flex-col">
        <div className="px-6 pt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-foreground/70">
            Mon &middot; 29 Jun
          </p>
          <h1 className="mt-2 font-mono text-[56px] leading-none tracking-tight tabular-nums text-foreground mix-blend-normal">
            09:41
          </h1>
        </div>

        <div className="flex-1" />

        {/* Recents — a quiet list, mono caps. The 'cloud' is loudest
            here so the text needs the strongest contrast. */}
        <div className="px-6 pb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-foreground/70">
            Recent
          </p>
          <ul className="mt-3 flex flex-col gap-1.5 font-mono text-[14px] uppercase tracking-[0.22em] text-foreground">
            <li>Messages</li>
            <li className="text-foreground/70">Notes</li>
            <li className="text-foreground/50">Camera</li>
            <li className="text-foreground/30">Maps</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
