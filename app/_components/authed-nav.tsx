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
 *  it's `position: fixed` so it floats over the page. Hidden at sm and up. */
export function AuthedNavBottom({ active, tenantHandle }: NavProps) {
  const tabs = buildTabs(tenantHandle);
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur sm:hidden"
    >
      <ul className="grid grid-cols-4">
        {tabs.map((t) => {
          const isActive = active === t.key;
          return (
            <li key={t.key}>
              <Link
                href={t.href}
                className={
                  "flex flex-col items-center justify-center gap-1.5 py-3 font-mono text-[9.5px] uppercase tracking-[0.2em] " +
                  (isActive
                    ? "text-foreground"
                    : "text-muted-soft transition-colors hover:text-foreground")
                }
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  aria-hidden
                  className={
                    "block h-1 w-1 rounded-full " +
                    (isActive ? "bg-foreground" : "bg-transparent")
                  }
                />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
