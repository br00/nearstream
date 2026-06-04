import Link from "next/link";
import { PageShell } from "@/app/_components/page-shell";
import { Kicker } from "@/app/_components/kicker";
import {
  HumanCircle,
  type HumanCircleVariant,
} from "@/app/_components/site/human-circle";

export const metadata = {
  title: "Human circle · variants · Nearstream",
};

const VARIANTS: { name: HumanCircleVariant; label: string; note: string }[] = [
  {
    name: "charcoal",
    label: "Charcoal",
    note: "Single thick stroke, clear between attempts. Lowest contrast, most ink-like.",
  },
  {
    name: "ink",
    label: "Ink",
    note: "Thinner line with shadowBlur for fuzzy edges. Slightly more visible.",
  },
  {
    name: "bristle",
    label: "Bristle",
    note: "Six stacked thin strokes per segment with random offsets — pen-bristle feel.",
  },
  {
    name: "ephemeral",
    label: "Ephemeral",
    note: "Like Charcoal, but each finished circle dissolves into the black before the next attempt.",
  },
  {
    name: "buildup",
    label: "Buildup",
    note: "Current production version — fine strokes accumulate over many cycles into a density field.",
  },
];

export default function HumanCirclePreviewPage() {
  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      rightNav={
        <Link href="/" className={navLinkClasses}>
          ← Home
        </Link>
      }
    >
      <section className="flex flex-1 justify-center px-6">
        <div className="w-full max-w-5xl py-12">
          <Kicker>Preview</Kicker>
          <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
            Human circle — variants
          </h1>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
            Pick a feel and tell me which one to wire into the home page.
            Each canvas runs the same algorithm; the difference is how the
            stroke is painted and whether old attempts persist.
          </p>

          <ul className="mt-16 grid grid-cols-1 gap-12 sm:grid-cols-2">
            {VARIANTS.map((v) => (
              <li key={v.name} className="flex flex-col">
                <div className="border border-border bg-foreground/[0.02]">
                  <HumanCircle
                    variant={v.name}
                    className="block aspect-square w-full"
                  />
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-4">
                  <h2 className="text-base font-normal tracking-tight text-foreground">
                    {v.label}
                  </h2>
                  <code className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
                    {v.name}
                  </code>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {v.note}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
