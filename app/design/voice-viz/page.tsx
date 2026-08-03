"use client";

// Voice-viz lab (slice 39.5). Ten candidate audio-reactive visualizers
// rendered side-by-side from a single shared amplitude source. Pick
// with your eyes, wire the winner into `AudioPlayer` after.
//
// Live mic OR upload/play a file — same RMS calc feeds every canvas so
// their responses are directly comparable. Follows the mobile-lab /
// multi-image-lab convention: noindex, /design-linked, unshipped.
//
// Note on running this on a phone: `getUserMedia` needs a secure context,
// so the LAN http:// URL will show "mic failed". Run the dev server with
// `next dev --experimental-https` and accept the certificate warning.

import Link from "next/link";
import { useRef } from "react";
import { PageShell } from "@/app/_components/page-shell";
import { Kicker } from "@/app/_components/kicker";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { useAudioAmplitude } from "@/app/_components/voice-viz/use-audio-amplitude";
import { FlowField } from "@/app/_components/voice-viz/flow-field";
import { ConcentricEchoes } from "@/app/_components/voice-viz/concentric-echoes";
import { ScatterField } from "@/app/_components/voice-viz/scatter-field";
import { UndulatingHorizon } from "@/app/_components/voice-viz/undulating-horizon";
import { OrbitSwarm } from "@/app/_components/voice-viz/orbit-swarm";
import { DotMatrixPulse } from "@/app/_components/voice-viz/dot-matrix-pulse";
import { ProximityWeb } from "@/app/_components/voice-viz/proximity-web";
import { SpectralColumns } from "@/app/_components/voice-viz/spectral-columns";
import { RippleInterference } from "@/app/_components/voice-viz/ripple-interference";
import { AmplitudeDrum } from "@/app/_components/voice-viz/amplitude-drum";

const VIZ_SIZE = 320;

export default function VoiceVizLab() {
  const audio = useAudioAmplitude();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusy = audio.mode !== "off";

  return (
    <PageShell
      leftNav={<NearstreamLockup size={24} className="text-foreground" />}
      rightNav={
        <Link
          href="/design"
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground"
        >
          ← Design
        </Link>
      }
    >
      <section className="flex flex-1 justify-center px-6 py-16">
        <div className="w-full max-w-5xl">
          <Kicker>Voice-viz lab</Kicker>
          <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
            Audio-reactive visualizer candidates
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
            Ten moving-points cousins of the human-circle, all driven by the
            same audio source. Turn on the mic or play a file — every canvas
            responds to the same signal. Pick the one that reads as
            &ldquo;voice on Nearstream&rdquo; and it lands in the shipped
            AudioPlayer.
          </p>

          {/* ── Controls ─────────────────────────────────────────────── */}
          <div className="mt-10 border border-border p-6">
            <div className="flex flex-wrap items-center gap-3">
              {audio.mode === "mic" ? (
                <button
                  type="button"
                  onClick={audio.stopMic}
                  className="border border-foreground bg-foreground/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground"
                >
                  ● Mic on — tap to stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={audio.startMic}
                  disabled={isBusy}
                  className="border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:border-foreground/60 hover:bg-foreground/5 disabled:opacity-40"
                >
                  Live mic
                </button>
              )}

              {audio.mode === "file" ? (
                <button
                  type="button"
                  onClick={audio.stopFile}
                  className="border border-foreground bg-foreground/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground"
                >
                  ▶ Playing{audio.currentFileName ? ` — ${audio.currentFileName}` : ""} — tap to stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy}
                  className="border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:border-foreground/60 hover:bg-foreground/5 disabled:opacity-40"
                >
                  Play audio file
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) audio.playFile(f);
                  // Reset so choosing the same file twice re-triggers.
                  e.target.value = "";
                }}
              />
            </div>

            {audio.errorMsg && (
              <p className="mt-4 text-sm text-muted">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground">
                  Error:{" "}
                </span>
                {audio.errorMsg}
              </p>
            )}

            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
              Live mic won&rsquo;t play through your speakers (feedback prevention). File playback does.
            </p>
          </div>

          {/* ── Grid of candidates ──────────────────────────────────── */}
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <VizCard
              tag="A"
              name="Flow field"
              blurb="Particles drift along a Perlin vector field, leaving fading trails. Amplitude bumps turbulence + speed. Most alive-feeling."
            >
              <FlowField size={VIZ_SIZE} amplitudeRef={audio.amplitudeRef} />
            </VizCard>

            <VizCard
              tag="B"
              name="Concentric echoes"
              blurb="Five nested Perlin rings, out of phase. Amplitude spreads them radially. Reads as resonance."
            >
              <ConcentricEchoes size={VIZ_SIZE} amplitudeRef={audio.amplitudeRef} />
            </VizCard>

            <VizCard
              tag="C"
              name="Scatter field"
              blurb="20×20 grid of points, each perturbed by per-point Perlin. Quiet = still grid; loud = shaken snow globe. No macro shape."
            >
              <ScatterField size={VIZ_SIZE} amplitudeRef={audio.amplitudeRef} />
            </VizCard>

            <VizCard
              tag="D"
              name="Undulating horizon"
              blurb="Horizontal line of ~60 points with vertical Perlin. Amplitude drives vertical range. Waveform-adjacent, pointwise."
            >
              <UndulatingHorizon size={VIZ_SIZE} amplitudeRef={audio.amplitudeRef} />
            </VizCard>

            <VizCard
              tag="E"
              name="Orbit swarm"
              blurb="Every point rides its own tilted ellipse around one centre. Amplitude spins the system up and stretches the orbits. Reads as a body under strain."
            >
              <OrbitSwarm size={VIZ_SIZE} amplitudeRef={audio.amplitudeRef} />
            </VizCard>

            <VizCard
              tag="F"
              name="Dot-matrix pulse"
              blurb="Fixed grid; only dot radius moves. Onsets — not levels — fire a ring outward from centre, so it pulses once per syllable. Closest to the Nothing glyph language."
            >
              <DotMatrixPulse size={VIZ_SIZE} amplitudeRef={audio.amplitudeRef} />
            </VizCard>

            <VizCard
              tag="G"
              name="Proximity web"
              blurb="Drifting points link to neighbours within a threshold; amplitude raises the threshold. Silence scatters, speech knits. The one whose meaning matches Nearstream."
            >
              <ProximityWeb size={VIZ_SIZE} amplitudeRef={audio.amplitudeRef} />
            </VizCard>

            <VizCard
              tag="H"
              name="Spectral columns"
              blurb="Reads the FFT, not RMS — 28 log-spaced bands as dot stacks. The only candidate where two different voices actually look different."
            >
              <SpectralColumns size={VIZ_SIZE} frequencyRef={audio.frequencyRef} />
            </VizCard>

            <VizCard
              tag="I"
              name="Ripple interference"
              blurb="Three off-centre wave sources sampled by a still lattice. Nothing moves but brightness. Silence is flat grey, speech is a moiré."
            >
              <RippleInterference size={VIZ_SIZE} amplitudeRef={audio.amplitudeRef} />
            </VizCard>

            <VizCard
              tag="J"
              name="Amplitude drum"
              blurb="A seismograph wrapped into a circle — a record, not a reaction. After a note the ring holds the shape of the whole sentence, so it also works as a still (OG image, digest card)."
            >
              <AmplitudeDrum size={VIZ_SIZE} amplitudeRef={audio.amplitudeRef} />
            </VizCard>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function VizCard({
  tag,
  name,
  blurb,
  children,
}: {
  tag: string;
  name: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border p-6">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-soft">
          {tag}
        </span>
        <h2 className="text-base font-normal tracking-tight text-foreground">
          {name}
        </h2>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">{blurb}</p>
      <div className="mt-6 flex justify-center">{children}</div>
    </div>
  );
}
