import type { HumanCircleParams } from "@/app/_components/site/human-circle";

// Ten profile-mark variants. The point of the system: "no face, just a moving
// signature." Everyone gets a circular animated mark instead of a photo. Each
// variant is the same noise engine with a different cocktail of knobs so they
// read as distinct creatures — thin and nervous, thick and slow, sparse and
// scribbled, dense and tight.
//
// To add an 11th variant, push another entry. The picker grids them
// automatically. Variant index is what we persist on the user (`profileMark`).
//
// Every variant sets `brushScaleFrac` explicitly. It used to be optional, so
// eight of the ten inherited the same default and differed only in radius and
// in animation speed — which a static glance at a 96px picker tile can't
// show. Stroke weight is the most legible difference between two marks at
// small size, so it's the one axis none of them should share.
//
// Spread across the set, as fractions of the half-canvas:
//   radius  0.20 → 0.38   (was 0.22 → 0.36)
//   wobble  0.03 → 0.26   (was 0.04 → 0.20)
//   weight  1/340 → 1/130 (was 1/320 → 1/160, and only on two variants)

export type ProfileMarkVariant = {
  /** Stable index — persisted on User.profileMark. Don't reorder. */
  index: number;
  /** Human label, used only for screen readers. */
  name: string;
  params: Partial<HumanCircleParams>;
};

export const PROFILE_MARK_VARIANTS: ProfileMarkVariant[] = [
  {
    index: 0,
    name: "Quiet",
    params: {
      angleStep: 0.012,
      baseRadiusFrac: 0.3,
      radiusRangeFrac: 0.06,
      brushAngleStep: 0.1,
      brushNoiseRange: 15,
      brushScaleFrac: 1 / 220,
      seedSpeed: 0.0024,
      nMax: 0.35,
      zOffset: 0,
    },
  },
  {
    index: 1,
    name: "Tight",
    params: {
      angleStep: 0.006,
      baseRadiusFrac: 0.36,
      radiusRangeFrac: 0.03,
      brushAngleStep: 0.12,
      brushNoiseRange: 18,
      brushScaleFrac: 1 / 300,
      seedSpeed: 0.0018,
      nMax: 0.3,
      zOffset: 3.2,
    },
  },
  {
    index: 2,
    name: "Loose",
    params: {
      angleStep: 0.018,
      baseRadiusFrac: 0.24,
      radiusRangeFrac: 0.2,
      brushAngleStep: 0.08,
      brushNoiseRange: 11,
      brushScaleFrac: 1 / 200,
      seedSpeed: 0.0034,
      nMax: 0.65,
      zOffset: 7.1,
    },
  },
  {
    index: 3,
    name: "Slow",
    params: {
      angleStep: 0.01,
      baseRadiusFrac: 0.33,
      radiusRangeFrac: 0.1,
      brushAngleStep: 0.09,
      brushNoiseRange: 20,
      brushScaleFrac: 1 / 240,
      seedSpeed: 0.0012,
      nMax: 0.4,
      zOffset: 11.4,
    },
  },
  {
    index: 4,
    name: "Restless",
    params: {
      angleStep: 0.014,
      baseRadiusFrac: 0.26,
      radiusRangeFrac: 0.16,
      brushAngleStep: 0.16,
      brushNoiseRange: 9,
      brushScaleFrac: 1 / 210,
      seedSpeed: 0.0048,
      nMax: 0.55,
      zOffset: 21.0,
    },
  },
  {
    index: 5,
    name: "Thin",
    params: {
      angleStep: 0.008,
      baseRadiusFrac: 0.38,
      radiusRangeFrac: 0.05,
      brushAngleStep: 0.13,
      brushNoiseRange: 24,
      brushScaleFrac: 1 / 340,
      seedSpeed: 0.0022,
      nMax: 0.35,
      zOffset: 34.6,
    },
  },
  {
    index: 6,
    name: "Thick",
    params: {
      angleStep: 0.013,
      baseRadiusFrac: 0.22,
      radiusRangeFrac: 0.12,
      brushAngleStep: 0.07,
      brushNoiseRange: 13,
      brushScaleFrac: 1 / 130,
      seedSpeed: 0.0028,
      nMax: 0.45,
      zOffset: 45.9,
    },
  },
  {
    index: 7,
    name: "Drifting",
    params: {
      angleStep: 0.011,
      baseRadiusFrac: 0.3,
      radiusRangeFrac: 0.22,
      brushAngleStep: 0.1,
      brushNoiseRange: 17,
      brushScaleFrac: 1 / 230,
      seedSpeed: 0.0016,
      nMax: 0.75,
      zOffset: 58.3,
    },
  },
  {
    index: 8,
    name: "Scribbled",
    params: {
      angleStep: 0.02,
      baseRadiusFrac: 0.2,
      radiusRangeFrac: 0.26,
      brushAngleStep: 0.18,
      brushNoiseRange: 10,
      brushScaleFrac: 1 / 190,
      seedSpeed: 0.004,
      nMax: 0.9,
      zOffset: 67.0,
    },
  },
  {
    index: 9,
    name: "Calm orbit",
    params: {
      angleStep: 0.009,
      baseRadiusFrac: 0.34,
      radiusRangeFrac: 0.04,
      brushAngleStep: 0.11,
      brushNoiseRange: 19,
      brushScaleFrac: 1 / 260,
      seedSpeed: 0.0014,
      nMax: 0.25,
      zOffset: 73.8,
    },
  },
];

export const DEFAULT_PROFILE_MARK = 0;

/** Clamp any incoming number to a valid variant index. */
export function normalizeProfileMark(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_PROFILE_MARK;
  }
  const i = Math.floor(value);
  if (i < 0 || i >= PROFILE_MARK_VARIANTS.length) return DEFAULT_PROFILE_MARK;
  return i;
}

export function getProfileMarkVariant(index: number | undefined): ProfileMarkVariant {
  const i = normalizeProfileMark(index);
  return PROFILE_MARK_VARIANTS[i];
}
