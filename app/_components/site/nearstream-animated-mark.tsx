"use client";

import { AnimatedMark, type HumanCircleParams } from "./human-circle";

// The platform mark — sits at the top of the /reader. Same engine as
// Alessandro's signature but a distinct fingerprint so it reads as Nearstream
// the instance, not Nearstream the person: a tighter brush, denser stamps, a
// thinner ring, and a faster morph. Lives in its own noise slice (zOffset)
// so it never looks identical to any tenant's mark.
const NEARSTREAM_PARAMS: Partial<HumanCircleParams> = {
  angleStep: 0.008,
  baseRadiusFrac: 0.34,
  radiusRangeFrac: 0.06,
  brushAngleStep: 0.14,
  brushNoiseRange: 22,
  seedSpeed: 0.0036,
  brushScaleFrac: 1 / 280,
  zOffset: 17.4,
};

type Props = {
  size?: number;
  className?: string;
};

export function NearstreamAnimatedMark({ size = 140, className }: Props) {
  return (
    <AnimatedMark
      size={size}
      className={className}
      params={NEARSTREAM_PARAMS}
      ariaLabel="Nearstream"
    />
  );
}
