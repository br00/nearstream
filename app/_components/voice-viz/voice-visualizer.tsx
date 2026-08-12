"use client";

// One component that renders whichever visualizer the user picked. This is
// the only place the rest of the app touches a specific viz — AudioPlayer
// and the lab both go through here, so adding a fourth variant doesn't mean
// editing every caller.
//
// The variants are lazily imported. Three canvas visualizers, of which any
// given page renders one, is exactly the case `next/dynamic` exists for: a
// reader feed with a dozen voice cards would otherwise ship all three
// simulations to parse a wave equation nobody's looking at.
//
// `ssr: false` because every variant reaches for `window` and canvas in an
// effect; there's nothing meaningful to prerender. The placeholder holds
// the layout box so cards don't jump when the chunk lands.

import dynamic from "next/dynamic";
import { useRef } from "react";
import { resolveVoiceViz, type VoiceVizKey } from "@/lib/voice-viz-variants";
import type { FrequencyData } from "./use-audio-amplitude";
import { ANT_DEFAULTS } from "./ant-traces";

const AntTraces = dynamic(
  () => import("./ant-traces").then((m) => m.AntTraces),
  { ssr: false },
);
const ProximityWeb = dynamic(
  () => import("./proximity-web").then((m) => m.ProximityWeb),
  { ssr: false },
);
const WaveGridBands = dynamic(
  () => import("./wave-grid-bands").then((m) => m.WaveGridBands),
  { ssr: false },
);

/**
 * Simulation steps per frame for the wave grid. 0.6 is one traverse of the
 * plane per beat at 120bpm — at 1.0 the medium churns about twice a beat
 * and reads as frantic against music.
 */
const SHIPPED_TEMPO = 0.6;

type Props = {
  /** Which variant to render. Pass the user's preference; resolution is internal. */
  variant: VoiceVizKey;
  /** Square edge in CSS px. Variants below their `minSize` fall back. */
  size: number;
  amplitudeRef: React.MutableRefObject<number>;
  frequencyRef: React.MutableRefObject<FrequencyData>;
  className?: string;
};

export function VoiceVisualizer({
  variant,
  size,
  amplitudeRef,
  frequencyRef,
  className,
}: Props) {
  // Shipped surfaces don't expose the tuning knobs the lab does, but the
  // components take refs, so hold steady ones rather than making new
  // objects each render (which would retrigger their effects).
  const tempoRef = useRef(SHIPPED_TEMPO);
  const antParamsRef = useRef({ ...ANT_DEFAULTS });

  const resolved = resolveVoiceViz(variant, size);

  // Reserve the box up front. The variants size their own canvas in an
  // effect, so without this a reader feed reflows as each chunk lands.
  return (
    <div style={{ width: size, height: size }} className={className}>
      {resolved === "proximity-web" ? (
        <ProximityWeb
          width={size}
          height={size}
          amplitudeRef={amplitudeRef}
        />
      ) : resolved === "wave-grid" ? (
        <WaveGridBands
          width={size}
          height={size}
          frequencyRef={frequencyRef}
          tempoRef={tempoRef}
        />
      ) : (
        <AntTraces
          width={size}
          height={size}
          amplitudeRef={amplitudeRef}
          frequencyRef={frequencyRef}
          antCount={antCountFor(size)}
          paramsRef={antParamsRef}
        />
      )}
    </div>
  );
}

/**
 * Ant count scaled to area. The lab's 240 was tuned at 320px; the same
 * count on a 120px reader card is four times the density and reads as a
 * smear rather than traces.
 */
function antCountFor(size: number): number {
  const scaled = Math.round(240 * (size / 320) ** 2);
  return Math.max(70, Math.min(360, scaled));
}
