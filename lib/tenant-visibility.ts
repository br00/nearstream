// Central logic for "can this session view this tenant's site?" — the
// enforcement point for `User.preferences.sitePrivacy` (slice 36).
//
// Every tenant read path (home, stream, library index + detail pages,
// RSS) calls this before rendering. Keeping the rule in one place means
// we can't accidentally leak private content by forgetting to check on
// a new route.

import type { Session } from "@/lib/auth";
import { isHostEmail } from "@/lib/auth";
import type { SitePrivacy, User } from "@/schemas/user";

/** Reason a viewer can't see a tenant, when denied. `sign-in` means we
 *  should send them to /login; `not-for-you` is terminal (they're
 *  signed in but not the owner of a private site). */
export type VisibilityDenial = "sign-in" | "not-for-you";

export type VisibilityResult =
  | { allowed: true }
  | { allowed: false; reason: VisibilityDenial };

/**
 * When a user hasn't set a `sitePrivacy` preference yet:
 *
 *  - The instance host defaults to `public` — the host's tenant is the
 *    public face of Nearstream and needs to be linkable from LinkedIn,
 *    from the landing page, etc.
 *  - Everyone else defaults to `friends` — a random URL guess doesn't
 *    reveal a friend's site. Friends can opt into `public` from
 *    /settings/display if they want.
 *
 * Existing users on the instance who haven't opened the picker inherit
 * this default automatically on their next page load, which is exactly
 * what we want for the LinkedIn ship: friends' sites become invisible
 * to strangers until they explicitly choose otherwise.
 */
export function defaultSitePrivacy(email: string): SitePrivacy {
  return isHostEmail(email) ? "public" : "friends";
}

/** Resolve the effective privacy for a tenant, applying the default. */
export function resolveSitePrivacy(user: User): SitePrivacy {
  return user.preferences?.sitePrivacy ?? defaultSitePrivacy(user.email);
}

/** The single rule enforced on every tenant read path. */
export function checkTenantVisibility(
  tenant: User,
  session: Session | null,
): VisibilityResult {
  const privacy = resolveSitePrivacy(tenant);
  const isOwner = session?.userId === tenant.id;

  // Owner always sees their own site regardless of privacy mode.
  if (isOwner) return { allowed: true };

  switch (privacy) {
    case "public":
      return { allowed: true };
    case "friends":
      return session
        ? { allowed: true }
        : { allowed: false, reason: "sign-in" };
    case "private":
      return session
        ? { allowed: false, reason: "not-for-you" }
        : { allowed: false, reason: "sign-in" };
  }
}
