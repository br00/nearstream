// Static UI prototypes for the /studio split. Five layout options side-by-
// side, each rendered as a small "browser frame" mockup so we can compare
// the URL structure, nav, and on-page content without wiring up real
// interactivity. Pick one — I'll build it as slice 25.
//
// Colour coding makes the three buckets obvious across all five:
//   foreground tint   → posting surfaces (Letter / Stream / Essay / Inventory)
//   muted tint        → reader surfaces (feed / sources)
//   muted-soft tint   → settings surfaces (profile mark / display name / export)

import Link from "next/link";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { Kicker } from "@/app/_components/kicker";

export const metadata = {
  title: "Layout lab · Nearstream",
  robots: { index: false, follow: false },
};

type BucketKind = "post" | "read" | "settings" | "nav" | "host";

const bucketLabel: Record<BucketKind, string> = {
  post: "POST",
  read: "READ",
  settings: "SETTINGS",
  nav: "NAV",
  host: "HOST",
};

const bucketClasses: Record<BucketKind, string> = {
  post: "border-foreground/60 bg-foreground/[0.06]",
  read: "border-muted/50 bg-muted/[0.06]",
  settings: "border-muted-soft/50 bg-muted-soft/[0.05]",
  nav: "border-border bg-foreground/[0.02]",
  host: "border-foreground/30 bg-foreground/[0.04]",
};

export default function LayoutLabPage() {
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
      <main className="mx-auto w-full max-w-5xl px-6 pt-16 pb-24">
        <Kicker>Layout lab</Kicker>
        <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
          /studio split — five takes
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Federico said he got lost. The current /studio is eight sections on
          one page. Each option below proposes a different home for those
          sections. Pick the structure that feels right; I&rsquo;ll build it.
        </p>

        <Legend />

        <Option
          n="1"
          name="Three-tab Studio"
          summary="One URL (/studio), three tabs (Post / Read / Settings) inside."
          pros="Minimal URL change. One door."
          cons="Tabs feel hacky on web; still one heavy page."
        >
          <Browser path="/studio">
            <Nav links={["Studio", "Sign out"]} active="Studio" />
            <Tabs labels={["Post", "Read", "Settings"]} active="Post" />
            <Stack>
              <Block kind="post" title="Letter" sub="standing note" />
              <Block kind="post" title="New stream entry" sub="textarea + mode" big />
              <Block kind="post" title="New essay" sub="title + markdown" big />
              <Block kind="post" title="New inventory item" sub="image + meta" big />
            </Stack>
          </Browser>
        </Option>

        <Option
          n="2"
          name="Three top-level routes"
          summary="/studio = post · /reader = read · /settings = profile + sources + export"
          pros="Cleanest separation. Three intents, three URLs."
          cons="Sources logically pair with reader but live in settings."
        >
          <Browser path="/studio">
            <Nav links={["Studio", "Reader", "Settings"]} active="Studio" />
            <Stack>
              <Block kind="post" title="Letter" />
              <Block kind="post" title="New stream entry" big />
              <Block kind="post" title="New essay" big />
              <Block kind="post" title="New inventory item" big />
            </Stack>
          </Browser>
          <Browser path="/reader">
            <Nav links={["Studio", "Reader", "Settings"]} active="Reader" />
            <Stack>
              <Block kind="read" title="Feed" sub="recent entries from sources" big />
              <Block kind="read" title="Feed" sub="recent entries from sources" big />
            </Stack>
          </Browser>
          <Browser path="/settings">
            <Nav links={["Studio", "Reader", "Settings"]} active="Settings" />
            <Stack>
              <Block kind="settings" title="Profile mark" sub="picker grid" big />
              <Block kind="settings" title="Display name" />
              <Block kind="read" title="Reader sources" sub="add + list + refresh" big />
              <Block kind="settings" title="Export" />
              <Block kind="settings" title="Sign out" />
            </Stack>
          </Browser>
        </Option>

        <Option
          n="3"
          name="Sources live with Reader"
          summary="/studio = post · /reader = read + sources · /settings = profile + export"
          pros="Sources sit with consumption. Settings stays tiny and rare."
          cons="/reader carries more UI; settings becomes nearly empty."
          highlighted
        >
          <Browser path="/studio">
            <Nav links={["Studio", "Reader", "Settings"]} active="Studio" />
            <Stack>
              <Block kind="post" title="Letter" />
              <Block kind="post" title="New stream entry" big />
              <Block kind="post" title="New essay" big />
              <Block kind="post" title="New inventory item" big />
            </Stack>
          </Browser>
          <Browser path="/reader">
            <Nav links={["Studio", "Reader", "Settings"]} active="Reader" />
            <SplitTwoCols
              main={
                <Stack>
                  <Block kind="read" title="Feed" sub="recent entries" big />
                  <Block kind="read" title="Feed" sub="recent entries" big />
                </Stack>
              }
              side={
                <Stack>
                  <Block kind="read" title="+ Add source" sub="name · feed URL" />
                  <Block kind="read" title="Following" sub="list + refresh" />
                </Stack>
              }
            />
          </Browser>
          <Browser path="/settings">
            <Nav links={["Studio", "Reader", "Settings"]} active="Settings" />
            <Stack>
              <Block kind="settings" title="Profile mark" sub="picker grid" big />
              <Block kind="settings" title="Display name" />
              <Block kind="settings" title="Export" />
              <Block kind="settings" title="Sign out" />
            </Stack>
          </Browser>
        </Option>

        <Option
          n="4"
          name="Floating composer (no /studio)"
          summary="Reader is the main destination. A + Post button opens a composer overlay from anywhere."
          pros="Most app-like. First impression is the feed, not a form wall."
          cons={`Needs client interactivity for the overlay; departs from "every page works without JS".`}
        >
          <Browser path="/reader">
            <Nav links={["Reader", "Settings", "+ Post"]} active="Reader" />
            <Stack>
              <Block kind="read" title="Feed" sub="recent entries" big />
              <Block kind="read" title="Feed" sub="recent entries" big />
              <Block kind="read" title="Feed" sub="recent entries" big />
            </Stack>
            <OverlayHint />
          </Browser>
          <Browser path="/settings">
            <Nav links={["Reader", "Settings", "+ Post"]} active="Settings" />
            <Stack>
              <Block kind="settings" title="Profile mark" sub="picker grid" big />
              <Block kind="settings" title="Display name" />
              <Block kind="read" title="Reader sources" sub="add + list + refresh" big />
              <Block kind="settings" title="Export" />
              <Block kind="settings" title="Sign out" />
            </Stack>
          </Browser>
        </Option>

        <Option
          n="5"
          name="Focused Studio"
          summary="/studio opens to just the Stream composer. + More reveals Essay / Inventory / Letter."
          pros="Removes Federico's first-glance overwhelm. One textarea up front."
          cons="Discovery problem moves to 'where do I find essay?'"
        >
          <Browser path="/studio">
            <Nav links={["Studio", "Reader", "Settings"]} active="Studio" />
            <Stack>
              <Block
                kind="post"
                title="New stream entry"
                sub="textarea · mode · post"
                big
              />
              <Block
                kind="post"
                title="+ More"
                sub="reveals Essay / Inventory / Letter"
                muted
              />
            </Stack>
          </Browser>
          <Browser path="/studio (+ More expanded)">
            <Nav links={["Studio", "Reader", "Settings"]} active="Studio" />
            <Stack>
              <Block kind="post" title="New stream entry" big />
              <Block kind="post" title="Letter" />
              <Block kind="post" title="New essay" big />
              <Block kind="post" title="New inventory item" big />
            </Stack>
          </Browser>
          <Browser path="/settings">
            <Nav links={["Studio", "Reader", "Settings"]} active="Settings" />
            <Stack>
              <Block kind="settings" title="Profile mark" sub="picker grid" big />
              <Block kind="settings" title="Display name" />
              <Block kind="read" title="Reader sources" sub="add + list + refresh" big />
              <Block kind="settings" title="Export" />
              <Block kind="settings" title="Sign out" />
            </Stack>
          </Browser>
        </Option>

        <div className="mt-24 border-t border-border pt-8">
          <p className="text-xs text-muted-soft">
            Tell me the number — I&rsquo;ll wire it up as slice 25.
          </p>
        </div>
      </main>
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Layout primitives — all server-rendered, no client JS.
// ---------------------------------------------------------------------------

function Legend() {
  return (
    <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 border border-border p-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
        Legend
      </span>
      <LegendChip kind="post">Posting</LegendChip>
      <LegendChip kind="read">Reader / sources</LegendChip>
      <LegendChip kind="settings">Settings</LegendChip>
    </div>
  );
}

function LegendChip({
  kind,
  children,
}: {
  kind: BucketKind;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground ${bucketClasses[kind]}`}
    >
      <span className="block h-1.5 w-1.5 rounded-full bg-foreground/70" />
      {children}
    </span>
  );
}

function Option({
  n,
  name,
  summary,
  pros,
  cons,
  highlighted,
  children,
}: {
  n: string;
  name: string;
  summary: string;
  pros: string;
  cons: string;
  highlighted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`mt-20 ${
        highlighted
          ? "border-l-2 border-foreground/60 pl-6"
          : ""
      }`}
    >
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-[40px] leading-none text-muted-soft">
          {n}
        </span>
        <div>
          <h2 className="font-mono text-base font-medium text-foreground">
            {name}
            {highlighted && (
              <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/70">
                · my pick
              </span>
            )}
          </h2>
          <p className="mt-1 text-sm text-muted">{summary}</p>
        </div>
      </div>
      <dl className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-[64px_1fr]">
        <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
          Pros
        </dt>
        <dd className="text-sm text-muted">{pros}</dd>
        <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
          Cons
        </dt>
        <dd className="text-sm text-muted">{cons}</dd>
      </dl>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

// Fake "browser window" frame for one page mockup.
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
      <div className="flex flex-col gap-3 bg-background p-4">{children}</div>
    </figure>
  );
}

function Nav({
  links,
  active,
}: {
  links: string[];
  active: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-border pb-3">
      {links.map((l) => (
        <span
          key={l}
          className={`px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] ${
            l === active
              ? "border border-foreground text-foreground"
              : "text-muted-soft"
          }`}
        >
          {l}
        </span>
      ))}
    </div>
  );
}

function Tabs({
  labels,
  active,
}: {
  labels: string[];
  active: string;
}) {
  return (
    <div className="-mx-1 flex gap-1 border-b border-border pb-2">
      {labels.map((l) => (
        <span
          key={l}
          className={`px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] ${
            l === active
              ? "border-b border-foreground text-foreground"
              : "text-muted-soft"
          }`}
        >
          {l}
        </span>
      ))}
    </div>
  );
}

function Stack({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

function Block({
  kind,
  title,
  sub,
  big,
  muted,
}: {
  kind: BucketKind;
  title: string;
  sub?: string;
  big?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`border px-3 py-2 ${
        bucketClasses[kind]
      } ${big ? "min-h-[64px]" : ""} ${muted ? "border-dashed opacity-70" : ""}`}
    >
      <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">
        <span className="font-mono text-[8.5px] uppercase tracking-[0.25em] text-muted-soft">
          {bucketLabel[kind]}
        </span>
        <span className="text-foreground">·</span>
        <span>{title}</span>
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

function SplitTwoCols({
  main,
  side,
}: {
  main: React.ReactNode;
  side: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
      <div>{main}</div>
      <div>{side}</div>
    </div>
  );
}

function OverlayHint() {
  return (
    <div className="mt-1 border border-dashed border-foreground/60 bg-foreground/[0.04] p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground">
        Composer overlay
      </p>
      <p className="mt-1 text-[11px] text-muted">
        Opens on + Post · tabs inside: Stream / Picture / Essay / Letter
      </p>
    </div>
  );
}
