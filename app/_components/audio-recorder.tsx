"use client";

// AudioRecorder — MediaRecorder wrapper for voice notes (slice 39).
//
// Flow:
//   idle → recording → recorded (preview via AudioPlayer)
//   recorded → retake → idle
//   recorded → parent decides to post
//
// The parent owns the "post" affordance and the surrounding form fields
// (mode picker, caption, visibility). This component owns just the
// audio capture and preview. On every state change it calls `onChange`
// with the current blob (or null when reset), so the parent can
// enable/disable its submit button and read the payload at post time.
//
// Design calls:
// - Tap-to-start / tap-to-stop rather than press-and-hold. A press-and-
//   hold slip on mobile loses the whole recording — bad trade for a
//   marginally punchier feel.
// - 60s hard cap with a visible countdown; auto-stops at the cap.
// - Mic permission is requested lazily on tap (so a signed-in visitor
//   who never touches the recorder isn't prompted).

import { useCallback, useEffect, useRef, useState } from "react";
import { VOICE_NOTE_MAX_MS } from "@/schemas/stream";
import { AudioPlayer } from "@/app/_components/audio-player";

type Recorded = {
  blob: Blob;
  url: string;
  durationMs: number;
  mime: "audio/webm" | "audio/mp4";
};

type Props = {
  onChange: (r: Recorded | null) => void;
};

/** Pick the best MediaRecorder MIME the current browser supports. Chromium
 *  + Android hand us webm/opus; Safari hands us mp4/aac. We prefer the
 *  browser's default because transcoding costs bytes and quality. */
function pickMime(): "audio/webm" | "audio/mp4" {
  if (typeof MediaRecorder === "undefined") {
    // Fallback shouldn't ship — we early-return before calling record()
    // in unsupported browsers. Return webm to satisfy the type.
    return "audio/webm";
  }
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "audio/webm";
}

function formatSeconds(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export function AudioRecorder({ onChange }: Props) {
  const [phase, setPhase] = useState<"idle" | "recording" | "recorded" | "unsupported" | "denied">(
    typeof MediaRecorder === "undefined" ? "unsupported" : "idle",
  );
  const [elapsedMs, setElapsedMs] = useState(0);
  const [recorded, setRecorded] = useState<Recorded | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const autoStopRef = useRef<number | null>(null);

  // Revoke object URL when recorded audio is replaced or the component
  // unmounts — otherwise the blob is kept alive by the browser.
  useEffect(() => {
    return () => {
      if (recorded?.url) URL.revokeObjectURL(recorded.url);
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop();
      }
      if (tickRef.current !== null) window.clearInterval(tickRef.current);
      if (autoStopRef.current !== null) window.clearTimeout(autoStopRef.current);
    };
  }, [recorded]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    setErrMsg(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setPhase("denied");
      setErrMsg("Microphone permission denied. Enable it in your browser settings and reload.");
      return;
    }
    streamRef.current = stream;
    const mime = pickMime();
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const durationMs = performance.now() - startedAtRef.current;
      const blob = new Blob(chunksRef.current, { type: mime });
      const url = URL.createObjectURL(blob);
      const next: Recorded = { blob, url, durationMs, mime };
      setRecorded(next);
      onChange(next);
      setPhase("recorded");

      // Release the mic.
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop();
        streamRef.current = null;
      }
      if (tickRef.current !== null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      if (autoStopRef.current !== null) {
        window.clearTimeout(autoStopRef.current);
        autoStopRef.current = null;
      }
    };

    startedAtRef.current = performance.now();
    setElapsedMs(0);
    setPhase("recording");
    recorder.start();

    tickRef.current = window.setInterval(() => {
      setElapsedMs(performance.now() - startedAtRef.current);
    }, 100);
    autoStopRef.current = window.setTimeout(() => {
      stopRecording();
    }, VOICE_NOTE_MAX_MS);
  }, [onChange, stopRecording]);

  const retake = useCallback(() => {
    if (recorded?.url) URL.revokeObjectURL(recorded.url);
    setRecorded(null);
    onChange(null);
    setPhase("idle");
    setElapsedMs(0);
    setErrMsg(null);
  }, [recorded, onChange]);

  if (phase === "unsupported") {
    return (
      <div className="border border-border p-4 text-sm text-muted-soft">
        Your browser doesn&rsquo;t support voice recording. Try Safari 14.5+ on iOS or
        Chrome/Firefox on Android/desktop.
      </div>
    );
  }

  const remainingMs = Math.max(0, VOICE_NOTE_MAX_MS - elapsedMs);

  return (
    <div className="flex flex-col gap-4">
      {phase === "idle" && (
        <button
          type="button"
          onClick={startRecording}
          className="flex items-center justify-center gap-3 border border-border px-5 py-4 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:border-foreground/60 hover:bg-foreground/5"
        >
          <span className="inline-block h-3 w-3 rounded-full bg-foreground" aria-hidden />
          Tap to record
        </button>
      )}

      {phase === "recording" && (
        <button
          type="button"
          onClick={stopRecording}
          className="flex items-center justify-between gap-3 border border-foreground px-5 py-4 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground"
        >
          <span className="flex items-center gap-3">
            <span
              className="inline-block h-3 w-3 animate-pulse rounded-full bg-red-500"
              aria-hidden
            />
            Recording — tap to stop
          </span>
          <span>{formatSeconds(elapsedMs)} · {formatSeconds(remainingMs)} left</span>
        </button>
      )}

      {phase === "recorded" && recorded && (
        <div className="flex flex-col items-center gap-4 border border-border p-4">
          <AudioPlayer
            src={recorded.url}
            durationMs={recorded.durationMs}
            mime={recorded.mime}
            size={200}
          />
          <button
            type="button"
            onClick={retake}
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted underline underline-offset-4 hover:text-foreground"
          >
            Retake
          </button>
        </div>
      )}

      {phase === "denied" && errMsg && (
        <div className="border border-border p-4 text-sm text-muted-soft">{errMsg}</div>
      )}
    </div>
  );
}
