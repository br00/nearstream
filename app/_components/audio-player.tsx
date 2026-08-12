"use client";

// AudioPlayer — a single &lt;audio&gt; source wrapped with a play/pause button,
// a duration/time readout, and the Nearstream animated-mark visualizer
// driven by live Web Audio amplitude. Used by voice notes (slice 39) and
// music tracks (slice 40). Reader cards, tenant pages, and the music
// detail page all consume this same component.
//
// Design calls:
// - Amplitude is written into a MutableRef, not React state. Sixty writes
//   per second through setState would rerender the AnimatedMark for no
//   visible gain; the ref lets the canvas RAF loop read the current value
//   without triggering a rerender.
// - AudioContext is created lazily on first play. Browsers reject a fresh
//   AudioContext outside a user gesture — creating one at mount would
//   sometimes get suspended and never resume.
// - Everything unwinds on unmount + track change so navigating away
//   during playback doesn't leave a ghost source graph.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatedMark,
  type HumanCircleParams,
} from "@/app/_components/site/human-circle";

type Props = {
  src: string;
  durationMs: number;
  mime?: string;
  /** Visualizer size in CSS pixels. Reader cards use ~120; the tenant
   *  detail slot uses ~200; the music-page hero uses ~320. */
  size?: number;
  /** Optional override for the mark's noise/animation params — e.g. so a
   *  voice note reads with a different visual identity than a music
   *  track when both appear in the same reader feed. */
  params?: Partial<HumanCircleParams>;
  className?: string;
};

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  src,
  durationMs,
  mime,
  size = 200,
  params,
  className,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  // The channel between the analyser loop and the AnimatedMark. Written
  // ~60x/s during playback; read from the canvas RAF loop.
  const amplitudeRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const teardownAnalyser = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    amplitudeRef.current = 0;
  }, []);

  const startAnalyserLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    function tick() {
      analyser!.getByteTimeDomainData(buf);
      // RMS over the waveform buffer, normalized to ~0..1. Time-domain
      // RMS is more responsive than frequency magnitude for voice and
      // matches how loudness feels perceptually.
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128; // -1..1
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      // Squash: quiet passages shouldn't wobble the mark at all,
      // and loud ones cap at 1.0.
      amplitudeRef.current = Math.min(1, Math.max(0, (rms - 0.02) * 3));
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const ensureAudioGraph = useCallback(() => {
    if (audioCtxRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return; // Very old browsers — audio still plays, just no visualizer.
    const ctx = new AudioCtx();
    const source = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    audioCtxRef.current = ctx;
    sourceRef.current = source;
    analyserRef.current = analyser;
  }, []);

  const handlePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    ensureAudioGraph();
    if (audioCtxRef.current?.state === "suspended") {
      await audioCtxRef.current.resume();
    }
    try {
      await audio.play();
    } catch {
      // User dismissed autoplay prompt or similar; state stays paused.
    }
  }, [ensureAudioGraph]);

  const handlePause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => {
      setIsPlaying(true);
      startAnalyserLoop();
    };
    const onPause = () => {
      setIsPlaying(false);
      teardownAnalyser();
    };
    const onEnded = () => {
      setIsPlaying(false);
      teardownAnalyser();
      setElapsedMs(0);
    };
    const onTimeUpdate = () => {
      setElapsedMs(audio.currentTime * 1000);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      teardownAnalyser();
    };
  }, [startAnalyserLoop, teardownAnalyser]);

  // Full teardown on src change or unmount — otherwise a rendered list
  // of AudioPlayers accumulates AudioContexts on rerender.
  useEffect(() => {
    return () => {
      teardownAnalyser();
      try {
        sourceRef.current?.disconnect();
        analyserRef.current?.disconnect();
        audioCtxRef.current?.close();
      } catch {
        // A closed context throwing on re-close is fine.
      }
      audioCtxRef.current = null;
      sourceRef.current = null;
      analyserRef.current = null;
    };
  }, [src, teardownAnalyser]);

  const remainingMs = Math.max(0, durationMs - elapsedMs);
  const displayMs = isPlaying ? remainingMs : durationMs;

  return (
    <div className={className}>
      <div className="relative">
        <AnimatedMark
          size={size}
          amplitudeRef={amplitudeRef}
          params={params}
          ariaLabel={isPlaying ? "Playing audio" : "Paused audio"}
        />
        <button
          type="button"
          onClick={isPlaying ? handlePause : handlePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-foreground/40 bg-black/50 text-foreground backdrop-blur-sm">
            {isPlaying ? (
              // Pause icon — two bars.
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <rect x="3" y="2" width="3.5" height="12" />
                <rect x="9.5" y="2" width="3.5" height="12" />
              </svg>
            ) : (
              // Play icon — right-pointing triangle, optically offset.
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M4 2 L13 8 L4 14 Z" />
              </svg>
            )}
          </span>
        </button>
      </div>
      <div className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
        {formatTime(displayMs)}
      </div>
      {/* preload="metadata" so the tenant page renders duration without
          fetching the whole file up front. */}
      <audio ref={audioRef} src={src} preload="metadata" {...(mime ? { type: mime } : {})} />
    </div>
  );
}
