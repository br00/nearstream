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

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
      {PROFILE_MARK_VARIANTS.map((variant) => {
        const isSelected = variant.index === selected;
        return (
          <label
            key={variant.index}
            className={`group relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden border transition-colors ${
              isSelected
                ? "border-foreground"
                : "border-border hover:border-muted"
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
            <ProfileMark variantIndex={variant.index} size={tileSize} />
          </label>
        );
      })}
    </div>
  );
}
