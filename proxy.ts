import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

// Parse `TENANT_DOMAINS=alessandroborelli.it:alessandro,gosia.pl:gosia` into
// a map { "alessandroborelli.it": "alessandro", ... }. The parse runs once at
// module load.
const tenantByDomain: Record<string, string> = (() => {
  const raw = process.env.TENANT_DOMAINS ?? "";
  const out: Record<string, string> = {};
  for (const pair of raw.split(",")) {
    const [domain, handle] = pair.split(":");
    if (!domain || !handle) continue;
    out[domain.trim().toLowerCase()] = handle.trim();
  }
  return out;
})();

const GATED_PREFIXES = ["/studio", "/reader", "/onboarding"];

function isGated(path: string): boolean {
  return GATED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}

export function proxy(request: NextRequest): NextResponse {
  const url = request.nextUrl;
  const rawHost = request.headers.get("host")?.toLowerCase() ?? "";
  // Strip a leading `www.` so TENANT_DOMAINS only needs the apex form. Vercel
  // (and most hosts) redirect bare → www, so the proxy sees `www.example.com`
  // even when the env value is `example.com`.
  const host = rawHost.startsWith("www.") ? rawHost.slice(4) : rawHost;
  const hostHandle = tenantByDomain[host];

  // ── Canonical-URL redirect on custom domains ──────────────────────────
  // On alessandroborelli.it, the URL `/alessandro/library` reads as the
  // wrong identity — the handle defeats the point of owning the domain.
  // Redirect to the bare form so `/alessandro/library` → `/library` and
  // `/alessandro` → `/`. The rewrite step below will then internally map
  // `/library` → `/alessandro/library` for routing without showing the
  // handle in the URL bar.
  if (
    hostHandle &&
    (url.pathname === `/${hostHandle}` ||
      url.pathname.startsWith(`/${hostHandle}/`))
  ) {
    const stripped =
      url.pathname === `/${hostHandle}`
        ? "/"
        : url.pathname.slice(`/${hostHandle}`.length);
    return NextResponse.redirect(
      new URL(stripped + url.search, request.url),
    );
  }

  // ── 1. Custom-domain rewrite ──────────────────────────────────────────
  // alessandroborelli.it/library → /alessandro/library (URL bar unchanged).
  // Don't rewrite the auth + tenant-owner UIs (those are instance-level).
  if (hostHandle && url.pathname.startsWith("/") && !isInstanceOnlyPath(url.pathname)) {
    const rewritten = url.pathname === "/"
      ? `/${hostHandle}`
      : `/${hostHandle}${url.pathname}`;
    const rewrite = NextResponse.rewrite(new URL(rewritten + url.search, request.url));
    // Still apply auth gate to gated paths on custom domains.
    if (
      isGated(url.pathname) &&
      !request.cookies.get(SESSION_COOKIE_NAME)
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return rewrite;
  }

  // ── 2. Auth gate for instance paths ───────────────────────────────────
  if (isGated(url.pathname) && !request.cookies.get(SESSION_COOKIE_NAME)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

// Paths that belong to the *instance* (not a tenant), even when reached on a
// custom domain. We don't rewrite these — alessandroborelli.it/login still
// serves the instance login page.
function isInstanceOnlyPath(path: string): boolean {
  return (
    path.startsWith("/api/") ||
    path.startsWith("/auth/") ||
    path === "/login" ||
    path === "/onboarding" ||
    path === "/signup" ||
    path === "/studio" ||
    path.startsWith("/studio/") ||
    path === "/reader" ||
    path.startsWith("/reader/") ||
    path === "/design" ||
    path === "/about" ||
    path === "/favicon.ico" ||
    path === "/robots.txt" ||
    path === "/sitemap.xml"
  );
}

// Run on every path so both rewrites and auth gates have a chance to fire.
// `/api/*` requests skip the matcher's heavy work via early exit above.
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next internals)
     * - any file with an extension (likely a static asset that's not an SSR'd asset endpoint)
     */
    "/((?!_next/static|_next/image).*)",
  ],
};
