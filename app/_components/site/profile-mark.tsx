"use client";

import { AnimatedMark } from "./human-circle";
import { getProfileMarkVariant } from "@/lib/profile-mark-variants";

// A user's profile mark — the round, animated thing that sits where a profile
// photo would on a normal social product. The mark is the user's identity:
// "no face, just a moving signature." Picked during onboarding, editable in
// /studio, rendered at the top of every tenant's home page.

type Props = {
  variantIndex: number | undefined;
  size?: number;
  className?: string;
  ariaLabel?: string;
};

export function ProfileMark({ variantIndex, size = 280, className, ariaLabel }: Props) {
  const variant = getProfileMarkVariant(variantIndex);
  return (
    <AnimatedMark
      // Key on index so swapping variants in the picker remounts the canvas
      // (animation params are only read on mount; see AnimatedMark).
      key={variant.index}
      size={size}
      className={className}
      params={variant.params}
      ariaLabel={ariaLabel ?? `Profile mark — ${variant.name}`}
    />
  );
}
