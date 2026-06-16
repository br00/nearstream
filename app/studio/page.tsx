import Link from "next/link";
import { redirect } from "next/navigation";
import { essayStore } from "@/lib/essay-store";
import { inventoryStore } from "@/lib/inventory-store";
import { letterStore } from "@/lib/letter-store";
import { store as streamStore } from "@/lib/store";
import { userStore } from "@/lib/user-store";
import { tenantBase } from "@/lib/tenant-domains";
import { getSession } from "@/lib/auth";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamMark } from "@/app/_components/nearstream-mark";
import { AuthedNavTop, AuthedNavBottom } from "@/app/_components/authed-nav";
import { Kicker } from "@/app/_components/kicker";
import { StudioComposer } from "@/app/_components/studio-composer";

// Studio is the *posting* surface only. Slice 25 split everything else out:
// reader sources live at /reader/friends; profile + export + sign-out + host
// tools live at /settings. Slice 29 then collapsed the four-stacked-forms
// monolith into a compose-first picker (StudioComposer client component) so
// posting a Stream entry takes one tap, not three screens of scroll.

export const metadata = {
  title: "Studio · Nearstream",
};

type Props = {
  searchParams: Promise<{
    "essay-error"?: string;
    "letter-error"?: string;
  }>;
};

export default async function StudioPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await userStore.getById(session.userId);
  if (!user) redirect("/login");
  if (!user.handle) redirect("/onboarding");

  const { "essay-error": essayError, "letter-error": letterError } =
    await searchParams;

  const [letter, essays, inventoryItems, streams] = await Promise.all([
    letterStore.get(user.id),
    essayStore.list(user.id),
    inventoryStore.list(user.id),
    streamStore.list(user.id),
  ]);

  // First-time empty state is gauged on *posting* signals only — sources
  // moved to /reader/friends and are out of scope for "did you start yet?"
  const isFirstTime =
    !letter &&
    streams.length === 0 &&
    essays.length === 0 &&
    inventoryItems.length === 0;

  // If a server-side form action redirected back here with an error, open
  // the relevant primitive automatically so the error renders next to the
  // form that produced it. Stream is the default otherwise.
  const initialActive = letterError
    ? "letter"
    : essayError
      ? "essay"
      : "stream";

  // Strip to plain props (server → client boundary). The composer only
  // needs id/slug/title for the "link to library" select.
  const essayPicks = essays.map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
  }));
  const inventoryPicks = inventoryItems.map((i) => ({
    id: i.id,
    slug: i.slug,
    title: i.title,
  }));

  return (
    <PageShell
      leftNav={<NearstreamMark size={24} className="text-foreground" />}
      rightNav={<AuthedNavTop active="studio" tenantHandle={user.handle} />}
    >
      <section className="flex flex-1 justify-center px-6 pb-24 sm:pb-12">
        <div className="w-full max-w-lg py-12">
          <Kicker>Studio</Kicker>
          <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
            Post something
          </h1>

          {isFirstTime && (
            <div className="mt-6 border-l-2 border-foreground/40 pl-4">
              <Kicker>
                Welcome, {user.displayName.split(" ")[0] || user.handle}
              </Kicker>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                This is your studio &mdash; the room where you write things.
                Start with a{" "}
                <strong className="text-foreground">Stream entry</strong>{" "}
                below: a short note, no title, no commitment. Your site lives
                at{" "}
                <Link
                  href={tenantBase(user.handle)}
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  {tenantBase(user.handle).replace(/^https?:\/\//, "")}
                </Link>
                .
              </p>
            </div>
          )}

          <div className="mt-10">
            <StudioComposer
              initialActive={initialActive}
              letterBody={letter?.body ?? null}
              letterError={letterError}
              essayError={essayError}
              essays={essayPicks}
              inventoryItems={inventoryPicks}
            />
          </div>
        </div>
      </section>
      <AuthedNavBottom active="studio" tenantHandle={user.handle} />
    </PageShell>
  );
}
