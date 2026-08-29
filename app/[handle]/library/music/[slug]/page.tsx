// Music track detail page (slice 40). Path: `/{handle}/library/music/{slug}`.
//
// The counterpart to the voice-note page, and deliberately more of a
// *record* than that one: a track has a cover, a byline and notes, and the
// page is where it lives permanently rather than a share surface for
// something that scrolled past. Cover above, player, then notes.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { marked } from "marked";
import { musicStore } from "@/lib/music-store";
import { userStore } from "@/lib/user-store";
import { normalizeVoiceViz } from "@/lib/voice-viz-variants";
import { getSession } from "@/lib/auth";
import { checkTenantVisibility } from "@/lib/tenant-visibility";
import { tenantBase } from "@/lib/tenant-domains";
import { visibilityOf } from "@/schemas/visibility";
import { formatTrackDuration } from "@/schemas/music";
import { PageShell } from "@/app/_components/page-shell";
import { Kicker } from "@/app/_components/kicker";
import { AudioPlayer } from "@/app/_components/audio-player";
import { DeleteButton } from "@/app/_components/delete-button";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ handle: string; slug: string }>;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function generateMetadata({ params }: Props) {
  const { handle, slug } = await params;
  const user = await userStore.getByHandle(handle);
  if (!user) return { title: "Track · Nearstream" };
  const track = await musicStore.getBySlug(user.id, slug);
  if (!track) return { title: "Track · Nearstream" };
  const displayName = user.displayName || handle;
  const byline = track.artist ? `${track.artist} — ${track.title}` : track.title;
  const description =
    track.description?.slice(0, 160) ?? `A track from ${displayName} on Nearstream.`;
  return {
    title: `${byline} · ${displayName}`,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title: byline,
      description,
      type: "music.song",
      siteName: "Nearstream",
    },
  };
}

export default async function MusicTrackPage({ params }: Props) {
  const { handle, slug } = await params;
  const user = await userStore.getByHandle(handle);
  if (!user) notFound();

  const session = await getSession();
  const gate = checkTenantVisibility(user, session);
  if (!gate.allowed) {
    if (gate.reason === "sign-in") {
      redirect(
        `/login?next=${encodeURIComponent(`/${handle}/library/music/${slug}`)}&reason=private-tenant`,
      );
    }
    notFound();
  }

  const track = await musicStore.getBySlug(user.id, slug);
  if (!track) notFound();

  const isOwner = session?.userId === user.id;
  if (visibilityOf(track) === "private" && !isOwner) notFound();

  const base = tenantBase(handle);
  const displayName = user.displayName || handle;
  const durationLabel = formatTrackDuration(track.audio.durationMs);
  const descriptionHtml = track.description
    ? await marked.parse(track.description, { async: true })
    : null;

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      rightNav={
        <>
          <Link href={`${base}/library`} className={navLinkClasses}>
            ← Library
          </Link>
          {isOwner && (
            <Link href="/studio" className={navLinkClasses}>
              Studio →
            </Link>
          )}
        </>
      }
    >
      <section className="flex flex-1 justify-center px-6">
        <div className="flex w-full max-w-lg flex-col items-center gap-8 py-12">
          <div className="w-full">
            <Kicker>Track</Kicker>
            <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
              {track.title}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {track.artist ?? displayName}
              {durationLabel && (
                <>
                  {" · "}
                  <span className="font-mono tabular-nums">{durationLabel}</span>
                </>
              )}
              {visibilityOf(track) === "private" && (
                <>
                  {" · "}
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/70">
                    Private
                  </span>
                </>
              )}
            </p>
          </div>

          {track.cover && (
            <div className="w-full overflow-hidden bg-foreground/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/media/${track.cover.key}`}
                alt={`Cover for ${track.title}`}
                width={track.cover.width}
                height={track.cover.height}
                className="h-auto w-full object-cover"
              />
            </div>
          )}

          <AudioPlayer
            src={`/api/media/${track.audio.key}`}
            durationMs={track.audio.durationMs ?? 0}
            mime={track.audio.mime}
            size={240}
            variant={normalizeVoiceViz(user.preferences?.voiceViz)}
          />

          {descriptionHtml && (
            <div
              className="prose-essay w-full text-[15px] leading-relaxed text-foreground/90"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          )}

          <div className="flex w-full items-center justify-between border-t border-border pt-6">
            <time
              dateTime={track.publishedAt}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted tabular-nums"
            >
              {formatDate(track.publishedAt)}
            </time>
            {isOwner && (
              <DeleteButton
                action={`/api/music/${track.slug}/delete`}
                confirmMessage={`Delete "${track.title}"? The audio file and cover are deleted too. This can't be undone.`}
                label="Delete track"
              />
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
