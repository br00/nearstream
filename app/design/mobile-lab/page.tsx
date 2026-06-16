import Link from "next/link";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { Kicker } from "@/app/_components/kicker";

export const metadata = {
  title: "Mobile lab · Nearstream",
  robots: { index: false, follow: false },
};

// Sandbox for the mobile UI direction. Three high-traffic surfaces — bottom
// nav, reader feed, studio composer — each shown in three directional takes
// at life-size 375px so the type, density, and tap targets read as they
// would on an iPhone. Non-functional: this is for the eye, not the hands.

export default function MobileLabPage() {
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
          <Kicker>Mobile lab</Kicker>
          <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
            Direction explorations
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
            Three surfaces × three takes, rendered at the canonical 375px
            iPhone width. Each take pulls a different lever (density, chrome,
            tap targets). None of these are wired up &mdash; pick a direction
            and we roll it to the real pages.
          </p>

          <SurfaceSection
            kicker="Bottom nav"
            title="Tab bar"
            blurb="Current bar is 9.5px labels + 1px dot indicator over py-3. Federico's thumb reach + your &ldquo;too small&rdquo; both point here."
          >
            <Variant
              tag="V1"
              name="Current"
              note="Reference. 9.5px label, 1px dot, py-3."
            >
              <NavCurrent />
            </Variant>
            <Variant
              tag="V2"
              name="App-density"
              note="11px label, 4px indicator bar above active tab, py-4 + iOS safe-area. ~64px total — passes 44pt tap minimum comfortably."
            >
              <NavDense />
            </Variant>
            <Variant
              tag="V3"
              name="Glyph-led"
              note="Custom glyph above label. Reads at a glance even when the label is unread. Glyphs in same palette, no color accent."
            >
              <NavGlyph />
            </Variant>
          </SurfaceSection>

          <SurfaceSection
            kicker="Reader feed"
            title="The room"
            blurb="The surface you'd open most. Currently 15px body, hairline dividers, mono date stamps."
          >
            <Variant
              tag="V1"
              name="Current"
              note="Reference. Hairline dividers, 13px author, 15px body, mono meta."
            >
              <ReaderCurrent />
            </Variant>
            <Variant
              tag="V2"
              name="App-density"
              note="17px body, larger author name, mode pill, picture entries bleed full-width. Native-app weight without dropping the constraint."
            >
              <ReaderDense />
            </Variant>
            <Variant
              tag="V3"
              name="Quiet broadsheet"
              note="More whitespace, generous margins, essay title set in serif, picture entries breathe. Reading-room feel."
            >
              <ReaderBroadsheet />
            </Variant>
          </SurfaceSection>

          <SurfaceSection
            kicker="Studio composer"
            title="Posting"
            blurb="Why you don't post: four stacked forms, ~3 screens of scroll before the relevant box. This is the friction we want to kill."
          >
            <Variant
              tag="V1"
              name="Current"
              note="Reference. Four primitives stacked in one long scroll. Letter → Stream → Essay → Inventory."
            >
              <StudioCurrent />
            </Variant>
            <Variant
              tag="V2"
              name="Compose-first"
              note="A single field at the top — &ldquo;What's on your mind?&rdquo; — with primitive chips (Stream / Essay / Picture / Letter) above. Selecting one transitions in the relevant fields. The Stream entry is the default."
            >
              <StudioCompose />
            </Variant>
            <Variant
              tag="V3"
              name="Primitive picker"
              note="Four big tap-targets up front; pick what you want to post, drop into a single full-page form. No scrolling past sections you don't want."
            >
              <StudioPicker />
            </Variant>
          </SurfaceSection>
        </div>
      </section>
    </PageShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Layout shells
   ───────────────────────────────────────────────────────────────────────── */

function SurfaceSection({
  kicker,
  title,
  blurb,
  children,
}: {
  kicker: string;
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-24 border-t border-border pt-12">
      <Kicker>{kicker}</Kicker>
      <h2 className="mt-2 text-xl font-normal tracking-tight text-foreground">
        {title}
      </h2>
      <p
        className="mt-3 max-w-xl text-sm leading-relaxed text-muted"
        dangerouslySetInnerHTML={{ __html: blurb }}
      />
      <div className="mt-10 flex gap-6 overflow-x-auto pb-4">{children}</div>
    </section>
  );
}

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
    <article className="flex w-[375px] shrink-0 flex-col gap-3">
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

// 375 × 720 black viewport — flat, no device chrome. The constraint is the
// product, including in lab pages.
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[720px] w-[375px] overflow-hidden border border-border bg-background">
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Bottom nav variants
   ───────────────────────────────────────────────────────────────────────── */

const TABS = [
  { key: "site", label: "Site" },
  { key: "studio", label: "Studio" },
  { key: "reader", label: "Reader" },
  { key: "settings", label: "Settings" },
] as const;

function NavBaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 items-end justify-center pb-6 opacity-30">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
          ↑ page content
        </span>
      </div>
      {children}
    </div>
  );
}

function NavCurrent() {
  return (
    <NavBaseLayout>
      <nav className="border-t border-border bg-background/95 backdrop-blur">
        <ul className="grid grid-cols-4">
          {TABS.map((t, i) => {
            const isActive = i === 2;
            return (
              <li key={t.key}>
                <span
                  className={
                    "flex flex-col items-center justify-center gap-1.5 py-3 font-mono text-[9.5px] uppercase tracking-[0.2em] " +
                    (isActive ? "text-foreground" : "text-muted-soft")
                  }
                >
                  <span
                    aria-hidden
                    className={
                      "block h-1 w-1 rounded-full " +
                      (isActive ? "bg-foreground" : "bg-transparent")
                    }
                  />
                  {t.label}
                </span>
              </li>
            );
          })}
        </ul>
      </nav>
    </NavBaseLayout>
  );
}

function NavDense() {
  return (
    <NavBaseLayout>
      <nav className="border-t border-border bg-background/95 backdrop-blur pb-[28px]">
        <ul className="grid grid-cols-4">
          {TABS.map((t, i) => {
            const isActive = i === 2;
            return (
              <li key={t.key} className="relative">
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-x-6 top-0 h-[2px] bg-foreground"
                  />
                )}
                <span
                  className={
                    "flex items-center justify-center py-4 font-mono text-[11px] uppercase tracking-[0.22em] " +
                    (isActive ? "text-foreground" : "text-muted-soft")
                  }
                >
                  {t.label}
                </span>
              </li>
            );
          })}
        </ul>
      </nav>
    </NavBaseLayout>
  );
}

const NAV_GLYPHS: Record<(typeof TABS)[number]["key"], React.ReactNode> = {
  site: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      className="h-5 w-5"
    >
      <path d="M4 11.5L12 5l8 6.5V19a1 1 0 01-1 1h-5v-6h-4v6H5a1 1 0 01-1-1v-7.5z" />
    </svg>
  ),
  studio: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      className="h-5 w-5"
    >
      <path d="M4 20l4-1 10-10-3-3L5 16l-1 4z" />
      <path d="M14 6l3 3" />
    </svg>
  ),
  reader: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      className="h-5 w-5"
    >
      <path d="M4 6h16M4 11h16M4 16h10" />
    </svg>
  ),
  settings: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M21 12h-3M6 12H3M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7L5.6 5.6" />
    </svg>
  ),
};

function NavGlyph() {
  return (
    <NavBaseLayout>
      <nav className="border-t border-border bg-background/95 backdrop-blur pb-[28px]">
        <ul className="grid grid-cols-4">
          {TABS.map((t, i) => {
            const isActive = i === 2;
            return (
              <li key={t.key}>
                <span
                  className={
                    "flex flex-col items-center justify-center gap-1.5 py-3.5 " +
                    (isActive ? "text-foreground" : "text-muted-soft")
                  }
                >
                  {NAV_GLYPHS[t.key]}
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.18em]">
                    {t.label}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </nav>
    </NavBaseLayout>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Reader feed variants
   ───────────────────────────────────────────────────────────────────────── */

const MOCK_FEED = [
  {
    author: "Federico",
    when: "today · 14:33",
    type: "note" as const,
    text: "Drawing afternoon. The new pen is changing things — the line wants to slow down.",
  },
  {
    author: "Gosia",
    when: "yesterday",
    type: "picture" as const,
    title: "Last light, Bellingham",
  },
  {
    author: "Margherita",
    when: "2 days",
    type: "essay" as const,
    title: "On notebooks that outlive their owners",
    excerpt:
      "What I keep finding, sifting through her drawers, is that she ran out of paper before she ran out of thoughts.",
  },
];

function ReaderShell({
  children,
  navVariant = "current",
}: {
  children: React.ReactNode;
  navVariant?: "current" | "dense";
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-5 pb-20 pt-6">{children}</div>
      <nav
        className={
          "border-t border-border bg-background/95 " +
          (navVariant === "dense" ? "pb-[28px]" : "")
        }
      >
        <ul className="grid grid-cols-4">
          {TABS.map((t, i) => {
            const isActive = i === 2;
            return (
              <li key={t.key} className="relative">
                {navVariant === "dense" && isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-x-6 top-0 h-[2px] bg-foreground"
                  />
                )}
                <span
                  className={
                    navVariant === "dense"
                      ? "flex items-center justify-center py-4 font-mono text-[11px] uppercase tracking-[0.22em] " +
                        (isActive ? "text-foreground" : "text-muted-soft")
                      : "flex flex-col items-center justify-center gap-1.5 py-3 font-mono text-[9.5px] uppercase tracking-[0.2em] " +
                        (isActive ? "text-foreground" : "text-muted-soft")
                  }
                >
                  {navVariant === "current" && (
                    <span
                      aria-hidden
                      className={
                        "block h-1 w-1 rounded-full " +
                        (isActive ? "bg-foreground" : "bg-transparent")
                      }
                    />
                  )}
                  {t.label}
                </span>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function ReaderCurrent() {
  return (
    <ReaderShell navVariant="current">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
        Reader
      </p>
      <div className="mt-2 inline-flex items-center gap-2 border border-border px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground">
          Friends · 3
        </span>
        <span className="font-mono text-[10px] text-muted-soft">→</span>
      </div>
      <h1 className="mt-6 text-2xl font-normal tracking-tight text-foreground">
        Today
      </h1>
      <ul className="mt-8 flex flex-col">
        {MOCK_FEED.map((e, i) => (
          <li
            key={i}
            className="border-t border-border py-8 first:border-t-0 first:pt-0"
          >
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <span className="text-[13px] text-foreground">{e.author}</span>
              <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.22em] tabular-nums text-muted-soft">
                {e.when}
                {e.type !== "note" && (
                  <>
                    <span className="text-border"> · </span>
                    {e.type}
                  </>
                )}
              </span>
            </div>
            {e.type === "note" && (
              <p className="text-[15px] leading-relaxed text-foreground">
                {e.text}
              </p>
            )}
            {e.type === "picture" && (
              <>
                <div className="aspect-[4/3] overflow-hidden border border-border bg-gradient-to-br from-foreground/15 to-foreground/5" />
                <div className="mt-3 text-[14px] text-foreground">{e.title}</div>
              </>
            )}
            {e.type === "essay" && (
              <div className="border-l border-border pl-4">
                <p className="text-[18px] leading-snug tracking-tight text-foreground">
                  {e.title} →
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">
                  {e.excerpt}
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </ReaderShell>
  );
}

function ReaderDense() {
  return (
    <ReaderShell navVariant="dense">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[28px] font-normal tracking-tight text-foreground">
          Today
        </h1>
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          3 friends
        </span>
      </div>
      <ul className="mt-7 flex flex-col gap-2">
        {MOCK_FEED.map((e, i) => (
          <li
            key={i}
            className="border-t border-border py-7 first:border-t-0 first:pt-0"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-[15px] font-medium text-foreground">
                {e.author}
              </span>
              <div className="flex items-center gap-2">
                {e.type !== "note" && (
                  <span className="border border-border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.2em] text-muted">
                    {e.type}
                  </span>
                )}
                <span className="whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.18em] tabular-nums text-muted-soft">
                  {e.when}
                </span>
              </div>
            </div>
            {e.type === "note" && (
              <p className="text-[17px] leading-[1.55] text-foreground/95">
                {e.text}
              </p>
            )}
            {e.type === "picture" && (
              <>
                <div className="-mx-5 aspect-[4/3] bg-gradient-to-br from-foreground/15 to-foreground/5" />
                <p className="mt-3 text-[15px] text-foreground/95">{e.title}</p>
              </>
            )}
            {e.type === "essay" && (
              <>
                <p className="text-[20px] font-medium leading-snug tracking-tight text-foreground">
                  {e.title}
                </p>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">
                  {e.excerpt}
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground">
                  Read essay →
                </p>
              </>
            )}
          </li>
        ))}
      </ul>
    </ReaderShell>
  );
}

function ReaderBroadsheet() {
  return (
    <ReaderShell navVariant="dense">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-soft">
        Mon, 16 Jun
      </p>
      <h1 className="mt-3 font-serif text-[34px] leading-[1.05] tracking-tight text-foreground">
        Today
      </h1>
      <p className="mt-2 text-[13px] text-muted-soft">3 friends posted.</p>
      <ul className="mt-10 flex flex-col gap-1">
        {MOCK_FEED.map((e, i) => (
          <li
            key={i}
            className="border-t border-border py-9 first:border-t-0 first:pt-0"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-soft">
              {e.author} · {e.when}
            </p>
            {e.type === "note" && (
              <p className="mt-4 font-serif text-[19px] leading-[1.55] text-foreground">
                &ldquo;{e.text}&rdquo;
              </p>
            )}
            {e.type === "picture" && (
              <div className="mt-5">
                <div className="-mx-5 aspect-[4/5] bg-gradient-to-br from-foreground/15 to-foreground/5" />
                <p className="mt-4 font-serif text-[17px] italic leading-snug text-foreground">
                  {e.title}
                </p>
              </div>
            )}
            {e.type === "essay" && (
              <>
                <h2 className="mt-4 font-serif text-[24px] leading-[1.15] tracking-tight text-foreground">
                  {e.title}
                </h2>
                <p className="mt-3 text-[14px] leading-relaxed text-muted">
                  {e.excerpt}
                </p>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-foreground">
                  Read →
                </p>
              </>
            )}
          </li>
        ))}
      </ul>
    </ReaderShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Studio composer variants
   ───────────────────────────────────────────────────────────────────────── */

function StudioShell({
  children,
  navVariant = "current",
}: {
  children: React.ReactNode;
  navVariant?: "current" | "dense";
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-5 pb-20 pt-6">{children}</div>
      <nav
        className={
          "border-t border-border bg-background/95 " +
          (navVariant === "dense" ? "pb-[28px]" : "")
        }
      >
        <ul className="grid grid-cols-4">
          {TABS.map((t, i) => {
            const isActive = i === 1;
            return (
              <li key={t.key} className="relative">
                {navVariant === "dense" && isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-x-6 top-0 h-[2px] bg-foreground"
                  />
                )}
                <span
                  className={
                    navVariant === "dense"
                      ? "flex items-center justify-center py-4 font-mono text-[11px] uppercase tracking-[0.22em] " +
                        (isActive ? "text-foreground" : "text-muted-soft")
                      : "flex flex-col items-center justify-center gap-1.5 py-3 font-mono text-[9.5px] uppercase tracking-[0.2em] " +
                        (isActive ? "text-foreground" : "text-muted-soft")
                  }
                >
                  {navVariant === "current" && (
                    <span
                      aria-hidden
                      className={
                        "block h-1 w-1 rounded-full " +
                        (isActive ? "bg-foreground" : "bg-transparent")
                      }
                    />
                  )}
                  {t.label}
                </span>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function StudioCurrent() {
  return (
    <StudioShell navVariant="current">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
        Studio
      </p>
      <h2 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
        Letter
      </h2>
      <p className="mt-2 text-[13px] text-muted-soft">
        The dated note at the top of your home page.
      </p>
      <div className="mt-6 border-b border-border pb-1">
        <textarea
          readOnly
          className="w-full resize-none bg-transparent text-[14px] text-foreground outline-none"
          rows={4}
          defaultValue="Working on Soft Iron and a piece for an upcoming show."
        />
      </div>
      <div className="mt-4 inline-block border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground">
        Update letter
      </div>
      <hr className="my-10 border-border" />
      <h2 className="text-2xl font-normal tracking-tight text-foreground">
        New stream entry
      </h2>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
        Entry
      </p>
      <div className="mt-2 border-b border-border pb-1">
        <p className="text-[14px] text-muted-soft">What are you doing now?</p>
      </div>
      <hr className="my-10 border-border" />
      <h2 className="text-2xl font-normal tracking-tight text-foreground">
        New essay
      </h2>
      <p className="mt-2 text-[13px] text-muted-soft">
        Markdown. Lands at /library/[slug].
      </p>
    </StudioShell>
  );
}

const PRIMITIVES = [
  { key: "stream", label: "Stream", hint: "A short note. No title." },
  { key: "picture", label: "Picture", hint: "Image + a line." },
  { key: "essay", label: "Essay", hint: "Markdown. Long-form." },
  { key: "letter", label: "Letter", hint: "Top of your home." },
] as const;

function StudioCompose() {
  return (
    <StudioShell navVariant="dense">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
        Studio · post
      </p>
      <div className="mt-5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {PRIMITIVES.map((p, i) => {
          const isActive = i === 0;
          return (
            <span
              key={p.key}
              className={
                "shrink-0 border px-3.5 py-2 font-mono text-[10.5px] uppercase tracking-[0.22em] " +
                (isActive
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted")
              }
            >
              {p.label}
            </span>
          );
        })}
      </div>

      <h2 className="mt-8 text-[22px] font-normal leading-snug tracking-tight text-foreground">
        What&rsquo;s on your mind?
      </h2>
      <p className="mt-1 text-[13px] text-muted-soft">{PRIMITIVES[0].hint}</p>

      <div className="mt-6 border border-border p-4">
        <textarea
          readOnly
          rows={6}
          className="w-full resize-none bg-transparent text-[17px] leading-relaxed text-foreground outline-none"
          defaultValue="The shop is quiet. Light off the kiln, watching the glaze settle."
        />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
            Mode
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground">
            making →
          </span>
        </div>
        <div className="flex items-center justify-between border-b border-border pb-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
            Visibility
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground">
            public →
          </span>
        </div>
      </div>

      <button
        type="button"
        className="mt-8 w-full border border-foreground bg-foreground py-3.5 font-mono text-[11px] uppercase tracking-[0.22em] text-background"
      >
        Post
      </button>
    </StudioShell>
  );
}

function StudioPicker() {
  return (
    <StudioShell navVariant="dense">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
        Studio
      </p>
      <h1 className="mt-2 text-[28px] font-normal tracking-tight text-foreground">
        Post something
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        Pick what kind. One field at a time, no scrolling past forms you
        don&rsquo;t want.
      </p>

      <ul className="mt-8 flex flex-col gap-3">
        {PRIMITIVES.map((p) => (
          <li
            key={p.key}
            className="flex items-baseline justify-between border border-border px-4 py-5"
          >
            <div className="flex flex-col gap-1">
              <span className="text-[17px] font-medium text-foreground">
                {p.label}
              </span>
              <span className="text-[12.5px] text-muted-soft">{p.hint}</span>
            </div>
            <span className="font-mono text-[12px] text-muted">→</span>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
        Letter last updated 3 days ago
      </p>
    </StudioShell>
  );
}
