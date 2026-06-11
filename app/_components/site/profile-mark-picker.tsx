"use client";

import { useState } from "react";
import { ProfileMark } from "./profile-mark";
import {
  PROFILE_MARK_VARIANTS,
  normalizeProfileMark,
} from "@/lib/profile-mark-variants";

// A grid of 10 live profile marks. Click one, the form's `profileMark` field
// flips to that variant index. Lives inside both the onboarding form and the
// studio profile form — the parent owns the submit button.
//
// The canvases inside each tile animate the same noise field the user will
// see at home size, so what you pick is what you get. `pointer-events: none`
// on the canvas guarantees label clicks always reach the radio.

type Props = {
  name?: string;
  defaultValue?: number;
  tileSize?: number;
};

export function ProfileMarkPicker({
  name = "profileMark",
  defaultValue,
  tileSize = 96,
}: Props) {
  const [selected, setSelected] = useState(() =>
    normalizeProfileMark(defaultValue),
  );
  const selectedVariant = PROFILE_MARK_VARIANTS[selected];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {PROFILE_MARK_VARIANTS.map((variant) => {
          const isSelected = variant.index === selected;
          return (
            <label
              key={variant.index}
              className={`relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden transition-all ${
                isSelected
                  ? "outline outline-2 outline-offset-2 outline-foreground"
                  : "outline outline-1 outline-offset-0 outline-border hover:outline-muted"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={variant.index}
                checked={isSelected}
                onChange={() => setSelected(variant.index)}
                className="sr-only"
                aria-label={variant.name}
              />
              <div className="pointer-events-none">
                <ProfileMark variantIndex={variant.index} size={tileSize} />
              </div>
              {isSelected && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-foreground"
                />
              )}
            </label>
          );
        })}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-soft">
        Selected · {selectedVariant.name}
      </p>
    </div>
  );
}
