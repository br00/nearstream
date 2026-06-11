import Link from "next/link";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup, NearstreamMark } from "@/app/_components/nearstream-mark";
import { Kicker } from "@/app/_components/kicker";
import {
  LogoHelix,
  LogoPulse,
  LogoSpin,
  LogoHalos,
  LogoSwarm,
} from "@/app/_components/site/logo-lab";

export const metadata = {
  title: "Logo lab · Nearstream",
  robots: { index: false, follow: false },
};

// Sandbox for the animated `>` mark. Five takes side-by-side so we can pick
// one (or none) without touching the live empty-state on /reader. Each tile
// is the existing chevron shape with a different motion interpretation.

type VariantProps = {
  name: string;
  description: string;
  children: React.ReactNode;
};

function Variant({ name, description, children }: VariantProps) {
  return (
    <article className="flex flex-col gap-4">
      <div
        className="flex aspect-square w-full items-center justify-center border border-border bg-black"
      >
        {children}
      </div>
      <div>
        <Kicker>{name}</Kicker>
        <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
      </div>
    </article>
  );
}

export default function LogoLabPage() {
  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      leftNav={<NearstreamLockup size={24} className="text-foreground" />}
      rightNav={
        <Link href="/design" className={navLinkClasses}>
          ← Design
        </Link>
      }
    >
      <section className="flex flex-1 justify-center px-6 py-16">
        <div className="w-full max-w-4xl">
          <Kicker>Logo lab</Kicker>
          <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
            Animated mark — five takes
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
            All five preserve the existing `&gt;` chevron from{" "}
            <code className="font-mono text-foreground">NearstreamMark</code>,
            but apply a different motion or depth interpretation. White dots,
            black ground, opacity carries the 3D feel. Refresh to re-randomize
            the start phase.
          </p>

          <div className="mt-12 flex items-end gap-6 border-b border-border pb-6">
            <div className="flex flex-col gap-2">
              <Kicker>Static reference</Kicker>
              <div className="flex aspect-square w-40 items-center justify-center border border-border bg-black">
                <NearstreamMark size={120} className="text-foreground" />
              </div>
            </div>
            <p className="pb-2 text-xs leading-relaxed text-muted-soft">
              The current static mark. Each animated variant below should still
              read as this shape on first glance.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-12 sm:grid-cols-2">
            <Variant
              name="A — Helix"
              description="Each chevron point has a partner dot orbiting it on a tilted axis. The pair reads as a DNA base pair; opacity carries the depth (front partner brighter, back partner dimmer). The whole thing reads as one spiraling thread."
            >
              <LogoHelix size={180} />
            </Variant>

            <Variant
              name="B — Pulse"
              description="Static chevron, a brightness wave travels through it. Each dot's opacity + radius is modulated by a sine whose phase shifts along the path — reads as a calm signal moving through the mark."
            >
              <LogoPulse size={180} />
            </Variant>

            <Variant
              name="C — Spin"
              description="The whole chevron rotates around its vertical mid-axis. Each anchor's horizontal position oscillates relative to the apex line; opacity fades when the dot is on the back side. Reads as a 3D chevron turning."
            >
              <LogoSpin size={180} />
            </Variant>

            <Variant
              name="D — Halos"
              description="Each anchor pulses 2–3 concentric translucent halos on offset phases — layers of breath stacking. The shape stays put; depth comes entirely from layered alpha. The quietest of the five."
            >
              <LogoHalos size={180} />
            </Variant>

            <Variant
              name="E — Swarm"
              description="Each anchor is a faint dot with a swarm of tiny satellites orbiting it. The chevron emerges from the swarm's density rather than from fixed positions — reads as a constellation slowly settling into shape."
            >
              <LogoSwarm size={180} />
            </Variant>
          </div>

          <div className="mt-16 border-t border-border pt-8">
            <p className="text-xs text-muted-soft">
              Tell me which one (or none) — I&rsquo;ll wire it into{" "}
              <code className="font-mono">/reader</code> empty states and
              delete the other four.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
