import Link from "next/link";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup, NearstreamMark } from "@/app/_components/nearstream-mark";
import { Kicker } from "@/app/_components/kicker";
import {
  LogoFinal,
  LogoHelix,
  LogoSwarm,
} from "@/app/_components/site/logo-lab";

export const metadata = {
  title: "Logo lab · Nearstream",
  robots: { index: false, follow: false },
};

// Sandbox for the animated `>` mark. Three live takes side-by-side: the
// lead candidate ("Final") on top, with its two parents (A — Helix, E —
// Swarm) underneath so we can compare what made it through. Doesn't touch
// the live empty state on /reader.

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
            Animated mark — lead candidate
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
            Final = A&rsquo;s helix backbone (DNA base-pair orbit per anchor)
            with E&rsquo;s tiny dust satellites layered underneath. The two
            parents are below for direct comparison.
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

          <div className="mt-12">
            <div className="flex flex-col gap-4">
              <div className="flex aspect-square w-full max-w-md items-center justify-center border border-foreground/40 bg-black">
                <LogoFinal size={260} />
              </div>
              <div>
                <Kicker>Final — Helix + dust</Kicker>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                  Helix backbone gives the chevron its 3D spiraling-thread
                  feel; two tiny low-opacity satellites per anchor sit
                  underneath as quiet dust. Anchors always at full opacity
                  so the chevron shape never dissolves.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16 border-t border-border pt-12">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-soft">
              Parents — for comparison
            </p>
            <div className="mt-8 grid grid-cols-1 gap-12 sm:grid-cols-2">
              <Variant
                name="A — Helix (base)"
                description="DNA base-pair orbit per anchor. Same backbone as Final, without the dust."
              >
                <LogoHelix size={180} />
              </Variant>
              <Variant
                name="E — Swarm (dust source)"
                description="Where Final's tiny satellites came from. Subtler and smaller in Final because the helix is already doing the depth work."
              >
                <LogoSwarm size={180} />
              </Variant>
            </div>
          </div>

          <div className="mt-16 border-t border-border pt-8">
            <p className="text-xs text-muted-soft">
              Happy with Final? I&rsquo;ll wire it into{" "}
              <code className="font-mono">/reader</code> empty states and
              delete the lab + the other variants.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
