"use client";

// Voice-viz lab (slice 39.5). Candidate audio-reactive visualizers rendered
// side-by-side from a single shared amplitude source. Pick with your eyes,
// wire the winner into `AudioPlayer` after.
//
// Two batches, and they don't share a premise. A–J are noise fields that
// react to a level. K–M treat the canvas as a medium a wave travels across —
// sound seen from directly above.
//
// The shortlist at the top (G, K, L, M) is aspect-aware and takes live
// params, so format and feel can be judged by looking rather than argued
// about. Everything below it is fixed-square and there for comparison only.
//
// Note on running this on a phone: `getUserMedia` needs a secure context,
// so the LAN http:// URL will show "mic failed". Run the dev server with
// `next dev --experimental-https` and accept the certificate warning.

import Link from "next/link";
import { useRef, useState } from "react";
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
import { WaveGridDigits } from "@/app/_components/voice-viz/wave-grid-digits";
import { WaveGridBands } from "@/app/_components/voice-viz/wave-grid-bands";
import {
  AntTraces,
  ANT_DEFAULTS,
  type AntParams,
} from "@/app/_components/voice-viz/ant-traces";

const VIZ_SIZE = 320;

/**
 * The three shapes worth judging against. "Player" is the real shipped
 * size on a tenant page, and the reader card is smaller still at ~120 —
 * worth remembering that the glyph grids need room to stay legible.
 */
const FORMATS = {
  square: { w: 320, h: 320, label: "Square", note: "320 × 320" },
  wide: { w: 420, h: 236, label: "Wide 16:9", note: "420 × 236" },
  player: { w: 200, h: 200, label: "Player size", note: "200 × 200" },
} as const;

type FormatKey = keyof typeof FORMATS;

const DEFAULT_TEMPO = 0.6;
const DEFAULT_ANT_COUNT = 240;

export default function VoiceVizLab() {
  const audio = useAudioAmplitude();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [format, setFormat] = useState<FormatKey>("square");
  const fmt = FORMATS[format];

  // Live params go through refs so moving a slider retunes the running
  // animation instead of tearing it down and re-seeding it.
  const tempoRef = useRef(DEFAULT_TEMPO);
  const [tempo, setTempo] = useState(DEFAULT_TEMPO);
  const setTempoBoth = (v: number) => {
    tempoRef.current = v;
    setTempo(v);
  };

  const antParamsRef = useRef<AntParams>({ ...ANT_DEFAULTS });
  const [antParams, setAntParams] = useState<AntParams>({ ...ANT_DEFAULTS });
  const patchAnts = (patch: Partial<AntParams>) => {
    const next = { ...antParamsRef.current, ...patch };
    antParamsRef.current = next;
    setAntParams(next);
  };

  // Ant count is the one that genuinely has to re-seed the field.
  const [antCount, setAntCount] = useState(DEFAULT_ANT_COUNT);

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
            All driven by the same audio source. Turn on the mic or play a file
            — every canvas responds to the same signal. The shortlist responds
            to the format and tempo controls below; the earlier batch is fixed
            square and kept for comparison.
          </p>

          {/* ── Audio controls ───────────────────────────────────────── */}
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

          {/* ── Format + tempo ───────────────────────────────────────── */}
          <div className="mt-6 border border-border p-6">
            <Kicker>Shortlist controls</Kicker>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {(Object.keys(FORMATS) as FormatKey[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFormat(k)}
                  className={
                    format === k
                      ? "border border-foreground bg-foreground/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground"
                      : "border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted transition-colors hover:border-foreground/60 hover:text-foreground"
                  }
                >
                  {FORMATS[k].label}
                  <span className="ml-2 normal-case tracking-normal text-muted-soft">
                    {FORMATS[k].note}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-6 max-w-md">
              <Slider
                label="Tempo"
                hint="simulation steps per frame — K, L, M"
                value={tempo}
                min={0.15}
                max={1}
                step={0.05}
                onChange={setTempoBoth}
              />
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                At 1 the medium advances once per rendered frame and a ripple
                crosses the whole plane in 0.30s — barely half a beat at
                120bpm, which is why the grids felt frantic and out of time
                against a track. Measured against a 120bpm beat: <b>0.6</b> is
                one traverse per beat, <b>0.3</b> is two, <b>1.0</b> is roughly
                two per beat. Decay is held at a fixed rate per second, so
                moving this changes the speed without also changing how long
                the plane rings.
              </p>
            </div>
          </div>

          {/* ── Shortlist ────────────────────────────────────────────── */}
          <h2 className="mt-16 text-lg font-normal tracking-tight text-foreground">
            Shortlist
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            The four still in play. K–M treat the canvas as a{" "}
            <em>medium</em> a wave travels across — energy enters at a point
            and then propagates, interferes, reflects off the frame and
            decays, so the plane holds a short memory instead of only
            restating the current frame.
          </p>

          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <VizCard
              tag="M"
              name="Ant traces"
              blurb="Agents steer along the wave's contours rather than downhill, so a ripple is drawn as a front and the trails accumulate into its shape. The emitter now wanders — pitch pushes it one way, a slow noise walk the other — so it no longer builds a centred ring."
            >
              <AntTraces
                width={fmt.w}
                height={fmt.h}
                amplitudeRef={audio.amplitudeRef}
                frequencyRef={audio.frequencyRef}
                antCount={antCount}
                paramsRef={antParamsRef}
              />
              <div className="mt-6 w-full space-y-4 border-t border-border pt-5">
                <Slider
                  label="Trail length"
                  hint="lower fade = longer traces"
                  value={antParams.trailFade}
                  min={0.01}
                  max={0.2}
                  step={0.005}
                  onChange={(v) => patchAnts({ trailFade: v })}
                />
                <Slider
                  label="Wander"
                  hint="random jitter per step"
                  value={antParams.wander}
                  min={0}
                  max={0.8}
                  step={0.02}
                  onChange={(v) => patchAnts({ wander: v })}
                />
                <Slider
                  label="Contour grip"
                  hint="how hard they hug the wavefront"
                  value={antParams.turnRate}
                  min={0.02}
                  max={0.6}
                  step={0.02}
                  onChange={(v) => patchAnts({ turnRate: v })}
                />
                <Slider
                  label="Ants"
                  hint="re-seeds the field"
                  value={antCount}
                  min={60}
                  max={600}
                  step={20}
                  onChange={(v) => setAntCount(Math.round(v))}
                  format={(v) => String(Math.round(v))}
                />
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
                    Emitter
                  </span>
                  {(["wander", "centre"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => patchAnts({ emitter: m })}
                      className={
                        antParams.emitter === m
                          ? "border border-foreground bg-foreground/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground"
                          : "border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted transition-colors hover:border-foreground/60 hover:text-foreground"
                      }
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </VizCard>

            <VizCard
              tag="G"
              name="Proximity web"
              blurb="Drifting points link to neighbours within a threshold; amplitude raises it. Silence is now genuinely sparse (63 links, was 160) so speech creates the web rather than thickening one that was always there — a 6.4× swing instead of 2.2×. Nodes no longer pin against the walls."
            >
              <ProximityWeb
                width={fmt.w}
                height={fmt.h}
                amplitudeRef={audio.amplitudeRef}
              />
            </VizCard>

            <VizCard
              tag="L"
              name="Wave grid — digits by frequency"
              blurb="Nine wave fields, one per band, each with its own speed and decay: lows travel slow and far, highs die near the source. Size = energy through that point, digit = which band owns it. The emitter slides with pitch. Cells keep their last band, so it survives as a still."
            >
              <WaveGridBands
                width={fmt.w}
                height={fmt.h}
                frequencyRef={audio.frequencyRef}
                tempoRef={tempoRef}
              />
            </VizCard>

            <VizCard
              tag="K"
              name="Wave grid — digits by height"
              blurb="The kraftwerk sketch with the noise field swapped for a real wave. Everything enters at the centre. Digit and size both come from the height, exactly as in the original — which means the digit tells you nothing the size didn't."
            >
              <WaveGridDigits
                width={fmt.w}
                height={fmt.h}
                amplitudeRef={audio.amplitudeRef}
                tempoRef={tempoRef}
              />
            </VizCard>
          </div>

          {/* ── Earlier candidates ───────────────────────────────────── */}
          <h2 className="mt-20 text-lg font-normal tracking-tight text-foreground">
            Earlier candidates
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Fixed square, unchanged, kept for comparison. G has moved up to the
            shortlist.
          </p>

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

function Slider({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
          {label}
          {hint && (
            <span className="ml-2 normal-case tracking-normal">{hint}</span>
          )}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-foreground">
          {format ? format(value) : value.toFixed(3)}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-white"
      />
    </label>
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
      <div className="mt-6 flex flex-col items-center">{children}</div>
    </div>
  );
}
