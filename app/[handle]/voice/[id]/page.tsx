// Per-voice-note detail page. Voice notes render inline on the tenant
// home + `/stream` list, but a shareable URL needs its own route so
// LinkedIn/WhatsApp/etc can render a bespoke OG preview instead of the
// tenant OG. Path: `/{handle}/voice/{entryId}`.
//
// Kept intentionally minimal — audio player, optional caption, author +
// timestamp, and a link back to the tenant home. Everything else is
// contextual noise for the "here, listen to this one thing" share flow.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { store } from "@/lib/store";
import { userStore } from "@/lib/user-store";
import { getSession } from "@/lib/auth";
import { checkTenantVisibility } from "@/lib/tenant-visibility";
import { tenantBase } from "@/lib/tenant-domains";
import { visibilityOf } from "@/schemas/visibility";
import { PageShell } from "@/app/_components/page-shell";
import { AudioPlayer } from "@/app/_components/audio-player";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ handle: string; id: string }>;
};

function formatFull(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function generateMetadata({ params }: Props) {
  const { handle, id } = await params;
  const user = await userStore.getByHandle(handle);
  if (!user) return { title: "Voice note · Nearstream" };
  const entry = await store.getById(user.id, id);
  const displayName = user.displayName || handle;
  const title = entry?.text
    ? `${displayName} — voice note`
    : `${displayName} — voice note`;
  const description = entry?.text
    ? entry.text.slice(0, 160)
    : `A voice note from ${displayName} on Nearstream.`;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "Nearstream",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function VoiceNotePage({ params }: Props) {
  const { handle, id } = await params;
  const user = await userStore.getByHandle(handle);
  if (!user) notFound();

  const session = await getSession();
  const gate = checkTenantVisibility(user, session);
  if (!gate.allowed) {
    if (gate.reason === "sign-in") {
      redirect(`/login?next=${encodeURIComponent(`/${handle}/voice/${id}`)}&reason=private-tenant`);
    }
    notFound();
  }

  const entry = await store.getById(user.id, id);
  if (!entry || !entry.audio) notFound();

  // Non-owners only see public entries — mirror the tenant page rule.
  const isOwner = session?.userId === user.id;
  if (!isOwner && visibilityOf(entry) !== "public") notFound();

  const displayName = user.displayName || handle;
  const base = tenantBase(handle);
  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      rightNav={
        <Link href={base} className={navLinkClasses}>
          {displayName} →
        </Link>
      }
    >
      <div className="mx-auto flex max-w-md flex-col items-center gap-8 pt-16 pb-24">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-soft">
          Voice note · {formatFull(entry.publishedAt)}
        </span>

        <AudioPlayer
          src={`/api/media/${entry.audio.key}`}
          durationMs={entry.audio.durationMs}
          mime={entry.audio.mime}
          size={280}
        />

        {entry.text && (
          <p className="text-center text-[17px] leading-relaxed text-foreground/95">
            &ldquo;{entry.text}&rdquo;
          </p>
        )}

        <Link
          href={base}
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground underline underline-offset-4 decoration-muted-soft hover:decoration-foreground"
        >
          {displayName} on Nearstream →
        </Link>
      </div>
    </PageShell>
  );
}
