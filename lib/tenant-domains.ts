// Reverse map for TENANT_DOMAINS. The proxy already builds the forward map
// (domain → handle); these helpers go the other way (handle → domain) so we
// can render the right URLs in nav and post-publish redirects.
//
// Parse-once on module load; the env value is static per deploy.

const tenantByHandle: Record<string, string> = (() => {
  const raw = process.env.TENANT_DOMAINS ?? "";
  const out: Record<string, string> = {};
  for (const pair of raw.split(",")) {
    const [domain, handle] = pair.split(":");
    if (!domain || !handle) continue;
    out[handle.trim()] = domain.trim().toLowerCase();
  }
  return out;
})();

/** Custom domain attached to this handle, or null if none. */
export function customDomainFor(handle: string): string | null {
  return tenantByHandle[handle] ?? null;
}

/** Canonical base URL for a tenant's site.
    With custom domain → "https://alessandroborelli.it"
    Without → "/alessandro" (instance-relative path).

    Used for nav links and in-page anchors so the URL never includes the
    handle when the tenant has a custom domain. */
export function tenantBase(handle: string): string {
  const custom = customDomainFor(handle);
  return custom ? `https://${custom}` : `/${handle}`;
}

/** Always-absolute base URL for a tenant's site, useful for RSS channel
    links + per-item permalinks where relative paths aren't valid.

    With custom domain → "https://alessandroborelli.it"
    Without → "{instanceUrl}/{handle}" */
export function tenantAbsoluteBase(
  handle: string,
  instanceUrl: string,
): string {
  const custom = customDomainFor(handle);
  return custom ? `https://${custom}` : `${instanceUrl}/${handle}`;
}

// URL normalization for equality comparisons across stored source rows.
// A source added when NEARSTREAM_SITE_URL was `nearstream.app` won't match
// today's canonical `www.nearstream.app` under strict equality — same for
// mixed-case hosts. We normalize on read so the comparisons in the
// tenant "already following?" check and the fetcher's same-instance
// check are self-healing: no migration needed, stale rows just work.

/** Lowercase host, strip a leading `www.`. */
export function normalizeHost(host: string): string {
  const lower = host.toLowerCase();
  return lower.startsWith("www.") ? lower.slice(4) : lower;
}

/** Normalize a URL string for equality comparison — normalizes the host
 *  and drops a trailing slash. Preserves protocol, path, and query.
 *  Returns the input unchanged if parsing fails. */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.host = normalizeHost(u.host);
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

/** True when two URL strings share a host (after normalization). */
export function sameInstanceHost(a: string, b: string): boolean {
  try {
    return normalizeHost(new URL(a).host) === normalizeHost(new URL(b).host);
  } catch {
    return false;
  }
}
