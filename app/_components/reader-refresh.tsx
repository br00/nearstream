"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Single source of truth for the "refresh feed" affordance on /reader.
// Replaces the old POST-form button that required the user to tap before
// any feed fetch would happen.
//
// Slice 30 originally tied a single `busy` state to both auto-refresh and
// click-refresh, but `refreshAllSources` is sequential — a slow friend
// feed could leave the label stuck on "Refreshing…" for 10+ seconds while
// the actual page contents (served from local R2) were already there. That
// looked broken even though it was honest. Slice 31 splits the two:
//
//   - Auto-refresh on mount runs silently. The user sees what's in the
//     store right now; if the background fetch finds new entries, they
//     just appear when `router.refresh()` lands.
//   - Click (or pull-to-refresh, which is a page reload) shows "Refreshing…"
//     so the user gesture has an obvious response.

type Props = { needsRefresh: boolean };

export function ReaderRefresh({ needsRefresh }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!needsRefresh) return;
    let cancelled = false;
    (async () => {
      await postRefresh();
      if (cancelled) return;
      router.refresh();
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
