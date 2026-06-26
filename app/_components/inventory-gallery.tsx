"use client";

import { useCallback, useEffect, useState } from "react";
import type { InventoryImage } from "@/schemas/inventory";
import type { GalleryLayout } from "@/schemas/user";

// Multi-image gallery on the inventory detail page.
//
// V16 from /design/multi-image-lab → ship: detail page renders the contact
// sheet (this component, body) and tapping any tile opens a modal viewer
// that locks page scroll. The modal handles its own keyboard + swipe nav.
//
// V15 adaptive: when there are exactly 2 images we drop the contact-sheet
// framing and stack them full-width — at two, "series" framing is a lie.
// The modal still works for either, so the tap-to-view affordance is the
// same vocabulary regardless of count.
//
// Slice 33 "user owns rendering": `mode` is the tenant's pick from
// /settings/display. "contact-sheet" is the default (V16). "stack" is the
// quieter alternate — every image at its native ratio, full-width, no
// modal. Picked by the *tenant* (it's their site), not by the visitor.

type Props = {
  images: InventoryImage[];
  title: string;
  mode?: GalleryLayout;
};

export function InventoryGallery({ images, title, mode = "contact-sheet" }: Props) {
  if (mode === "stack") {
    return <StackGallery images={images} title={title} />;
  }
  return <ContactSheetGallery images={images} title={title} />;
}

function ContactSheetGallery({ images, title }: { images: InventoryImage[]; title: string }) {
  const [active, setActive] = useState<number | null>(null);

  const close = useCallback(() => setActive(null), []);
  const prev = useCallback(
    () => setActive((i) => (i === null ? null : (i - 1 + images.length) % images.length)),
    [images.length],
  );
  const next = useCallback(
    () => setActive((i) => (i === null ? null : (i + 1) % images.length)),
    [images.length],
  );

  // Lock body scroll while the modal is open. We restore the exact prior
  // overflow value so we don't trample a setting some other component
  // applied — there is none today, but the pattern stays safe.
  useEffect(() => {
    if (active === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [active]);

  // Keyboard nav while open.
  useEffect(() => {
    if (active === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close, prev, next]);

  const isPair = images.length === 2;

  return (
    <>
      {/* The sheet: a two-column tile grid when 3+, a clean stack when 2,
          a single image when 1. Native ratios kept on each tile so a
          landscape doesn't get cropped square. */}
      {isPair ? (
        <div className="mt-6 flex flex-col gap-3">
          {images.map((img, i) => (
            <GalleryTile
              key={i}
              img={img}
              index={i}
              title={title}
              onOpen={() => setActive(i)}
              full
            />
          ))}
        </div>
      ) : images.length === 1 ? (
        <div className="mt-6">
          <GalleryTile
            img={images[0]}
            index={0}
            title={title}
            onOpen={() => setActive(0)}
            full
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-2">
          {images.map((img, i) => (
            <GalleryTile
              key={i}
              img={img}
              index={i}
              title={title}
              onOpen={() => setActive(i)}
            />
          ))}
        </div>
      )}

      {active !== null && (
        <GalleryModal
          images={images}
          activeIndex={active}
          onClose={close}
          onPrev={prev}
          onNext={next}
          title={title}
        />
      )}
    </>
  );
}

function GalleryTile({
  img,
  index,
  title,
  onOpen,
  full,
}: {
  img: InventoryImage;
  index: number;
  title: string;
  onOpen: () => void;
  full?: boolean;
}) {
  const src = `/api/media/${img.thumbKey ?? img.key}`;
  // Tiles in the contact-sheet grid get a fixed square aspect so the grid
  // reads as a grid. The pair / single layout keeps native aspect so the
  // image breathes.
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${title}, image ${index + 1}`}
      className={
        "group relative block w-full overflow-hidden border border-border bg-foreground/5 " +
        (full ? "" : "aspect-square")
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${title} — image ${index + 1}`}
        className={
          "block w-full transition-opacity " +
          (full ? "h-auto" : "h-full object-cover")
        }
        loading="lazy"
        {...(img.width && img.height
          ? { width: img.width, height: img.height }
          : {})}
      />
    </button>
  );
}

function GalleryModal({
  images,
  activeIndex,
  onClose,
  onPrev,
  onNext,
  title,
}: {
  images: InventoryImage[];
  activeIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  title: string;
}) {
  const img = images[activeIndex];
  const total = images.length;
  // Original (not thumb) inside the modal — this is the "look at the
  // picture" surface, not the browse surface. Reader-side thumbnails
  // already saved us bytes elsewhere.
  const src = `/api/media/${img.key}`;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — image ${activeIndex + 1} of ${total}`}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      <div className="flex items-center justify-between px-5 pt-6 pb-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
          {String(activeIndex + 1).padStart(2, "0")} /{" "}
          {String(total).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          Close ✕
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`${title} — image ${activeIndex + 1}`}
          className="max-h-full max-w-full object-contain"
          {...(img.width && img.height
            ? { width: img.width, height: img.height }
            : {})}
        />
      </div>

      {total > 1 && (
        <div className="flex items-center justify-between px-5 pb-8 pt-2">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous image"
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted transition-colors hover:text-foreground"
          >
            ← prev
          </button>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-soft">
            {title}
          </span>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next image"
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted transition-colors hover:text-foreground"
          >
            next →
          </button>
        </div>
      )}
    </div>
  );
}

// "stack" mode: every image at its native ratio, full-width, top to
// bottom. No modal, no tap-to-open. The reading-room take — fewer
// interactions, more breathing room. The tenant picks this from
// /settings/display when their content reads better as a scroll than as a
// browseable grid.
function StackGallery({
  images,
  title,
}: {
  images: InventoryImage[];
  title: string;
}) {
  return (
    <div className="mt-6 flex flex-col gap-4">
      {images.map((img, i) => {
        const src = `/api/media/${img.thumbKey ?? img.key}`;
        return (
          <div
            key={i}
            className="overflow-hidden border border-border bg-foreground/5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={i === 0 ? title : `${title} — image ${i + 1}`}
              className="block w-full"
              loading="lazy"
              {...(img.width && img.height
                ? { width: img.width, height: img.height }
                : {})}
            />
          </div>
        );
      })}
    </div>
  );
}
