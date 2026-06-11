// A User is a tenant on the instance — one person who signs in and posts.
// "Friend graph is local" (NEARSTREAM.md §05) applies to the *reader's* list
// of who you follow; this is the *instance's* list of who lives here.
//
// `handle` is the URL slug — the user's site lives at `/{handle}` on the
// instance (and at their custom domain, if one is attached via the
// TENANT_DOMAINS env-var map). Handle is chosen during onboarding and is
// immutable afterwards — it's part of the user's identity.
//
// `email` is the auth identifier; the allowlist still gates who can sign in.

export type User = {
  id: string;
  email: string;
  /** URL slug, lowercase alphanumeric + hyphens. Immutable. Empty until onboarding completes. */
  handle: string;
  /** Free-form display name shown on the user's site and in the reader. */
  displayName: string;
  /**
   * Index into PROFILE_MARK_VARIANTS — the animated mark we render where
   * other products would show a profile photo. Optional for back-compat with
   * users created before profile marks shipped (treated as variant 0).
   */
  profileMark?: number;
  createdAt: string;
};

export type NewUser = Pick<User, "email">;

/** Minimal validator: 2–32 chars, lowercase letters / digits / hyphens, can't start or end with hyphen. */
export function isValidHandle(value: string): boolean {
  if (typeof value !== "string") return false;
  if (value.length < 2 || value.length > 32) return false;
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value)) return false;
  // Reserve a small set of paths that would collide with instance routes.
  const reserved = new Set([
    "api",
    "auth",
    "login",
    "logout",
    "signup",
    "onboarding",
    "studio",
    "reader",
    "design",
    "tenant",
    "about",
    "manifesto",
    "rss",
    "rss.xml",
    "favicon.ico",
    "robots.txt",
    "sitemap.xml",
  ]);
  return !reserved.has(value);
}
