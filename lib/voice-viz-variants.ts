// The curated set of voice visualizers. Same shape as
// `lib/profile-mark-variants.ts`: a small closed list the instance ships,
// with the user picking one — not a settings panel of raw knobs.
//
// Adding a fourth is: one entry here, one lazy import in
// `app/_components/voice-viz/voice-visualizer.tsx`, and one static variant
// for the OG image. The static one is not optional — OG images and digest
// emails can't run canvas, so a visualizer without one silently renders
// nothing in link previews. Mind `minSize` too.
//
// Kept free of React imports on purpose so server code (OG routes, the
// digest mailer, schema validation) can read this without pulling a client
// component into the bundle.

export const VOICE_VIZ_KEYS = ["ant-traces", "proximity-web", "wave-grid"] as const;

export type VoiceVizKey = (typeof VOICE_VIZ_KEYS)[number];

export type VoiceVizVariant = {
  key: VoiceVizKey;
  /** Shown in the settings picker. */
  name: string;
  /** One line, in the picker under the name. */
  blurb: string;
  /**
   * Which audio signal the animated component needs. `frequency` variants
   * read the FFT; `amplitude` ones only need RMS. AudioPlayer computes both,
   * but the OG/static side uses this to know what to precompute.
   */
  signal: "amplitude" | "frequency";
  /**
   * Below this many CSS px the variant stops reading and callers should
   * substitute `FALLBACK_BELOW_MIN_SIZE`. Only the glyph grid has a real
   * floor, and the reason is compositional rather than legibility: its
   * cells are a fixed ~12.3px at every canvas size, so the digits stay the
   * same size and it's the *count* that shrinks — 26×26 at 320px, 13×13 at
   * 160, 10×10 at 120. Below ~13 across there aren't enough cells for a
   * wavefront to be visible as one, and it reads as noise.
   */
  minSize: number;
};

export const VOICE_VIZ_VARIANTS: Record<VoiceVizKey, VoiceVizVariant> = {
  "ant-traces": {
    key: "ant-traces",
    name: "Ant traces",
    blurb:
      "Agents walk the sound's contours and leave fading trails. Fluid, and it records the whole phrase rather than the current instant.",
    signal: "frequency",
    minSize: 0,
  },
  "proximity-web": {
    key: "proximity-web",
    name: "Proximity web",
    blurb:
      "Drifting points link up when they're close enough. Silence scatters them; your voice knits them into a web.",
    signal: "amplitude",
    minSize: 0,
  },
  "wave-grid": {
    key: "wave-grid",
    name: "Wave grid",
    blurb:
      "Sound seen from above as a wave crossing a plane of digits. Each digit is the frequency band that owns that point.",
    signal: "frequency",
    minSize: 160,
  },
};

export const DEFAULT_VOICE_VIZ: VoiceVizKey = "ant-traces";

/**
 * What to render when the chosen variant can't work at the requested size.
 * Deliberately one of the size-agnostic variants, so a reader card never
 * comes out blank because of a preference set for a bigger surface.
 */
export const FALLBACK_BELOW_MIN_SIZE: VoiceVizKey = "proximity-web";

export function isVoiceVizKey(value: unknown): value is VoiceVizKey {
  return (
    typeof value === "string" &&
    (VOICE_VIZ_KEYS as readonly string[]).includes(value)
  );
}

/** Clamp anything unknown (old records, hand-edited JSON) to the default. */
export function normalizeVoiceViz(value: unknown): VoiceVizKey {
  return isVoiceVizKey(value) ? value : DEFAULT_VOICE_VIZ;
}

/**
 * The variant to actually render at `size`, honouring `minSize`. Call this
 * rather than reading the preference directly — it's what keeps a
 * wave-grid preference from blanking the 120px reader cards.
 */
export function resolveVoiceViz(value: unknown, size: number): VoiceVizKey {
  const key = normalizeVoiceViz(value);
  return size < VOICE_VIZ_VARIANTS[key].minSize ? FALLBACK_BELOW_MIN_SIZE : key;
}

export function getVoiceVizVariant(value: unknown): VoiceVizVariant {
  return VOICE_VIZ_VARIANTS[normalizeVoiceViz(value)];
}

/** Stable order for the picker — record iteration order isn't a contract. */
export function listVoiceVizVariants(): VoiceVizVariant[] {
  return VOICE_VIZ_KEYS.map((k) => VOICE_VIZ_VARIANTS[k]);
}
