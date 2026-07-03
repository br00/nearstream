// A request from someone who isn't on the allowlist yet. When a visitor
// hits /login with an email the instance doesn't know, we no longer
// dead-end them — we show a Request Access form that lands here. The
// host reviews the queue in /settings under Host tools; approving adds
// the email to the persisted allowlist (extends the env-var list) and
// sends a welcome magic-link.
//
// Storage: `access-requests/{id}.json` in R2. One file per record so
// updates don't race, list is O(N) at small volume, and expiry is a
// future problem.

export type AccessRequestStatus = "pending" | "approved" | "denied";

export type AccessRequest = {
  id: string;
  /** Normalized (lower-case, trimmed) email of the requester. */
  email: string;
  /** Free-form context — "who are you, why do you want in." Capped
   *  server-side; we surface it to the host in the review queue so they
   *  can decide without a follow-up. */
  message: string;
  requestedAt: string;
  status: AccessRequestStatus;
  reviewedAt?: string;
  /** The user id of the host who approved / denied. Kept for audit even
   *  though today there's only one host. */
  reviewedBy?: string;
};

export type NewAccessRequest = {
  email: string;
  message: string;
};

/** Cap on the message body. The host reads these one at a time — long
 *  screeds are noise. Enough for "I'm Alessandro's cousin, met at Chris'
 *  birthday" but not enough for a manifesto. */
export const MESSAGE_MAX = 500;

export function isAccessRequestStatus(v: unknown): v is AccessRequestStatus {
  return v === "pending" || v === "approved" || v === "denied";
}
