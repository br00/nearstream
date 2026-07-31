"use client";

// Shared amplitude source for the /design/voice-viz lab. All four
// visualizers read from the same MutableRef so their responses are
// directly comparable — same input, four outputs.
//
// Two modes: LIVE MIC (getUserMedia + AnalyserNode) or FILE PLAYBACK
// (user picks any audio file → HTMLAudioElement + AnalyserNode). Both
// use the same time-domain RMS calc as the shipped AudioPlayer so the
// visualizers see comparable numbers.

import { useCallback, useEffect, useRef, useState } from "react";

export type AmplitudeMode = "off" | "mic" | "file";

export type UseAudioAmplitudeResult = {
  amplitudeRef: React.MutableRefObject<number>;
  mode: AmplitudeMode;
  startMic: () => Promise<void>;
  stopMic: () => void;
  playFile: (file: File) => Promise<void>;
  stopFile: () => void;
  errorMsg: string | null;
  currentFileName: string | null;
};

export function useAudioAmplitude(): UseAudioAmplitudeResult {
  const amplitudeRef = useRef<number>(0);
  const [mode, setMode] = useState<AmplitudeMode>("off");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const fileAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const fileUrlRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  const ensureCtx = useCallback((): AudioContext | null => {
    if (audioCtxRef.current) return audioCtxRef.current;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;
    audioCtxRef.current = new AudioCtx();
    return audioCtxRef.current;
  }, []);

  const startLoop = useCallback((analyser: AnalyserNode) => {
    const buf = new Uint8Array(analyser.frequencyBinCount);
    function tick() {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      // Same squash as AudioPlayer so a hooked-up viz behaves in the
      // lab like it would in production: quiet passes are truly quiet,
      // loud passes clamp at 1.0.
      amplitudeRef.current = Math.min(1, Math.max(0, (rms - 0.02) * 3));
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    amplitudeRef.current = 0;
  }, []);

  const teardownMic = useCallback(() => {
    if (micStreamRef.current) {
      for (const t of micStreamRef.current.getTracks()) t.stop();
      micStreamRef.current = null;
    }
    try {
      micSourceRef.current?.disconnect();
    } catch {
      /* graph already torn down */
    }
    micSourceRef.current = null;
  }, []);

  const teardownFile = useCallback(() => {
    if (fileAudioRef.current) {
      fileAudioRef.current.pause();
      fileAudioRef.current.src = "";
    }
    fileAudioRef.current = null;
    try {
      fileSourceRef.current?.disconnect();
    } catch {
      /* graph already torn down */
    }
    fileSourceRef.current = null;
    if (fileUrlRef.current) {
      URL.revokeObjectURL(fileUrlRef.current);
      fileUrlRef.current = null;
    }
    setCurrentFileName(null);
  }, []);

  const startMic = useCallback(async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const ctx = ensureCtx();
      if (!ctx) throw new Error("Web Audio not supported");
      if (ctx.state === "suspended") await ctx.resume();
      teardownFile();
      stopLoop();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      // NOT connected to ctx.destination — we don't want the mic to
      // feed the speakers or the room would howl.
      micSourceRef.current = src;
      analyserRef.current = analyser;
      startLoop(analyser);
      setMode("mic");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "mic failed");
      teardownMic();
      setMode("off");
    }
  }, [ensureCtx, startLoop, stopLoop, teardownFile, teardownMic]);

  const stopMic = useCallback(() => {
    stopLoop();
    teardownMic();
    setMode("off");
  }, [stopLoop, teardownMic]);

  const playFile = useCallback(
    async (file: File) => {
      setErrorMsg(null);
      try {
        const ctx = ensureCtx();
        if (!ctx) throw new Error("Web Audio not supported");
        if (ctx.state === "suspended") await ctx.resume();
        teardownMic();
        teardownFile();
        stopLoop();
        const url = URL.createObjectURL(file);
        fileUrlRef.current = url;
        const audio = new Audio(url);
        audio.crossOrigin = "anonymous";
        fileAudioRef.current = audio;
        const src = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analyser.connect(ctx.destination);
        fileSourceRef.current = src;
        analyserRef.current = analyser;
        setCurrentFileName(file.name);
        audio.onended = () => {
          stopLoop();
          setMode("off");
        };
        await audio.play();
        startLoop(analyser);
        setMode("file");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "playback failed");
        teardownFile();
        setMode("off");
      }
    },
    [ensureCtx, startLoop, stopLoop, teardownFile, teardownMic],
  );

  const stopFile = useCallback(() => {
    stopLoop();
    teardownFile();
    setMode("off");
  }, [stopLoop, teardownFile]);

  // Full teardown on unmount so the lab doesn't leave a dangling
  // AudioContext when the user navigates away mid-playback.
  useEffect(() => {
    return () => {
      stopLoop();
      teardownMic();
      teardownFile();
      try {
        audioCtxRef.current?.close();
      } catch {
        /* already closed */
      }
      audioCtxRef.current = null;
    };
  }, [stopLoop, teardownMic, teardownFile]);

  return {
    amplitudeRef,
    mode,
    startMic,
    stopMic,
    playFile,
    stopFile,
    errorMsg,
    currentFileName,
  };
}
