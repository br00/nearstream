import Link from "next/link";
import { tenantBase } from "@/lib/tenant-domains";

// Authed nav across /studio, /reader, /settings — one component, two
// layouts. Desktop renders an inline horizontal nav in PageShell's rightNav
// slot. Mobile renders a fixed bottom tab bar, iOS/Android style, so the
// thumb-reach pattern matches what friends expect from a phone-first app.
//
// Five surfaces collapse to four tabs because Library is reachable in one
// click from Site (the tenant home links it in its own nav). Four tabs is
// the sweet spot for bottom bars — five starts to crowd and labels truncate.

export type AuthedTab = "site" | "studio" | "reader" | "settings";

type NavProps = {
  active: AuthedTab;
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

/** Inline horizontal nav for desktop. Passed into PageShell's rightNav slot.
 *  Hidden below the sm breakpoint so the mobile bottom bar takes over. */
export function AuthedNavTop({ active, tenantHandle }: NavProps) {
  const tabs = buildTabs(tenantHandle);
  return (
    <div className="hidden items-center gap-5 sm:flex">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
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
 *  2px bar above the active tab (replaces the dot), and the bar pads
 *  pb-[28px] for the iOS home-indicator safe area so labels aren't sitting
 *  on top of the gesture bar. */
export function AuthedNavBottom({ active, tenantHandle }: NavProps) {
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
