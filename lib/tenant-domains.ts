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
