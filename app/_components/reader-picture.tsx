"use client";

import { useEffect, useRef, useState } from "react";

// Picture card body for the reader feed. Three jobs:
//   - reserve the layout slot before bytes arrive (width/height attrs +
//     aspect-[4/3] frame) so the page doesn't jump when an image lands,
//   - show a subtle shimmer behind the slot while the image loads,
//   - cross-fade the image in on `load` (and on `error`, so a broken image
//     just shows the empty frame instead of a permanent shimmer loop).
//
// Bleed `-mx-6` past the page gutter so on mobile the image goes
// edge-to-edge. On desktop it bleeds to the reader column edge.
//
// Slice 31 fix: when iOS Safari pull-to-refresh reloads /reader, the
// browser serves images from cache and fires the `load` event before
// React's `onLoad` handler is even attached during hydration. Without the
// mount-time `complete` check, those images stayed behind the shimmer
// forever. We poke `imgRef.current.complete` once on mount (and whenever
// `src` changes) to catch the race.

type Props = {
  src: string;
  width?: number;
  height?: number;
  alt?: string;
};

export function ReaderPicture({ src, width, height, alt }: Props) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <div className="relative -mx-6 aspect-[4/3] overflow-hidden bg-foreground/5">
      <span
        aria-hidden
        className={
          "absolute inset-0 shimmer-sweep transition-opacity duration-500 " +
          (loaded ? "opacity-0" : "opacity-100")
        }
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        width={width}
        height={height}
        alt={alt ?? ""}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={
          "h-full w-full object-cover transition-opacity duration-500 " +
          (loaded ? "opacity-100" : "opacity-0")
        }
      />
    </div>
  );
}
