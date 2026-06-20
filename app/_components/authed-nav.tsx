"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { tenantBase } from "@/lib/tenant-domains";

// Authed nav across /studio, /reader, /settings — one component, two
// layouts. Desktop renders an inline horizontal nav in PageShell's rightNav
// slot. Mobile renders a fixed bottom tab bar, iOS/Android style, so the
// thumb-reach pattern matches what friends expect from a phone-first app.
//
// Slice 31 had a "make the nav a client component reading usePathname" fix
// that didn't actually solve the lag. `usePathname` returns the *current*
// path, which in App Router doesn't update until the navigation transition
// commits — so a tap still waited on the next page's server render before
// the highlight moved. Slice 32 layers optimistic state on top: tapping a
// tab immediately sets an `intended` key; once pathname catches up the
// intent clears and pathname is source of truth again. Active state moves
// the instant the user taps, regardless of how slow the next page is.
//
// Five surfaces collapse to four tabs because Library is reachable in one
// click from Site (the tenant home links it in its own nav). Four tabs is
// the sweet spot for bottom bars — five starts to crowd and labels truncate.

export type AuthedTab = "site" | "studio" | "reader" | "settings";

type NavProps = {
  tenantHandle: string;
};

function buildTabs(handle: string) {
  return [
    { key: "site" as const, label: "Site", href: tenantBase(handle) },
    { key: "studio" as const, label: "Studio", href: "/studio" },
    { key: "reader" as const, label: "Reader", href: "/reader" },
    { key: "settings" as const, label: "Settings", href: "/settings" },
  ];
}

function activeFromPathname(pathname: string): AuthedTab {
  if (pathname.startsWith("/studio")) return "studio";
  if (pathname.startsWith("/reader")) return "reader";
  if (pathname.startsWith("/settings")) return "settings";
  return "site";
}

// Shared by AuthedNavTop and AuthedNavBottom. Active state is derived
// purely from { intent, pathname }: the intent is only honored while the
// user is still on the pathname they tapped from, so once navigation
// commits to a new path the pathname-derived value takes over without us
// having to clear state. No effect, no extra render — fixes the lint rule
// against setting state in effect and gives us the instant tap response.
function useAuthedActive(): {
  active: AuthedTab;
  setIntent: (key: AuthedTab) => void;
} {
  const pathname = usePathname();
  const real = activeFromPathname(pathname);
  const [intent, setIntent] = useState<{ key: AuthedTab; from: string } | null>(
    null,
  );
  const active =
    intent && intent.from === pathname ? intent.key : real;

  function tap(key: AuthedTab) {
    setIntent({ key, from: pathname });
  }

  return { active, setIntent: tap };
}

/** Inline horizontal nav for desktop. Passed into PageShell's rightNav slot.
 *  Hidden below the sm breakpoint so the mobile bottom bar takes over. */
export function AuthedNavTop({ tenantHandle }: NavProps) {
  const { active, setIntent } = useAuthedActive();
  const tabs = buildTabs(tenantHandle);
  return (
    <div className="hidden items-center gap-5 sm:flex">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          onClick={() => setIntent(t.key)}
          className={
            active === t.key
              ? "font-mono text-[11px] uppercase tracking-[0.2em] text-foreground"
              : "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground"
          }
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

/** Fixed bottom tab bar for mobile. Render outside or inside PageShell —
 *  it's `position: fixed` so it floats over the page. Hidden at sm and up.
 *
 *  Slice 29 (mobile lab → real): label up to 11px and tracking-[0.22em],
 *  tap target py-4 so the row clears the 44pt iOS minimum, indicator is a
 *  2px bar above the active tab, and the bar pads pb-[28px] for the iOS
 *  home-indicator safe area so labels aren't sitting on top of the gesture
 *  bar. */
export function AuthedNavBottom({ tenantHandle }: NavProps) {
  const { active, setIntent } = useAuthedActive();
  const tabs = buildTabs(tenantHandle);
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[28px] backdrop-blur sm:hidden"
    >
      <ul className="grid grid-cols-4">
        {tabs.map((t) => {
          const isActive = active === t.key;
          return (
            <li key={t.key} className="relative">
              {isActive && (
                <span
                  aria-hidden
                  className="absolute inset-x-6 top-0 h-[2px] bg-foreground"
                />
              )}
              <Link
                href={t.href}
                onClick={() => setIntent(t.key)}
                className={
                  "flex items-center justify-center py-4 font-mono text-[11px] uppercase tracking-[0.22em] " +
                  (isActive
                    ? "text-foreground"
                    : "text-muted-soft transition-colors hover:text-foreground")
                }
                aria-current={isActive ? "page" : undefined}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
