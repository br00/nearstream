import { PageShell } from "@/app/_components/page-shell";
import { Kicker } from "@/app/_components/kicker";
import { Button } from "@/app/_components/button";
import { Input } from "@/app/_components/input";
import { Textarea } from "@/app/_components/textarea";
import { TagChip } from "@/app/_components/tag-chip";
import { ModeRadioGroup } from "@/app/_components/mode-radio";
import {
  NearstreamMark,
  NearstreamLockup,
} from "@/app/_components/nearstream-mark";
import { MODE_TAGS, DEFAULT_MODE } from "@/schemas/stream";

export const metadata = {
  title: "Design · Nearstream",
};

const swatches = [
  { name: "background", token: "--background", hex: "#000000" },
  { name: "foreground", token: "--foreground", hex: "#e4e4e7" },
  { name: "muted", token: "--muted", hex: "#a1a1aa" },
  { name: "muted-soft", token: "--muted-soft", hex: "#71717a" },
  { name: "border", token: "--border", hex: "#27272a" },
];

export default function DesignPage() {
  return (
    <PageShell>
      <section className="flex flex-1 justify-center px-6">
        <div className="w-full max-w-3xl py-12 space-y-20">
          <header>
            <Kicker>Design</Kicker>
            <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
              Nearstream chrome
            </h1>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">
              The shared room. These components are the platform identity —
              every Nearstream instance carries them. The user’s site (Phase 2)
              gets its own palette and templates, separate from this layer.
            </p>
          </header>

          <Section title="Colors">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {swatches.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center gap-3 border border-border p-3"
                >
                  <span
                    className="block h-10 w-10 shrink-0 border border-border"
                    style={{ background: s.hex }}
                  />
                  <div className="font-mono text-[11px] uppercase tracking-[0.15em]">
                    <div className="text-foreground">{s.name}</div>
                    <div className="text-muted-soft">{s.hex}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Type">
            <div className="space-y-6">
              <Row label="Kicker (soft)">
                <Kicker>Section label</Kicker>
              </Row>
              <Row label="Kicker (default)">
                <Kicker tone="default">More prominent</Kicker>
              </Row>
              <Row label="Headline">
                <h2 className="text-2xl font-normal tracking-tight text-foreground">
                  A quieter way to share
                </h2>
              </Row>
              <Row label="Body 17">
                <p className="text-[17px] leading-relaxed text-foreground">
                  Pushed v0.4 of the reader. Filter chips finally land where
                  they should.
                </p>
              </Row>
              <Row label="Body 15">
                <p className="text-[15px] leading-relaxed text-foreground/90">
                  Found the bug in RSS parsing. It was a BOM. It is always a
                  BOM.
                </p>
              </Row>
              <Row label="Body sm muted">
                <p className="text-sm leading-relaxed text-muted">
                  A magic link will arrive in your inbox. The link expires in
                  15 minutes.
                </p>
              </Row>
              <Row label="Mono meta">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                  today · 14:33
                </span>
              </Row>
            </div>
          </Section>

          <Section title="Brand mark">
            <div className="flex flex-wrap items-center gap-10">
              <div className="flex flex-col items-center gap-2">
                <NearstreamMark size={64} />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
                  64
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <NearstreamMark size={40} />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
                  40
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <NearstreamMark size={24} />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
                  24
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <NearstreamLockup size={24} />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
                  lockup
                </span>
              </div>
            </div>
          </Section>

          <Section title="Buttons">
            <div className="flex flex-wrap items-center gap-4">
              <Button>Default</Button>
              <Button disabled>Disabled</Button>
              <Button>Send link</Button>
              <Button>Post</Button>
            </div>
            <p className="mt-3 text-sm text-muted-soft">
              Form submissions use{" "}
              <code className="font-mono text-foreground">SubmitButton</code>{" "}
              (auto-disables on submit) — same visual.
            </p>
          </Section>

          <Section title="Input">
            <div className="flex flex-col gap-2">
              <Kicker>Email</Kicker>
              <Input
                type="email"
                placeholder="you@example.com"
                defaultValue=""
              />
            </div>
          </Section>

          <Section title="Textarea">
            <div className="flex flex-col gap-2">
              <Kicker>Entry</Kicker>
              <Textarea
                rows={4}
                placeholder="What are you doing right now?"
                defaultValue=""
              />
            </div>
          </Section>

          <Section title="Mode tags">
            <div className="space-y-6">
              <div>
                <Kicker>Display</Kicker>
                <div className="mt-2 flex flex-wrap gap-2">
                  {MODE_TAGS.map((mode) => (
                    <TagChip key={mode.value}>{mode.value}</TagChip>
                  ))}
                </div>
              </div>
              <div>
                <Kicker>Picker</Kicker>
                <form className="mt-3">
                  <ModeRadioGroup current={DEFAULT_MODE} name="design_demo" />
                </form>
              </div>
            </div>
          </Section>

          <Section title="Timeline entry">
            <ul className="border-l border-border pl-6">
              <li className="relative">
                <span className="absolute -left-[29px] top-2 inline-block h-1 w-1 rounded-full bg-foreground/70" />
                <div className="flex flex-wrap items-center gap-3">
                  <time className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted tabular-nums">
                    today · 14:33
                  </time>
                  <TagChip>Writing</TagChip>
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-foreground/90">
                  Started a new essay on ownership and the small web.
                  Sketching, not drafting.
                </p>
              </li>
            </ul>
          </Section>
        </div>
      </section>
    </PageShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <Kicker tone="default">{title}</Kicker>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-[140px_1fr] md:items-baseline">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}
