// One entry on the tenant home, rendered as whatever it actually is.
//
// The old home gave every kind the same row — a date, then some text — so a
// photograph, a one-liner, a track and an essay all read as one type of
// object and the page had no shape before you read it. Here the kind IS the
// form:
//
//   short line  set large; one sentence is the whole post, so it gets to be
//               the size of one
//   long line   set small and narrow — length and size run opposite
//   picture     full width, no frame, no caption box
//   voice/track a band of sound rather than a thumbnail
//   essay       the only thing on the page with a rule and a headline
//
// Age comes in as inline opacity/blur from `buildHomeTimeline`; the hover
// and focus restore live in globals.css so they can't be recomputed per
// entry.

import Link from "next/link";
import type { HomeEntry } from "@/lib/home-timeline";

/**
 * A deterministic bar profile, seeded off the id so a given track always
 * draws the same shape. Not the real waveform — decoding audio server-side
 * to draw a 60px strip isn't worth it — but stable, which is what stops it
 * reading as decoration.
 */
function bars(seed: string, count: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    const n = ((h >>> 0) % 1000) / 1000;
    out.push(24 + n * 72);
  }
  return out;
}

function Margin({ entry, date }: { entry: HomeEntry; date: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      <span className="font-mono text-[9.5px] tracking-[0.18em] text-muted-soft tabular-nums">
        {String(entry.number).padStart(3, "0")}
      </span>
      <time
        dateTime={entry.publishedAt}
        className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-soft tabular-nums"
      >
        {date}
      </time>
      {entry.wet && (
        <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-soft">
          · setting
        </span>
      )}
      {entry.sealed && (
        <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-foreground/60">
          · sealed
        </span>
      )}
    </div>
  );
}

function Waveform({ id, count }: { id: string; count: number }) {
  return (
    <div className="flex h-11 flex-1 items-center gap-[2px] overflow-hidden">
      {bars(id, count).map((h, i) => (
        <span
          key={i}
          aria-hidden
          className="w-[2px] flex-none rounded-[1px] bg-foreground/55"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

export function HomeEntryBlock({
  entry,
  date,
}: {
  entry: HomeEntry;
  date: string;
}) {
  const body = (() => {
    switch (entry.kind) {
      case "line":
        return entry.long ? (
          <p className="max-w-[46ch] text-[15px] leading-[1.7] text-muted">
            {entry.text}
          </p>
        ) : (
          <p className="max-w-[20ch] text-[25px] leading-[1.22] tracking-[-0.02em] text-foreground sm:text-[32px]">
            {entry.text}
          </p>
        );

      case "picture":
        return (
          <>
            <div className="w-full overflow-hidden bg-foreground/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/media/${entry.imageKey}`}
                alt={entry.title ?? ""}
                className="h-auto w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="mt-3 flex items-baseline gap-3 text-[14px] text-muted">
              <span>{entry.title}</span>
              {entry.imageCount && entry.imageCount > 1 && (
                <span className="font-mono text-[9.5px] tracking-[0.18em] text-muted-soft tabular-nums">
                  · {entry.imageCount}
                </span>
              )}
            </div>
          </>
        );

      case "voice":
        return (
          <>
            <div className="flex items-center gap-4">
              <span aria-hidden className="text-[15px] text-muted">
                ▶
              </span>
              <Waveform id={entry.id} count={64} />
              {entry.durationLabel && (
                <span className="font-mono text-[9.5px] tracking-[0.18em] text-muted-soft tabular-nums">
                  {entry.durationLabel}
                </span>
              )}
            </div>
            {entry.text && (
              <p className="mt-3 max-w-[46ch] text-[15px] leading-[1.7] text-muted">
                {entry.text}
              </p>
            )}
          </>
        );

      case "track":
        return (
          <>
            <div className="flex items-center gap-4">
              <span aria-hidden className="text-[15px] text-muted">
                ▶
              </span>
              <Waveform id={entry.id} count={64} />
              {entry.durationLabel && (
                <span className="font-mono text-[9.5px] tracking-[0.18em] text-muted-soft tabular-nums">
                  {entry.durationLabel}
                </span>
              )}
            </div>
            <div className="mt-3 text-[14px] text-muted">
              {entry.title}
              {entry.text ? ` · ${entry.text}` : ""}
            </div>
          </>
        );

      case "essay":
        return (
          <>
            <hr className="border-0 border-t-2 border-foreground" />
            <h2 className="mt-3.5 text-[20px] tracking-[-0.015em] text-foreground sm:text-[25px]">
              {entry.title}
            </h2>
            {entry.excerpt && (
              <p className="mt-2 max-w-[46ch] text-[15px] leading-[1.65] text-muted">
                {entry.excerpt}
              </p>
            )}
          </>
        );
    }
  })();

  const inner = (
    <>
      <Margin entry={entry} date={date} />
      {body}
    </>
  );

  return (
    <article
      // `home-entry` carries the age treatment + the hover/focus restore.
      className={
        "home-entry mt-9 sm:mt-11" +
        (entry.sealed ? " border-l border-dashed border-border pl-4" : "")
      }
      style={{
        opacity: entry.opacity,
        filter: entry.blur ? `blur(${entry.blur}px)` : undefined,
      }}
      tabIndex={0}
    >
      {entry.href ? (
        <Link href={entry.href} className="block text-inherit no-underline">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </article>
  );
}
