// Structured manifesto — rebuilt 2026-06-11 to mirror the schematic
// layout of the original NEARSTREAM.html (numbered sections, lexicon
// grid, decisions-as-cards, anti-aspirations grid) inside Nearstream
// chrome (pure mono palette, no green/blue/pink accents). Replaces the
// previous `marked → HTML` render of NEARSTREAM.md so the public-facing
// manifesto reads as curated content, not raw working doc.
//
// Source of truth for content lives here. NEARSTREAM.md stays in the
// repo as the working doc (decisions log + raw thinking); sync when
// noteworthy decisions land.

import Link from "next/link";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";

export const metadata = {
  title: "Manifesto · Nearstream",
  description:
    "A shared journal between close friends — concept, lexicon, architecture, decisions, build phases.",
};

export default function ManifestoPage() {
  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      leftNav={<NearstreamLockup size={24} className="text-foreground" />}
      rightNav={
        <Link href="/about" className={navLinkClasses}>
          About
        </Link>
      }
    >
      <DocHeader />
      <main className="mx-auto w-full max-w-3xl px-6 pt-16 pb-24">
        <Section number="00" title="Concept">
          <Philosophy>
            A small group of close friends each own a personal site. Each site
            is their stream — daily life, work, ideas, photos. A shared reader
            pulls everyone&rsquo;s stream together. No algorithm. No public.
            No likes. It accumulates quietly over time, like a shared journal
            you can all write in.
          </Philosophy>

          <p>
            The problem with existing social networks: they bundled personal
            publishing and content aggregation together, and optimised for
            platform growth — not for the person.{" "}
            <strong>
              Nearstream unbundles these two layers and returns ownership to
              the individual.
            </strong>
          </p>

          <p>
            The closest existing movement is <strong>IndieWeb</strong>{" "}
            (indieweb.org) — a community building exactly this since 2011. The
            reason it never reached normal people: too technical to set up,
            built by developers for developers. The cost structure of building
            tooling has shifted, which is why this is approachable now.
          </p>

          <p className="text-foreground/85 italic">
            Nearstream is not trying to be the next anything. It&rsquo;s trying
            to be the next <strong>nothing</strong> — the platform that
            doesn&rsquo;t try to grow into your life. Start small. Stay small
            per instance. Spread by codebase, not by user count.
          </p>
        </Section>

        <Section number="01" title="Lexicon">
          <p>The load-bearing terms. If we use a word, it&rsquo;s defined here.</p>
          <LexiconGrid items={LEXICON} />
        </Section>

        <Section number="02" title="Architecture">
          <p>
            Three valid framings — they describe different cuts of the same
            thing. <em>How does data move?</em> (data flow) ·{" "}
            <em>What do users control?</em> (freedom budget) ·{" "}
            <em>Who runs what?</em> (tracks + protocol).
          </p>

          <Subhead>Data flow</Subhead>
          <Diagram>
            <DiagramCaption>
              {"// Each friend has their own site. The reader is yours alone."}
            </DiagramCaption>
            <div className="grid gap-3 text-sm">
              <DiagramRow>
                <DiagramNode>friend_a.com</DiagramNode>
                <span className="text-muted-soft">→ RSS →</span>
                <DiagramNode emphasis>your reader</DiagramNode>
                <span className="text-muted-soft">→</span>
                <DiagramNode>your screen</DiagramNode>
              </DiagramRow>
              <DiagramRow>
                <DiagramNode>friend_b.com</DiagramNode>
                <span className="text-muted-soft">→ RSS →</span>
                <span className="text-muted-soft">{"↑"}</span>
              </DiagramRow>
              <DiagramRow>
                <DiagramNode>you.com</DiagramNode>
                <span className="text-muted-soft">→ RSS →</span>
                <span className="text-muted-soft">{"↑"}</span>
              </DiagramRow>
            </div>
          </Diagram>

          <Subhead>Freedom budget</Subhead>
          <p>
            Freedom is <strong>budgeted</strong>: a lot in some places, none in
            others. The whole architecture rests on this discipline.
          </p>
          <div className="mt-6 flex flex-col gap-px">
            {FREEDOM_LAYERS.map((l) => (
              <FreedomLayer key={l.layer} {...l} />
            ))}
          </div>
          <p className="mt-6">
            <strong>The discipline that makes this work:</strong> the reader is
            Nearstream&rsquo;s territory; the site is the user&rsquo;s
            territory. Neither invades the other. If users redesign the reader,
            the network feels fragmented. If they can&rsquo;t shape their site,
            it&rsquo;s a blog and they go back to Squarespace.
          </p>

          <Subhead>Two tracks + one protocol</Subhead>
          <p>
            Nearstream is <strong>two tracks bound by one protocol</strong>.
            The protocol is the only load-bearing contract — RSS 2.0 with a
            small typed-primitive namespace. Anyone who publishes that format
            appears in any reader.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <TrackCard
              label="Track 1 · Hosted"
              body="Multi-tenant instance someone operates. Friends sign up, get an account, post."
              audience="For most friends."
            />
            <TrackCard
              label="A community instance"
              body="Same codebase, different operators. A photo group, a college, a co-op."
              audience="Anyone can run one."
            />
            <TrackCard
              label="Track 2 · Self-host"
              body="Solo install. Clone, deploy anywhere, write your own UI. Just publish the feed."
              audience="For technical friends."
            />
          </div>
          <Diagram className="mt-3">
            <p className="text-center text-muted-soft">↓ ↓ ↓</p>
            <div className="mt-3 border border-dashed border-border p-4 text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground">
                The protocol
              </p>
              <p className="mt-2 text-xs text-muted">
                RSS 2.0 with a tiny{" "}
                <code className="font-mono text-foreground">
                  xmlns:nearstream
                </code>{" "}
                namespace so typed entries (note / essay / picture) round-trip
                between instances.
              </p>
            </div>
          </Diagram>
        </Section>

        <Section number="03" title="Content model">
          <Subhead>Stream / Library / Letter</Subhead>
          <p>
            Three primitives every Nearstream site has. <strong>Stream</strong>{" "}
            is the process. <strong>Library</strong> is the artifact.{" "}
            <strong>Letter</strong> is the standing note at the top of your
            home.
          </p>
          <CompareTable
            head={["", "Stream", "Library"]}
            rows={[
              ["Shape", "Short text + timestamp + mode", "Typed entry — essay, inventory item"],
              ["URL", "None — lives only in the timeline", "Each entry has its own deep page"],
              ["Sort", "Strictly chronological", "Sectioned (essays / inventory), recent within"],
              ["Cadence", "Daily-ish — the texture of life", "Weekly to monthly — finished work"],
              ["Mental model", "What you'd say to a friend at coffee", "What you'd hand a friend"],
            ]}
          />
          <p>
            <strong>Bridge:</strong> a Stream post can announce a Library entry
            with a small arrow link. The substance lives in the Library; the
            Stream just says <em>this happened.</em>
          </p>

          <Subhead>Mode tag</Subhead>
          <p>
            Stream entries carry one of three <strong>modes</strong>, not
            disciplines. A knitter and a coder both fit{" "}
            <code className="font-mono text-foreground">making</code> without
            inventing new tags.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <ModeCard
              name="making"
              hint="writing, cooking, sketching, building…"
            />
            <ModeCard
              name="taking in"
              hint="reading, watching, listening…"
            />
            <ModeCard
              name="being"
              hint="feeling, noticing, idling, just life…"
            />
          </div>

          <Subhead>Typed entries — the menu</Subhead>
          <p>
            Each Library entry uses one of these. <strong>Rule for adding a
            new type:</strong> only when an existing one would force the wrong
            shape.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {LIBRARY_ENTRY_TYPES.map((p) => (
              <PrimitiveCard key={p.name} {...p} />
            ))}
          </div>
        </Section>

        <Section number="04" title="Anti-aspirations">
          <p>
            What Nearstream is <strong>not</strong>. The product is partly
            defined by what it refuses.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {ANTI.map((a) => (
              <AntiCard key={a.name} {...a} />
            ))}
          </div>
        </Section>

        <Section number="05" title="Decisions log">
          <p>
            Terse. Each entry: the decision, the reason, when.{" "}
            <strong>Append here when we pick something — never delete.</strong>
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {DECISIONS.map((d, i) => (
              <DecisionCard key={i} {...d} />
            ))}
          </div>
        </Section>

        <Section number="06" title="Open questions">
          <p>
            Unresolved. <strong>Move to §05 when we pick.</strong>
          </p>
          <div className="mt-6 flex flex-col">
            {OPEN_QUESTIONS.map((q, i) => (
              <OpenQuestion key={i} {...q} />
            ))}
          </div>
        </Section>

        <Section number="07" title="Build phases">
          <p>
            Each phase is intentionally small.{" "}
            <strong>Build in order. Don&rsquo;t jump ahead.</strong>
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {PHASES.map((p) => (
              <PhaseCard key={p.num} {...p} />
            ))}
          </div>
        </Section>

        <Section number="08" title="Stack">
          <p>
            Single Next.js app, portable storage, AGPL-3.0.{" "}
            <strong>Vercel-interim, Sanity-free.</strong>
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {STACK.map((s) => (
              <StackCard key={s.role} {...s} />
            ))}
          </div>
        </Section>

        <Section number="09" title="Connection to Nearbox">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="border border-border p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
                Nearbox
              </p>
              <p className="mt-3 text-sm text-muted">
                Physical device. Always-on. Small trusted network. Short
                messages. Intentional, constrained communication.{" "}
                <em>The physical layer of intimacy.</em>
              </p>
            </div>
            <div className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
              same
              <br />
              philosophy
              <br />
              ─────
              <br />
              different
              <br />
              medium
            </div>
            <div className="border border-border p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
                Nearstream
              </p>
              <p className="mt-3 text-sm text-muted">
                Personal web. Owned infrastructure. Small trusted network.
                Stream of life and work.{" "}
                <em>The digital layer of intimacy.</em>
              </p>
            </div>
          </div>
          <p className="mt-6">
            Both reject the same thing: platforms that extract value from your
            attention and relationships. Both bet on the same thing: that a
            small, known audience is more meaningful than a large, unknown
            one.
          </p>
        </Section>

        <footer className="mt-24 flex items-center justify-between border-t border-border pt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
          <span>Nearstream — manifesto v0.4</span>
          <span>start small · own everything · add friends slowly</span>
        </footer>
      </main>
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------
function DocHeader() {
  return (
    <header className="border-b border-border px-6 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-mono text-2xl font-medium tracking-tight text-foreground">
            Nearstream
          </h1>
          <p className="mt-2 text-sm italic text-muted-soft">
            A shared journal between close friends — manifesto v0.4
          </p>
        </div>
        <div className="text-right font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft leading-loose">
          <span className="block">Status — building</span>
          <span className="block">Updated 2026-06-11</span>
          <span className="block">Supersedes v0.3 · v0.2 · v0.1</span>
        </div>
      </div>
      <div className="mx-auto mt-8 w-full max-w-3xl border-t border-dashed border-border pt-6 text-sm text-muted">
        The single source of truth for terms, decisions, and reasoning behind
        Nearstream. The{" "}
        <strong className="text-foreground">Decisions log (§05)</strong> is the
        most important section — code can be re-read, but the <em>reasons</em>{" "}
        behind picks rot fastest.
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------
function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-20 first:mt-0">
      <div className="flex items-center gap-3 mb-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-soft">
          {number} — {title}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-foreground/80 [&_strong]:font-medium [&_strong]:text-foreground [&_em]:italic [&_em]:text-foreground/90">
        {children}
      </div>
    </section>
  );
}

function Subhead({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-8 font-mono text-[14px] font-medium tracking-tight text-foreground">
      {children}
    </h2>
  );
}

function Philosophy({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-foreground/40 bg-foreground/[0.02] px-6 py-5">
      <p className="text-base italic leading-relaxed text-foreground/90">
        {children}
      </p>
    </div>
  );
}

function Diagram({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-border p-5 ${className ?? ""}`}>
      {children}
    </div>
  );
}
function DiagramCaption({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 font-mono text-[10px] text-muted-soft">{children}</p>
  );
}
function DiagramRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}
function DiagramNode({
  children,
  emphasis = false,
}: {
  children: React.ReactNode;
  emphasis?: boolean;
}) {
  const base =
    "border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em]";
  return (
    <span
      className={
        emphasis
          ? `${base} border-foreground text-foreground`
          : `${base} border-border text-muted`
      }
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Lexicon grid
// ---------------------------------------------------------------------------
type Lex = { term: string; def: React.ReactNode };

function LexiconGrid({ items }: { items: Lex[] }) {
  return (
    <div className="mt-6 grid grid-cols-1 border border-border sm:grid-cols-2">
      {items.map((it, i) => (
        <div
          key={it.term}
          className={`border-border p-5 ${
            i < items.length - 1 ? "border-b" : ""
          } ${i % 2 === 0 ? "sm:border-r" : ""}`}
        >
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-foreground">
            {it.term}
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            {it.def}
          </p>
        </div>
      ))}
    </div>
  );
}

const LEXICON: Lex[] = [
  {
    term: "Reader",
    def: (
      <>
        The shared room. Pulls all your sources&rsquo; feeds into one
        chronological stream. Same shape for everyone in the network.{" "}
        <em>Nearstream&rsquo;s territory.</em>
      </>
    ),
  },
  {
    term: "Site",
    def: (
      <>
        A tenant&rsquo;s home. Their domain. Where their content lives.{" "}
        <em>The user&rsquo;s territory.</em>
      </>
    ),
  },
  {
    term: "Stream",
    def: (
      <>
        Short, ephemeral posts. Microblog. Timestamped + mode tag.{" "}
        <em>What you&rsquo;d say to a friend at coffee.</em>
      </>
    ),
  },
  {
    term: "Library",
    def: (
      <>
        Permanent typed entries — essays + inventory. Each has its own page.{" "}
        <em>What you&rsquo;d hand a friend.</em>
      </>
    ),
  },
  {
    term: "Letter",
    def: (
      <>
        The dated standing note at the top of your home. Updated when your
        head changes.
      </>
    ),
  },
  {
    term: "Mode",
    def: (
      <>
        Stream metadata —{" "}
        <code className="font-mono text-foreground">making</code> /{" "}
        <code className="font-mono text-foreground">taking in</code> /{" "}
        <code className="font-mono text-foreground">being</code>. Describes
        the shape of a moment, not the identity of the author.
      </>
    ),
  },
  {
    term: "Profile mark",
    def: (
      <>
        The animated identity in place of a profile photo. Picked from ten
        parameterised variants on onboarding.{" "}
        <em>No face, just a moving signature.</em>
      </>
    ),
  },
  {
    term: "Source",
    def: (
      <>
        A friend&rsquo;s feed URL added to your local reader. The friend graph
        is your contacts; the source is one entry in it.
      </>
    ),
  },
  {
    term: "Friend graph",
    def: (
      <>
        <em>Local to your reader.</em> The domains you&rsquo;ve added, with
        optional local nicknames. Like contacts on a phone — public domain,
        private label. There is no shared graph.
      </>
    ),
  },
  {
    term: "Domain",
    def: (
      <>
        A tenant&rsquo;s public address. The &ldquo;phone number.&rdquo;
        Anyone with the domain can subscribe to its RSS feed.
      </>
    ),
  },
  {
    term: "Instance",
    def: (
      <>
        A deployment of the codebase that hosts one or more tenants. Could be
        solo or multi-tenant. <em>Anyone can run an instance.</em>
      </>
    ),
  },
  {
    term: "Studio",
    def: (
      <>
        The built-in posting interface. Inside the same app as your site, not
        a separate tool.
      </>
    ),
  },
];

// ---------------------------------------------------------------------------
// Freedom layers
// ---------------------------------------------------------------------------
type FreedomLayerProps = {
  layer: string;
  name: string;
  level: "low" | "medium" | "high";
  body: string;
  vary: string;
};

function FreedomLayer({ layer, name, level, body, vary }: FreedomLayerProps) {
  const dots = level === "low" ? 1 : level === "medium" ? 3 : 5;
  return (
    <div className="border border-border p-5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
          {layer} · {level} freedom
        </p>
        <p className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={`block h-1.5 w-1.5 rounded-full ${
                i < dots ? "bg-foreground" : "bg-border"
              }`}
            />
          ))}
        </p>
      </div>
      <h3 className="mt-2 font-mono text-[15px] font-medium text-foreground">
        {name}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      <p className="mt-3 text-xs leading-relaxed text-muted-soft">{vary}</p>
    </div>
  );
}

const FREEDOM_LAYERS: FreedomLayerProps[] = [
  {
    layer: "Layer 01",
    name: "Reader",
    level: "low",
    body: "The shared room. Same chrome for everyone in the network. You vary what you see (lenses), not how it's rendered.",
    vary: "+ density (compact / standard / magazine) · + filter (everyone / only X / library only) · + order (chronological / by friend / digest)",
  },
  {
    layer: "Layer 02",
    name: "Site",
    level: "medium",
    body: "Your home, but constrained. Pick from a curated set of templates, palette pairs, type pairs — no free-form CSS, no hex picker, no font marketplace.",
    vary: "+ template · + palette pair (~8 curated) · + type pair · + masthead style + optional sections",
  },
  {
    layer: "Layer 03",
    name: "Library entry",
    level: "high",
    body: "A single piece. High freedom within the site's language. Compose with typed primitives. Type the surface, not the visual.",
    vary: "+ plates / tracklist / spec table · + sequences / quotes / footnotes · + media embeds + process timelines",
  },
];

// ---------------------------------------------------------------------------
// Track cards
// ---------------------------------------------------------------------------
function TrackCard({
  label,
  body,
  audience,
}: {
  label: string;
  body: string;
  audience: string;
}) {
  return (
    <div className="border border-border p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
        {label}
      </p>
      <p className="mt-3 text-[12.5px] leading-relaxed text-muted">{body}</p>
      <p className="mt-3 text-[11px] italic leading-relaxed text-muted-soft">
        {audience}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compare table (Stream vs Library)
// ---------------------------------------------------------------------------
function CompareTable({
  head,
  rows,
}: {
  head: string[];
  rows: [string, string, string][];
}) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                className={`border-b border-border py-2 pr-4 text-left font-mono text-[10px] font-normal uppercase tracking-[0.22em] text-muted-soft ${
                  i === 0 ? "w-32" : ""
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`border-b border-border/60 py-3 pr-4 align-top ${
                    j === 0
                      ? "font-mono text-[11px] uppercase tracking-[0.18em] text-foreground"
                      : "text-[13.5px] text-muted"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mode cards
// ---------------------------------------------------------------------------
function ModeCard({ name, hint }: { name: string; hint: string }) {
  return (
    <div className="border border-border p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
        {name}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-soft">{hint}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Library entry primitives
// ---------------------------------------------------------------------------
type Primitive = { name: string; fields: string; use: string };

function PrimitiveCard({ name, fields, use }: Primitive) {
  return (
    <div className="border border-border p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
        {name}
      </p>
      <p className="mt-2 font-mono text-[10.5px] text-muted">{fields}</p>
      <p className="mt-3 text-xs italic leading-relaxed text-muted-soft">
        {use}
      </p>
    </div>
  );
}

const LIBRARY_ENTRY_TYPES: Primitive[] = [
  {
    name: "Essay",
    fields: "title · body (markdown) · visibility",
    use: "Long-form writing. Lands at /library/{slug}.",
  },
  {
    name: "Inventory item",
    fields: "title · image · body · visibility",
    use: "Pictures, objects, anything visual. Lands at /library/inventory/{slug}.",
  },
];

// ---------------------------------------------------------------------------
// Anti-aspirations
// ---------------------------------------------------------------------------
type Anti = { name: string; body: React.ReactNode };

function AntiCard({ name, body }: Anti) {
  return (
    <div className="border border-border border-l-2 border-l-foreground/50 p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
        {name}
      </p>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

const ANTI: Anti[] = [
  {
    name: "Not Squarespace",
    body: (
      <>
        No drag-and-drop builders, no free-hex pickers, no font marketplace,
        no &ldquo;section libraries.&rdquo;{" "}
        <em>The constraints are the product.</em>
      </>
    ),
  },
  {
    name: "Not Instagram",
    body: <>No likes, no views, no metrics, no algorithm, no public.</>,
  },
  {
    name: "Not Substack",
    body: (
      <>Not a newsletter. Not optimised for &ldquo;audience.&rdquo;</>
    ),
  },
  {
    name: "Not Twitter / Threads",
    body: (
      <>Not stream-only — the Library matters as much as the Stream.</>
    ),
  },
  {
    name: "Not Mastodon-shaped",
    body: (
      <>
        Not federated-Twitter. It&rsquo;s <em>personal sites + a reader</em>,
        not microblog instances.
      </>
    ),
  },
  {
    name: "Not retro cosplay",
    body: (
      <>
        Modern structure, analog texture. No fake CRT chrome, no pixel fonts
        everywhere.
      </>
    ),
  },
];

// ---------------------------------------------------------------------------
// Decisions log
// ---------------------------------------------------------------------------
type Decision = {
  date: string;
  title: string;
  body: React.ReactNode;
};

function DecisionCard({ date, title, body }: Decision) {
  return (
    <article className="grid gap-4 border border-border p-5 sm:grid-cols-[88px_1fr]">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/80">
        {date}
      </p>
      <div>
        <p className="font-mono text-[12.5px] font-medium text-foreground">
          {title}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">{body}</p>
      </div>
    </article>
  );
}

const DECISIONS: Decision[] = [
  {
    date: "2026-06-11",
    title: "Stream tag is a mode, not a discipline",
    body: (
      <>
        Three broad buckets — making / taking in / being.{" "}
        <em>
          Modes describe the shape of a moment instead of the identity of its
          author — a knitter and a coder both fit &ldquo;making&rdquo; without
          inventing new tags.
        </em>
      </>
    ),
  },
  {
    date: "2026-06-11",
    title: "Manifesto as a structured page, not rendered markdown",
    body: (
      <>
        /manifesto is a curated, schematic page; NEARSTREAM.md is the internal
        working doc.{" "}
        <em>
          The public manifesto is hand-laid for clarity. Decisions log here is
          the canonical reference for anyone reading the project.
        </em>
      </>
    ),
  },
  {
    date: "2026-06-06",
    title: "Profile marks instead of profile photos",
    body: (
      <>
        Every non-host tenant picks one of ten parameterised
        &ldquo;human-circle&rdquo; animations.{" "}
        <em>
          A face is the wrong primitive for a network whose point is to stop
          performing for strangers. The mark is a moving signature, not a
          likeness.
        </em>
      </>
    ),
  },
  {
    date: "2026-06-06",
    title: "Studio first-time empty state",
    body: (
      <>
        Freshly-onboarded /studio leads with a single-paragraph welcome.{" "}
        <em>
          Removes the &ldquo;blank dashboard with eight unfilled forms&rdquo;
          first impression.
        </em>
      </>
    ),
  },
  {
    date: "2026-05-27",
    title: "Phase 1 deploys to Vercel — interim, not architectural",
    body: (
      <>
        Vercel is the host today; the codebase avoids Vercel-specific APIs.{" "}
        <em>
          Lock-in stays theoretical while we stay disciplined; migration to Fly
          remains a 2–3 hour task.
        </em>
      </>
    ),
  },
  {
    date: "2026-05-23",
    title: "Two-layer design system: Nearstream chrome vs user site",
    body: (
      <>
        Components in <code className="font-mono">app/_components/</code> are
        platform chrome — same on every instance.{" "}
        <em>
          Keeps the platform recognisable while letting users own the look of
          their personal stream.
        </em>
      </>
    ),
  },
  {
    date: "2026-05-23",
    title: "Nearstream chrome palette is pure mono, no accent",
    body: (
      <>
        Black, foreground, two greys, border. No light mode.{" "}
        <em>
          Austerity makes it a backdrop, not a brand fighting for attention.
        </em>
      </>
    ),
  },
  {
    date: "2026-05-15",
    title: "Auth is HMAC over Web Crypto, not a JWT library",
    body: (
      <>
        Magic-link tokens and session cookies are{" "}
        <code className="font-mono">
          base64url(payload).base64url(HMAC-SHA256(secret, payload))
        </code>
        .{" "}
        <em>
          This is auth for a handful of people, not enterprise. ~30 lines, zero
          dependencies, rotating AUTH_SECRET invalidates everything.
        </em>
      </>
    ),
  },
  {
    date: "2026-05-15",
    title: "Allowlist is an env var, not a database",
    body: (
      <>
        <code className="font-mono">ALLOWED_EMAILS</code> is a comma-separated
        list in <code className="font-mono">.env</code>. Adding a friend =
        redeploy.{" "}
        <em>
          Friction by design. A self-serve invite UI is the exact kind of
          feature this project shouldn&rsquo;t have.
        </em>
      </>
    ),
  },
  {
    date: "2026-05-12",
    title: "R2 client is aws4fetch, not the AWS SDK",
    body: (
      <>
        Single-file SigV4 signer over <code className="font-mono">fetch</code>.{" "}
        <em>
          AWS SDK is ~1.6 MB / ~120 packages, mostly features we don&rsquo;t
          need.
        </em>
      </>
    ),
  },
  {
    date: "2026-04-28",
    title: "Two tracks + one protocol",
    body: (
      <>
        Hosted multi-tenant codebase AND self-hostable template, bound by an
        open RSS + typed-primitive format.{" "}
        <em>
          Solves adoption (Track 1), sovereignty (Track 2), and longevity (the
          protocol outlives any instance).
        </em>
      </>
    ),
  },
  {
    date: "2026-04-28",
    title: "Friend graph is local, like a phone book",
    body: (
      <>
        Domain = phone number (public). Friends list = your contacts
        (private). No follow requests, no central registry.{" "}
        <em>Matches the real shape of friendship.</em>
      </>
    ),
  },
  {
    date: "2026-04-28",
    title: "Ownership through exit, not infrastructure",
    body: (
      <>
        Each user owns their domain. Content is exportable at all times
        (JSON + media bundle). Identity is the domain, not the instance.{" "}
        <em>
          Lets us run a hosted instance for adoption without compromising
          sovereignty.
        </em>
      </>
    ),
  },
  {
    date: "2026-04-28",
    title: "Scale by instance count, not user count per instance",
    body: (
      <>
        Nearstream scales like email: many small instances, all interoperating
        via the protocol. Each instance ~10–80 friends.{" "}
        <em>
          The friend-graph mechanic only works at small scale; the right unit
          of growth is the circle, not the user.
        </em>
      </>
    ),
  },
  {
    date: "2026-04-28",
    title: "Alessandro&rsquo;s instance is for his close friends",
    body: (
      <>
        Growth is incidental, not a goal. Future hand-off (paid tier / co-op /
        non-profit) is a future decision.{" "}
        <em>Locks v1 scope to &ldquo;small but durable.&rdquo;</em>
      </>
    ),
  },
  {
    date: "2026-04-27",
    title: "Squarespace is the explicit anti-aspiration",
    body: (
      <>
        Test for any new feature: would Squarespace add this? If yes, default
        to not adding it.{" "}
        <em>
          Kitchen-sink builders are the wrong shape for friend-network
          publishing.
        </em>
      </>
    ),
  },
  {
    date: "2026-04-27",
    title: "Library is the parent of disciplines, not their sibling",
    body: (
      <>
        All sites use Stream / Library / About as nav. Multi-discipline sites
        partition inside Library.{" "}
        <em>
          Keeps single- and multi-discipline sites the same shape;
          &ldquo;Library&rdquo; stays a stable network-wide term.
        </em>
      </>
    ),
  },
];

// ---------------------------------------------------------------------------
// Open questions
// ---------------------------------------------------------------------------
type Question = { lead: string; rest: string };

function OpenQuestion({ lead, rest }: Question) {
  return (
    <div className="grid grid-cols-[24px_1fr] gap-3 border-b border-border py-3 first:border-t">
      <span className="pt-px font-mono text-sm text-foreground">?</span>
      <p className="text-[13.5px] leading-relaxed text-muted">
        <strong className="text-foreground">{lead}</strong> — {rest}
      </p>
    </div>
  );
}

const OPEN_QUESTIONS: Question[] = [
  {
    lead: "Stream cadence",
    rest: "should there be a daily limit? Should the reader collapse same-friend same-day entries?",
  },
  {
    lead: "Search",
    rest: "when do we add it, and across what scope (site / library / reader)?",
  },
  {
    lead: "Drafts",
    rest: "exist as unpublished entries with a flag, or in a separate namespace?",
  },
  {
    lead: "Reader-level interactions",
    rest: "comments? webmentions? read receipts? When do these violate “no metrics”?",
  },
  {
    lead: "Cross-discipline reader rendering",
    rest: "when a Stream post and a Library entry sit next to each other, how does the chrome differentiate them at a glance?",
  },
  {
    lead: "Custom domain handoff",
    rest: "manual at first (operator flips DNS), or self-serve via a settings page?",
  },
  {
    lead: "Friends-level privacy",
    rest: "today every entry is public or private. Do we need a third level visible only to followed sources?",
  },
  {
    lead: "Edit history",
    rest: "store every save as a new version, or just the latest? Friends-visible or private?",
  },
];

// ---------------------------------------------------------------------------
// Build phases
// ---------------------------------------------------------------------------
type Phase = {
  num: string;
  name: string;
  body: string;
  estimate: string;
  status: "done" | "doing" | "next" | "later";
};

function PhaseCard({ num, name, body, estimate, status }: Phase) {
  const badge = {
    done: "Shipped",
    doing: "In progress",
    next: "Next",
    later: "Later",
  }[status];
  const badgeColor = {
    done: "text-foreground border-foreground",
    doing: "text-foreground border-foreground/70",
    next: "text-muted border-border",
    later: "text-muted-soft border-border",
  }[status];
  return (
    <article className="grid gap-4 border border-border p-5 sm:grid-cols-[48px_1fr_auto] sm:items-start">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">
        {num}
      </p>
      <div>
        <h3 className="font-mono text-[13.5px] font-medium text-foreground">
          {name}
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">{body}</p>
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <span
          className={`border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.22em] ${badgeColor}`}
        >
          {badge}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
          {estimate}
        </span>
      </div>
    </article>
  );
}

const PHASES: Phase[] = [
  {
    num: "00",
    name: "Define the protocol",
    body: "Lock the TypeScript schemas for v1 typed primitives. The contract that flows through forms, storage, RSS, and reader cards.",
    estimate: "~1 day",
    status: "done",
  },
  {
    num: "01",
    name: "Solo end-to-end loop",
    body: "Single user (host). Studio + Stream + Library + RSS feed. Magic-link auth. Cloudflare R2 storage. Custom domain optional.",
    estimate: "~1 week",
    status: "done",
  },
  {
    num: "02",
    name: "Library primitives",
    body: "Essay + Inventory typed schemas, studio forms, site rendering. Library archive page. Each entry gets its own URL.",
    estimate: "~1 week",
    status: "done",
  },
  {
    num: "03",
    name: "Multi-tenant + reader",
    body: "Hostname-aware proxy. Per-tenant R2 namespace. Tenant onboarding (handle + display name + profile mark). Reader pulls friends’ RSS feeds and merges by date.",
    estimate: "~2 weekends",
    status: "done",
  },
  {
    num: "04",
    name: "Onboard the first friends",
    body: "Adding the first close friends to the allowlist. Watching how they use the studio and reader. Iterating on the empty states and the picker UX.",
    estimate: "ongoing",
    status: "doing",
  },
  {
    num: "05",
    name: "Iterate on reader + library",
    body: "Density modes, filter by person, grouping by day, unread indicators. New typed primitives only when an existing one would force the wrong shape.",
    estimate: "ongoing",
    status: "next",
  },
  {
    num: "06",
    name: "Richer interactions + federation",
    body: "WebMention, ActivityPub bridge, POSSE to Instagram. Public open-source release with onboarding docs for instance-runners.",
    estimate: "v2",
    status: "later",
  },
];

// ---------------------------------------------------------------------------
// Stack
// ---------------------------------------------------------------------------
type StackRow = { role: string; tech: string; body: string };

function StackCard({ role, tech, body }: StackRow) {
  return (
    <div className="border border-border p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
        {role}
      </p>
      <p className="mt-1 font-mono text-[12.5px] text-foreground">{tech}</p>
      <p className="mt-3 text-[12.5px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

const STACK: StackRow[] = [
  {
    role: "Application",
    tech: "Single Next.js app",
    body: "Site + studio + reader live together. Routes gated by auth where private. Open source, AGPL-3.0.",
  },
  {
    role: "Storage",
    tech: "Cloudflare R2",
    body: "S3-compatible object storage. Per-tenant prefix users/{userId}/… . JSON for content, blob for media. No database, no migrations.",
  },
  {
    role: "Auth",
    tech: "Magic-link via Resend",
    body: "Sessions are HMAC-signed cookies, 30 lines of Web Crypto. No SDKs, no JWT library, no Lucia.",
  },
  {
    role: "Schemas",
    tech: "TypeScript types",
    body: "Single source of truth: typed primitives flow through studio forms + site rendering + RSS export + reader cards.",
  },
  {
    role: "Feed",
    tech: "RSS 2.0 + nearstream ns",
    body: "Standard RSS plus typed-entry metadata via a tiny xmlns:nearstream namespace. Backwards-compatible with any reader.",
  },
  {
    role: "Compute",
    tech: "Vercel (interim) · portable",
    body: "Vercel today, intentionally portable. No Vercel-specific APIs — the codebase ships as a single container to anywhere that runs Node.",
  },
];
