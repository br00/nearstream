"use client";

import { useState } from "react";

// One-tap "share my Nearstream" button. Tries the OS share sheet (Web Share
// API) first — on phones this opens WhatsApp / Messages / Mail / anything
// the friend has installed, with the message and URL pre-filled. Falls back
// to copy-to-clipboard on desktop browsers that don't expose `navigator.share`.
//
// Used on /settings next to the user's URL block so sending your Nearstream
// to a friend is one tap, not "open your URL, select, copy, switch app, paste."

type Props = {
  /** The URL being shared — usually the tenant RSS feed so it pastes
   *  directly into a friend's /reader/friends form. */
  url: string;
  /** Short prefix the share sheet shows before the URL. Most clients
   *  concatenate `text` + ` ` + `url`. */
  message: string;
  /** Optional title — many share targets ignore this, some show it. */
  title?: string;
  /** Default visible label on the button. */
  label?: string;
};

type Status = "idle" | "copied" | "shared" | "error";

export function ShareUrlButton({
  url,
  message,
  title = "Add me on Nearstream",
  label = "Share →",
}: Props) {
  const [status, setStatus] = useState<Status>("idle");

  async function handleShare() {
    const composed = `${message} ${url}`;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: message, url });
        setStatus("shared");
        resetSoon(setStatus);
        return;
      } catch (err) {
        // User dismissed the share sheet — no state change needed.
        if (err instanceof Error && err.name === "AbortError") return;
        // Anything else: fall through to clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(composed);
      setStatus("copied");
      resetSoon(setStatus);
    } catch {
      setStatus("error");
      resetSoon(setStatus);
    }
  }

  const statusLabel: Record<Status, string> = {
    idle: label,
    shared: "Shared ✓",
    copied: "Copied to clipboard",
    error: "Couldn't share — copy manually",
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleShare}
        className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground hover:text-background"
        aria-live="polite"
      >
        {statusLabel[status]}
      </button>
    </div>
  );
}

function resetSoon(set: (s: Status) => void) {
  setTimeout(() => set("idle"), 2400);
}
