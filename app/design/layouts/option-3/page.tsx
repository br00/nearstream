// Deep-dive on option 3's /reader: sources management moves out of /studio
// and lives next to (or above, or behind a drawer of) the feed. Three
// concrete variants showing what the rows, buttons, and add-source affordance
// actually look like — pick the one whose UI shape feels right.

import Link from "next/link";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { Kicker } from "@/app/_components/kicker";

export const metadata = {
  title: "Option 3 detail · Layout lab",
  robots: { index: false, follow: false },
};

// Realistic-looking mock data so the screens read as the real reader.
const FAKE_ENTRIES = [
  {
    author: "Federico",
    when: "today · 09:14",
    body: "Mountains this morning, going up before the heat. Brought the wide lens for once.",
    type: "note" as const,
  },
  {
    author: "Gosia",
    when: "today · 07:42",
    body: "Tea, slowly. Listening to the rain pretending to be Sunday.",
    type: "note" as const,
  },
  {
    author: "Marco",
    when: "yesterday",
    body: "On a new run of cassettes — first prints look promising.",
    type: "picture" as const,
  },
  {
    author: "Sofia",
    when: "2 days",
    body: "Wrote a thing about being slow on purpose.",
    type: "essay" as const,
    title: "Slow on purpose →",
  },
];

const FAKE_SOURCES = [
  { name: "Federico", initial: "F", lastFetched: "1m ago" },
  { name: "Gosia", initial: "G", lastFetched: "1m ago" },
  { name: "Marco", initial: "M", lastFetched: "1h ago" },
  { name: "Sofia", initial: "S", lastFetched: "1h ago" },
];

export default function Option3DetailPage() {
  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      leftNav={<NearstreamLockup size={24} className="text-foreground" />}
      rightNav={
        <Link href="/design/layouts" className={navLinkClasses}>
          ← Layouts
        </Link>
      }
    >
      <main className="mx-auto w-full max-w-5xl px-6 pt-16 pb-24">
        <Kicker>Option 3 detail</Kicker>
        <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
          /reader with sources — three takes
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          The shared structure is settled: <code className="font-mono text-foreground">/studio</code>{" "}
          = post, <code className="font-mono text-foreground">/reader</code> = read + sources,{" "}
          <code className="font-mono text-foreground">/settings</code> = profile + export. What&rsquo;s
          unclear is <em>where on the reader page</em> the sources management goes. Three options
          below — same data, different placement. Each mockup is sized roughly to the real layout
          so the proportions are honest.
        </p>

        <Variant
          n="3a"
          name="Sidebar"
          summary="Feed takes the main column; a sticky 'Following' panel sits on the right with each source as a row + an add-source field at the bottom."
          best="Best if you want to glance at who's posting recently without scrolling. Most desktop-app-like."
        >
          <ReaderSidebar />
        </Variant>

        <Variant
          n="3b"
          name="Compact strip above the feed"
          summary="A single horizontal row above the feed: small initials of each source + an add-source button. Click an initial → quick menu (refresh / remove)."
          best="Best for friends who mostly read the feed and rarely manage sources. Lightest visual footprint."
        >
          <ReaderStrip />
        </Variant>

        <Variant
          n="3c"
          name="Manage drawer"
          summary="Feed is alone on the page. A small 'Manage sources' link in the top nav opens a slide-down panel with the full source list + add form. Closed by default."
          best="Best if you want the reader to feel like reading, with the management hidden until called for."
        >
          <ReaderDrawerClosed />
          <ReaderDrawerOpen />
        </Variant>

        <div className="mt-24 border-t border-border pt-8">
          <p className="text-xs text-muted-soft">
            Tell me <code className="font-mono">3a</code>, <code className="font-mono">3b</code>,
            or <code className="font-mono">3c</code> — I&rsquo;ll wire it up as slice 25.
          </p>
        </div>
      </main>
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Variant frame
// ---------------------------------------------------------------------------
function Variant({
  n,
  name,
  summary,
  best,
  children,
}: {
  n: string;
  name: string;
  summary: string;
  best: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-20">
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-[40px] leading-none text-muted-soft">
          {n}
        </span>
        <div>
          <h2 className="font-mono text-base font-medium text-foreground">
            {name}
          </h2>
          <p className="mt-1 text-sm text-muted">{summary}</p>
        </div>
      </div>
      <p className="mt-3 text-xs italic text-muted-soft">{best}</p>
      <div className="mt-8 flex flex-col gap-6">{children}</div>
    </section>
  );
}

// Fake browser chrome around each mockup. Same dimensions as a typical
// 1024-wide window so proportions read honest.
function Browser({
  path,
  children,
}: {
  path: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="overflow-hidden border border-border">
      <div className="flex items-center gap-3 border-b border-border bg-foreground/[0.02] px-3 py-2">
        <span className="flex items-center gap-1.5">
          <span className="block h-2 w-2 rounded-full bg-border" />
          <span className="block h-2 w-2 rounded-full bg-border" />
          <span className="block h-2 w-2 rounded-full bg-border" />
        </span>
        <span className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          {path}
        </span>
      </div>
      <div className="bg-background">{children}</div>
    </figure>
  );
}

// Top nav inside the mockup — mirrors the real `/reader` nav.
function MockNav({
  rightLink,
}: {
  rightLink?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
        Nearstream
      </span>
      <div className="flex items-center gap-4">
        {rightLink && (
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground underline underline-offset-4 decoration-muted-soft">
            {rightLink}
          </span>
        )}
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Studio →
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3a — Sidebar
// ---------------------------------------------------------------------------
function ReaderSidebar() {
  return (
    <Browser path="/reader">
      <MockNav />
      <div className="grid grid-cols-[1fr_220px]">
        <Feed />
        <aside className="border-l border-border p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-soft">
            Following · {FAKE_SOURCES.length}
          </p>
          <ul className="mt-5 flex flex-col gap-3">
            {FAKE_SOURCES.map((s) => (
              <li
                key={s.name}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <SourceInitial letter={s.initial} />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-foreground">
                      {s.name}
                    </p>
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-soft">
                      {s.lastFetched}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-soft">
                  ⋯
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6 border-t border-border pt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
              Add a friend
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <FakeInput placeholder="Name" />
              <FakeInput placeholder="Feed URL (RSS)" />
              <FakeMonoButton>Add source →</FakeMonoButton>
            </div>
          </div>
          <button
            type="button"
            className="mt-6 block w-full border border-border py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft transition-colors hover:text-foreground"
          >
            Refresh all
          </button>
        </aside>
      </div>
    </Browser>
  );
}

// ---------------------------------------------------------------------------
// 3b — Compact strip above the feed
// ---------------------------------------------------------------------------
function ReaderStrip() {
  return (
    <Browser path="/reader">
      <MockNav />
      <div className="px-6 pt-8">
        <Kicker>Reader</Kicker>
      </div>
      <div className="px-6">
        <div className="mt-5 flex flex-wrap items-center gap-3 border-y border-border py-3">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-soft">
            Following
          </span>
          {FAKE_SOURCES.map((s) => (
            <span
              key={s.name}
              className="flex items-center gap-2"
              title={`${s.name} · ${s.lastFetched}`}
            >
              <SourceInitial letter={s.initial} />
              <span className="text-[12px] text-foreground">{s.name}</span>
            </span>
          ))}
          <button
            type="button"
            className="ml-auto border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground hover:text-background"
          >
            + Add source
          </button>
        </div>
      </div>
      <div className="px-6 pb-12">
        <Feed compact />
      </div>
    </Browser>
  );
}

// ---------------------------------------------------------------------------
// 3c — Manage drawer (closed + open)
// ---------------------------------------------------------------------------
function ReaderDrawerClosed() {
  return (
    <Browser path="/reader  (drawer closed — default)">
      <MockNav rightLink="Manage sources" />
      <div className="px-6 py-8">
        <Kicker>Reader</Kicker>
        <Feed compact />
      </div>
    </Browser>
  );
}

function ReaderDrawerOpen() {
  return (
    <Browser path="/reader  (drawer open — click 'Manage sources')">
      <MockNav rightLink="Manage sources ▾" />
      <section className="border-b border-border bg-foreground/[0.03] px-6 py-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-soft">
            Following · {FAKE_SOURCES.length}
          </p>
          <button
            type="button"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft transition-colors hover:text-foreground"
          >
            Refresh all
          </button>
        </div>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {FAKE_SOURCES.map((s) => (
            <li
              key={s.name}
              className="flex items-center justify-between gap-4 border-t border-border pt-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <SourceInitial letter={s.initial} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-foreground">
                    {s.name}
                  </p>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-soft">
                    Last fetched {s.lastFetched}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-soft">
                  Refresh
                </span>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-soft">
                  Remove
                </span>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-8 grid gap-3 border-t border-border pt-6 sm:grid-cols-[1fr_1fr_auto]">
          <FakeInput placeholder="Name (e.g. Marco)" />
          <FakeInput placeholder="https://marco.xyz/rss.xml" />
          <FakeMonoButton>Add source →</FakeMonoButton>
        </div>
      </section>
      <div className="px-6 py-6">
        <Feed compact />
      </div>
    </Browser>
  );
}

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------
function Feed({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "" : "px-6 py-8"}>
      {!compact && <Kicker>Reader</Kicker>}
      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="text-xl font-normal tracking-tight text-foreground">
          Today
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft underline underline-offset-4 decoration-transparent">
          Refresh all
        </span>
      </div>
      <ul className="mt-6 flex flex-col">
        {FAKE_ENTRIES.map((e, i) => (
          <li
            key={i}
            className="border-t border-border py-6 first:border-t-0 first:pt-0"
          >
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <span className="text-[12.5px] text-foreground">{e.author}</span>
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
            {e.type === "essay" ? (
              <div className="border-l border-border pl-4">
                <p className="text-[18px] leading-snug tracking-tight text-foreground">
                  {e.title}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">
                  {e.body}
                </p>
              </div>
            ) : e.type === "picture" ? (
              <div>
                <div className="aspect-[4/3] w-full max-w-[280px] border border-border bg-foreground/[0.04]" />
                <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/90">
                  {e.body}
                </p>
              </div>
            ) : (
              <p className="text-[14px] leading-relaxed text-foreground/90">
                {e.body}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourceInitial({ letter }: { letter: string }) {
  return (
    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center border border-border bg-foreground/[0.04] font-mono text-[10px] uppercase tracking-[0.1em] text-foreground">
      {letter}
    </span>
  );
}

function FakeInput({ placeholder }: { placeholder: string }) {
  return (
    <div className="border-b border-border bg-transparent px-0 py-1.5 font-sans text-[12.5px] text-muted-soft">
      {placeholder}
    </div>
  );
}

function FakeMonoButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground transition-colors hover:bg-foreground hover:text-background"
    >
      {children}
    </button>
  );
}
