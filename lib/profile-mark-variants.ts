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
// The variants differ by FORM, not just by knobs. Ten parameter sets of a
// single noise circle were rendered offscreen at both 96px and 280px and came
// out as ten circles of slightly different weight — no amount of retuning
// fixes that, because the knobs only control how big, how thick and how
// wobbly one shape is.
//
//   0 Signature  ring    the original parameters, untouched — Alessandro's
//                        mark and the one the whole system was drawn from
//   1 Tight      ring    small, near-perfect, barely breathing
//   2 Open       arc     a bite out of the circle
//   3 Echo       double  two rings wobbling independently
//   4 Stitch     dashed  the ring as strokes and gaps
//   5 Thin       ring    the lightest weight in the set
//   6 Dense      mass    stamps filling the disc, not tracing it
//   7 Horizon    band    a line across the tile — no circle at all
//   8 Scribble   mass    dense, wide, chaotic
//   9 Satellite  orbit   a small ring with one arc riding outside it

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
    name: "Signature",
    params: {
      form: "ring",
      angleStep: 0.012,
      baseRadiusFrac: 0.3,
      radiusRangeFrac: 0.1,
      brushAngleStep: 0.1,
      brushNoiseRange: 15,
      brushScaleFrac: 1 / 220,
      seedSpeed: 0.0024,
      nMax: 0.45,
      zOffset: 0,
    },
  },
  {
    index: 1,
    name: "Tight",
    params: {
      form: "ring",
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
    name: "Open",
    params: {
      form: "arc",
      angleStep: 0.011,
      baseRadiusFrac: 0.32,
      radiusRangeFrac: 0.09,
      brushAngleStep: 0.09,
      brushNoiseRange: 16,
      brushScaleFrac: 1 / 210,
      seedSpeed: 0.0026,
      nMax: 0.45,
      zOffset: 7.1,
    },
  },
  {
    index: 3,
    name: "Echo",
    params: {
      form: "double",
      angleStep: 0.01,
      baseRadiusFrac: 0.34,
      radiusRangeFrac: 0.06,
      brushAngleStep: 0.1,
      brushNoiseRange: 18,
      brushScaleFrac: 1 / 250,
      seedSpeed: 0.0016,
      nMax: 0.4,
      zOffset: 11.4,
    },
  },
  {
    index: 4,
    name: "Stitch",
    params: {
      form: "dashed",
      angleStep: 0.009,
      baseRadiusFrac: 0.34,
      radiusRangeFrac: 0.07,
      brushAngleStep: 0.11,
      brushNoiseRange: 14,
      brushScaleFrac: 1 / 190,
      seedSpeed: 0.003,
      nMax: 0.4,
      zOffset: 21.0,
    },
  },
  {
    index: 5,
    name: "Thin",
    params: {
      form: "ring",
      angleStep: 0.007,
      baseRadiusFrac: 0.43,
      radiusRangeFrac: 0.04,
      brushAngleStep: 0.13,
      brushNoiseRange: 24,
      brushScaleFrac: 1 / 400,
      seedSpeed: 0.0022,
      nMax: 0.35,
      zOffset: 34.6,
    },
  },
  {
    index: 6,
    name: "Dense",
    params: {
      form: "mass",
      angleStep: 0.01,
      baseRadiusFrac: 0.3,
      radiusRangeFrac: 0.14,
      brushAngleStep: 0.08,
      brushNoiseRange: 12,
      brushScaleFrac: 1 / 240,
      seedSpeed: 0.0028,
      nMax: 0.55,
      zOffset: 45.9,
    },
  },
  {
    index: 7,
    name: "Horizon",
    params: {
      form: "band",
      angleStep: 0.009,
      baseRadiusFrac: 0.42,
      radiusRangeFrac: 0.16,
      brushAngleStep: 0.1,
      brushNoiseRange: 17,
      brushScaleFrac: 1 / 140,
      seedSpeed: 0.0018,
      nMax: 0.6,
      zOffset: 58.3,
    },
  },
  {
    index: 8,
    name: "Scribble",
    params: {
      form: "mass",
      angleStep: 0.017,
      baseRadiusFrac: 0.26,
      radiusRangeFrac: 0.22,
      brushAngleStep: 0.16,
      brushNoiseRange: 10,
      brushScaleFrac: 1 / 170,
      seedSpeed: 0.004,
      nMax: 0.9,
      zOffset: 67.0,
    },
  },
  {
    index: 9,
    name: "Satellite",
    params: {
      form: "orbit",
      angleStep: 0.01,
      baseRadiusFrac: 0.3,
      radiusRangeFrac: 0.06,
      brushAngleStep: 0.11,
      brushNoiseRange: 19,
      brushScaleFrac: 1 / 240,
      seedSpeed: 0.0015,
      nMax: 0.35,
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
