"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Single source of truth for the "refresh feed" affordance on /reader.
// Replaces the old POST-form button that required the user to tap before
// any feed fetch would happen.
//
// Two roles in one button:
//   - On mount, if `needsRefresh` is true (server side decided at least one
//     source's `lastFetchedAt` is missing or older than 5 min), kick off
//     `/api/sources/refresh` in the background and `router.refresh()` once
//     it lands. iOS Safari's pull-to-refresh gesture reloads the page,
//     which re-runs this same flow — so PTR works for free.
//   - On click, do the same work explicitly.
//
// The label flips to "Refreshing…" while in flight so the user knows the
// gesture they pulled (or the auto-fetch on visit) is doing something.

type Props = { needsRefresh: boolean };

export function ReaderRefresh({ needsRefresh }: Props) {
  const router = useRouter();
  // Start busy if the server flagged anything stale — otherwise the button
  // would flash "Refresh all" for a frame before the effect kicks in.
  const [busy, setBusy] = useState(needsRefresh);

  useEffect(() => {
    if (!needsRefresh) return;
    let cancelled = false;
    (async () => {
      await postRefresh();
      if (cancelled) return;
      router.refresh();
      setBusy(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [needsRefresh, router]);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    await postRefresh();
    router.refresh();
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground disabled:opacity-60"
      aria-live="polite"
    >
      {busy ? "Refreshing…" : "Refresh all"}
    </button>
  );
}

async function postRefresh(): Promise<void> {
  try {
    await fetch("/api/sources/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
  } catch {
    // Network errors fall through silently — the button stays available
    // for a manual retry and the next visit will try again automatically.
  }
}
