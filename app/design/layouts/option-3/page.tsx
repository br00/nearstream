// Mobile-first revision of option 3's /reader. Friends will mostly read +
// post from their phone, so the sources-management pattern needs to fit a
// 375px screen before we worry about desktop. Three concrete variants below;
// each one shown at phone width (left) and desktop width (right) so the
// same data + chrome reads honest at both sizes.
//
// All three preserve the URL shape from the parent layouts page:
//   /studio    — post (Letter / Stream / Essay / Inventory)
//   /reader    — read (feed + sources)
//   /settings  — profile + export + sign out
// The variants differ only in *where* on /reader the sources management
// surface lives.

import Link from "next/link";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { Kicker } from "@/app/_components/kicker";

export const metadata = {
  title: "Option 3 · mobile-first · Layout lab",
  robots: { index: false, follow: false },
};

const FAKE_ENTRIES = [
  {
    author: "Federico",
    when: "today · 09:14",
    body: "Mountains this morning, going up before the heat.",
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
    body: "New run of cassettes — first prints look promising.",
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

export default function Option3MobileFirstPage() {
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
        <Kicker>Option 3 · mobile-first</Kicker>
        <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
          /reader with sources — phone-first
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Three takes, each shown at phone width (~360 px) and desktop width
          side-by-side. The variants differ only in where the sources
          management lives. Same URL shape across all three: <code className="font-mono text-foreground">/studio</code>{" "}
          = post, <code className="font-mono text-foreground">/reader</code> = read + sources,{" "}
          <code className="font-mono text-foreground">/settings</code> = profile + export.
        </p>

        <Variant
          n="M1"
          name="Sub-page"
          summary="/reader is feed only. A small 'Following · 4 →' pill below the kicker links to /reader/sources, a separate page with the list + add form. Server-rendered, no JS, fully URL-addressable on both screen sizes."
          best="Cleanest and most aligned with the codebase. Each intent has its own URL — bookmarkable, sharable, no overlay state to manage."
        >
          <Frame size="phone" path="/reader" title="Reader">
            <ReaderFeedWithPill compact />
          </Frame>
          <Frame size="phone" path="/reader/sources" title="Following">
            <SourcesPage compact />
          </Frame>
          <Frame size="desktop" path="/reader">
            <ReaderFeedWithPill />
          </Frame>
        </Variant>

        <Variant
          n="M2"
          name="Tabs"
          summary="/reader has FEED | SOURCES tabs below the kicker. Tap to switch — same URL with ?tab=sources. Identical on mobile and desktop."
          best="Single URL, single page. Minimal navigation. Cost: tabs split the page's purpose in two and some readers won't notice the sources tab exists."
        >
          <Frame size="phone" path="/reader" title="Reader · feed">
            <ReaderTabsView active="feed" compact />
          </Frame>
          <Frame size="phone" path="/reader?tab=sources" title="Reader · sources">
            <ReaderTabsView active="sources" compact />
          </Frame>
          <Frame size="desktop" path="/reader">
            <ReaderTabsView active="feed" />
          </Frame>
        </Variant>

        <Variant
          n="M3"
          name="Bottom sheet"
          summary="/reader is feed only. A sticky 'Manage sources ·' chip at the bottom of the screen opens a bottom sheet (mobile) or side panel (desktop) with the full source list + add form."
          best="Most native-app-feeling on a phone — sheets are the iOS/Android pattern for secondary surfaces. Cost: needs client JS for the overlay, and the back button no longer closes it without a custom history shim."
          warning="Needs JS — departs from the codebase's server-first norm."
        >
          <Frame size="phone" path="/reader" title="Reader (closed)">
            <ReaderWithChip compact />
          </Frame>
          <Frame size="phone" path="/reader" title="Reader (sheet open)">
            <ReaderWithSheet compact />
          </Frame>
          <Frame size="desktop" path="/reader (sheet open)">
            <ReaderWithSheet />
          </Frame>
        </Variant>

        <div className="mt-24 border-t border-border pt-8">
          <p className="text-xs text-muted-soft">
            Tell me <code className="font-mono">M1</code>,{" "}
            <code className="font-mono">M2</code>, or{" "}
            <code className="font-mono">M3</code>. My lean: <strong>M1</strong>{" "}
            — fits the codebase, fits the manifesto, no JS needed.
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
  warning,
  children,
}: {
  n: string;
  name: string;
  summary: string;
  best: string;
  warning?: string;
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
      {warning && (
        <p className="mt-2 inline-block border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground">
          ⚠ {warning}
        </p>
      )}
      <div className="mt-8 flex flex-wrap items-start gap-6">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Phone / desktop frame
// ---------------------------------------------------------------------------
function Frame({
  size,
  path,
  title,
  children,
}: {
  size: "phone" | "desktop";
  path: string;
  title?: string;
  children: React.ReactNode;
}) {
  const isPhone = size === "phone";
  const width = isPhone ? "w-[290px]" : "w-full flex-1 min-w-[480px]";
  const innerHeight = isPhone ? "h-[560px]" : "h-[480px]";

  return (
    <figure className={`${width} shrink-0`}>
      <div
        className={`overflow-hidden border border-border ${
          isPhone ? "rounded-[24px]" : ""
        }`}
      >
        <div className="flex items-center gap-3 border-b border-border bg-foreground/[0.02] px-3 py-2">
          {!isPhone && (
            <span className="flex items-center gap-1.5">
              <span className="block h-2 w-2 rounded-full bg-border" />
              <span className="block h-2 w-2 rounded-full bg-border" />
              <span className="block h-2 w-2 rounded-full bg-border" />
            </span>
          )}
          <span className="truncate font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">
            {path}
          </span>
        </div>
        <div className={`relative bg-background ${innerHeight} overflow-y-auto`}>
          {children}
        </div>
      </div>
      {title && (
        <figcaption className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
          {isPhone ? "phone" : "desktop"} · {title}
        </figcaption>
      )}
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------
function TopNav({
  rightLink,
  active,
}: {
  rightLink?: string;
  active?: "studio" | "reader" | "settings";
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground">
        Nearstream
      </span>
      <div className="flex items-center gap-3">
        {rightLink && (
          <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-foreground">
            {rightLink}
          </span>
        )}
        <span
          className={`font-mono text-[9.5px] uppercase tracking-[0.2em] ${
            active === "studio" ? "text-foreground" : "text-muted-soft"
          }`}
        >
          Studio
        </span>
      </div>
    </div>
  );
}

function FollowingPill() {
  return (
    <div className="mt-3 inline-flex items-center gap-2 border border-border px-3 py-1.5">
      <span className="flex -space-x-1">
        {FAKE_SOURCES.slice(0, 3).map((s) => (
          <span
            key={s.name}
            className="flex h-4 w-4 items-center justify-center border border-border bg-background font-mono text-[8px] uppercase text-foreground"
          >
            {s.initial}
          </span>
        ))}
      </span>
      <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-foreground">
        Following · {FAKE_SOURCES.length} →
      </span>
    </div>
  );
}

function Feed({ compact = false }: { compact?: boolean }) {
  return (
    <ul className={`flex flex-col ${compact ? "mt-4" : "mt-6"}`}>
      {FAKE_ENTRIES.map((e, i) => (
        <li
          key={i}
          className={`border-t border-border ${
            compact ? "py-4" : "py-6"
          } first:border-t-0 first:pt-0`}
        >
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span
              className={`${compact ? "text-[11.5px]" : "text-[12.5px]"} text-foreground`}
            >
              {e.author}
            </span>
            <span
              className={`whitespace-nowrap font-mono ${
                compact ? "text-[8.5px]" : "text-[10px]"
              } uppercase tracking-[0.22em] tabular-nums text-muted-soft`}
            >
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
            <div className="border-l border-border pl-3">
              <p
                className={`${compact ? "text-[14px]" : "text-[18px]"} leading-snug tracking-tight text-foreground`}
              >
                {e.title}
              </p>
              <p
                className={`mt-1 ${compact ? "text-[11px]" : "text-[13px]"} leading-relaxed text-muted`}
              >
                {e.body}
              </p>
            </div>
          ) : e.type === "picture" ? (
            <div>
              <div
                className={`aspect-[4/3] ${
                  compact ? "max-w-[180px]" : "max-w-[280px]"
                } w-full border border-border bg-foreground/[0.04]`}
              />
              <p
                className={`mt-2 ${compact ? "text-[11.5px]" : "text-[13.5px]"} leading-relaxed text-foreground/90`}
              >
                {e.body}
              </p>
            </div>
          ) : (
            <p
              className={`${compact ? "text-[12px]" : "text-[14px]"} leading-relaxed text-foreground/90`}
            >
              {e.body}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function SourceInitial({
  letter,
  compact = false,
}: {
  letter: string;
  compact?: boolean;
}) {
  const size = compact ? "h-6 w-6 text-[9px]" : "h-7 w-7 text-[10px]";
  return (
    <span
      className={`flex flex-shrink-0 items-center justify-center border border-border bg-foreground/[0.04] font-mono uppercase tracking-[0.1em] text-foreground ${size}`}
    >
      {letter}
    </span>
  );
}

function FakeInput({
  placeholder,
  compact = false,
}: {
  placeholder: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`border-b border-border bg-transparent px-0 ${
        compact ? "py-1.5 text-[11px]" : "py-2 text-[12.5px]"
      } font-sans text-muted-soft`}
    >
      {placeholder}
    </div>
  );
}

function SourceRow({
  source,
  compact = false,
}: {
  source: (typeof FAKE_SOURCES)[number];
  compact?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 border-t border-border py-3 first:border-t-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <SourceInitial letter={source.initial} compact={compact} />
        <div className="min-w-0">
          <p
            className={`truncate ${compact ? "text-[12px]" : "text-[13px]"} text-foreground`}
          >
            {source.name}
          </p>
          <p
            className={`font-mono ${
              compact ? "text-[8.5px]" : "text-[9.5px]"
            } uppercase tracking-[0.18em] text-muted-soft`}
          >
            Last fetched {source.lastFetched}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`font-mono ${
            compact ? "text-[8.5px]" : "text-[10px]"
          } uppercase tracking-[0.18em] text-muted-soft`}
        >
          Refresh
        </span>
        <span
          className={`font-mono ${
            compact ? "text-[8.5px]" : "text-[10px]"
          } uppercase tracking-[0.18em] text-muted-soft`}
        >
          ✕
        </span>
      </div>
    </li>
  );
}

function AddSourceBlock({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`mt-6 border-t border-border ${compact ? "pt-4" : "pt-5"}`}>
      <p
        className={`font-mono ${
          compact ? "text-[9px]" : "text-[10px]"
        } uppercase tracking-[0.22em] text-muted-soft`}
      >
        Add a friend
      </p>
      <div className={`mt-3 flex flex-col ${compact ? "gap-2" : "gap-3"}`}>
        <FakeInput placeholder="Name" compact={compact} />
        <FakeInput placeholder="Feed URL (RSS)" compact={compact} />
        <button
          type="button"
          className={`self-start border border-border ${
            compact ? "px-3 py-1.5 text-[9px]" : "px-3 py-2 text-[10px]"
          } font-mono uppercase tracking-[0.22em] text-foreground transition-colors hover:bg-foreground hover:text-background`}
        >
          Add source →
        </button>
      </div>
    </div>
  );
}

function SourcesPage({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <TopNav rightLink="← Reader" />
      <div className={`${compact ? "px-4 pt-5" : "px-6 pt-8"}`}>
        <Kicker>Following</Kicker>
        <div className="mt-3 flex items-baseline justify-between">
          <h2
            className={`${
              compact ? "text-[17px]" : "text-xl"
            } font-normal tracking-tight text-foreground`}
          >
            {FAKE_SOURCES.length} friends
          </h2>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-soft">
            Refresh all
          </span>
        </div>
        <ul className="mt-5">
          {FAKE_SOURCES.map((s) => (
            <SourceRow key={s.name} source={s} compact={compact} />
          ))}
        </ul>
        <AddSourceBlock compact={compact} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// M1 — Sub-page
// ---------------------------------------------------------------------------
function ReaderFeedWithPill({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <TopNav active="reader" />
      <div className={compact ? "px-4 pt-5" : "px-6 pt-8"}>
        <Kicker>Reader</Kicker>
        <FollowingPill />
        <div className="mt-5 flex items-baseline justify-between">
          <h2
            className={`${
              compact ? "text-[17px]" : "text-xl"
            } font-normal tracking-tight text-foreground`}
          >
            Today
          </h2>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-soft">
            Refresh
          </span>
        </div>
        <Feed compact={compact} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// M2 — Tabs
// ---------------------------------------------------------------------------
function ReaderTabsView({
  active,
  compact = false,
}: {
  active: "feed" | "sources";
  compact?: boolean;
}) {
  return (
    <>
      <TopNav active="reader" />
      <div className={compact ? "px-4 pt-5" : "px-6 pt-8"}>
        <Kicker>Reader</Kicker>
        <div className="mt-4 flex gap-1 border-b border-border">
          <TabPill label="Feed" active={active === "feed"} />
          <TabPill
            label={`Sources · ${FAKE_SOURCES.length}`}
            active={active === "sources"}
          />
        </div>
        {active === "feed" ? (
          <Feed compact={compact} />
        ) : (
          <div className={compact ? "mt-4" : "mt-6"}>
            <ul>
              {FAKE_SOURCES.map((s) => (
                <SourceRow key={s.name} source={s} compact={compact} />
              ))}
            </ul>
            <AddSourceBlock compact={compact} />
          </div>
        )}
      </div>
    </>
  );
}

function TabPill({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] ${
        active
          ? "border-b border-foreground text-foreground"
          : "text-muted-soft"
      }`}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// M3 — Bottom sheet
// ---------------------------------------------------------------------------
function ReaderWithChip({ compact = false }: { compact?: boolean }) {
  return (
    <div className="relative h-full">
      <TopNav active="reader" />
      <div className={compact ? "px-4 pt-5" : "px-6 pt-8"}>
        <Kicker>Reader</Kicker>
        <div className="mt-3 flex items-baseline justify-between">
          <h2
            className={`${
              compact ? "text-[17px]" : "text-xl"
            } font-normal tracking-tight text-foreground`}
          >
            Today
          </h2>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-soft">
            Refresh
          </span>
        </div>
        <Feed compact={compact} />
      </div>
      <div className="pointer-events-none sticky bottom-3 flex justify-center pb-3">
        <span className="pointer-events-auto inline-flex items-center gap-2 border border-foreground bg-background px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
          <span className="flex -space-x-1">
            {FAKE_SOURCES.slice(0, 3).map((s) => (
              <span
                key={s.name}
                className="flex h-4 w-4 items-center justify-center border border-foreground bg-background text-[8px] uppercase text-foreground"
              >
                {s.initial}
              </span>
            ))}
          </span>
          Manage sources · {FAKE_SOURCES.length}
        </span>
      </div>
    </div>
  );
}

function ReaderWithSheet({ compact = false }: { compact?: boolean }) {
  return (
    <div className="relative h-full">
      <TopNav active="reader" />
      <div className={compact ? "px-4 pt-5" : "px-6 pt-8"}>
        <Kicker>Reader</Kicker>
        <Feed compact={compact} />
      </div>
      {/* Sheet */}
      <div className="absolute inset-x-0 bottom-0 border-t border-foreground/30 bg-foreground/[0.04] px-4 pt-3 pb-5 backdrop-blur">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground">
            Following · {FAKE_SOURCES.length}
          </p>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
            ✕
          </span>
        </div>
        <ul className="mt-3 max-h-[180px] overflow-y-auto">
          {FAKE_SOURCES.map((s) => (
            <SourceRow key={s.name} source={s} compact={compact} />
          ))}
        </ul>
        <AddSourceBlock compact={compact} />
      </div>
    </div>
  );
}
