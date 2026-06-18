"use client";

import { useState } from "react";

// Picture card body for the reader feed. Three jobs:
//   - reserve the layout slot before bytes arrive (width/height attrs +
//     aspect-[4/3] frame) so the page doesn't jump when an image lands,
//   - show a subtle shimmer behind the slot while the image loads,
//   - cross-fade the image in on `load` (and on `error`, so a broken image
//     just shows the empty frame instead of a permanent shimmer loop).
//
// Bleed `-mx-6` past the page gutter so on mobile the image goes
// edge-to-edge. On desktop it bleeds to the reader column edge.

type Props = {
  src: string;
  width?: number;
  height?: number;
  alt?: string;
};

export function ReaderPicture({ src, width, height, alt }: Props) {
  const [loaded, setLoaded] = useState(false);
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
