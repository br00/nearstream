// Protocol state (PROTOCOL.md §5, §6) — two small collections:
//
//  - Keys you've issued:   users/{ownerId}/keys/{token}
//    One per friend you share with. The token *is* the key; it appears in
//    the friend's feed URL `/{handle}/feed/{token}`. Revoking marks the row
//    rather than deleting it, so the feed can answer `410 Gone` (final)
//    instead of `404` (maybe temporary).
//
//  - Shares waiting for you: users/{userId}/pending-shares/{id}
//    A `share` ring that passed verification, waiting for accept / ignore.
//    Accept turns it into a reader Source; either way the row is deleted.
//    This is the only thing a ring ever leaves behind, and it holds no
//    content — just who, and the key URL.

import { jsonCollection } from "@/lib/json-collection";

export type ShareKey = {
  token: string;
  ownerId: string;
  /** Who it was made for (their protocol address). */
  friendAddress: string;
  friendName: string;
  /** Where to ring them when something's new. */
  doorbell: string;
  createdAt: string;
  revokedAt?: string;
};

export type PendingShare = {
  id: string;
  userId: string;
  fromAddress: string;
  fromName: string;
  keyUrl: string;
  receivedAt: string;
};

const keys = jsonCollection<ShareKey>("share-keys");
const pending = jsonCollection<PendingShare>("pending-shares");

const keyPath = (ownerId: string, token: string) => `users/${ownerId}/keys/${token}`;
const pendingPath = (userId: string, id: string) =>
  `users/${userId}/pending-shares/${id}`;

/** ≥128 random bits (we use 192), base64url, `k_` prefix so a key is
 *  recognisable in logs. */
export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return `k_${btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

export function isTokenShaped(value: string): boolean {
  return /^k_[A-Za-z0-9_-]{32}$/.test(value);
}

export const shareStore = {
  // ── keys ──
  async getKey(ownerId: string, token: string): Promise<ShareKey | null> {
    if (!isTokenShaped(token)) return null;
    return keys.get(keyPath(ownerId, token));
  },
  async listKeys(ownerId: string): Promise<ShareKey[]> {
    const all = await keys.list(`users/${ownerId}/keys/`);
    return all.sort((a, b) => a.friendName.localeCompare(b.friendName));
  },
  async liveKeys(ownerId: string): Promise<ShareKey[]> {
    return (await this.listKeys(ownerId)).filter((k) => !k.revokedAt);
  },
  async addKey(key: ShareKey): Promise<void> {
    await keys.put(keyPath(key.ownerId, key.token), key);
  },
  async revokeKey(ownerId: string, token: string): Promise<ShareKey | null> {
    const key = await this.getKey(ownerId, token);
    if (!key || key.revokedAt) return key;
    const revoked = { ...key, revokedAt: new Date().toISOString() };
    await keys.put(keyPath(ownerId, token), revoked);
    return revoked;
  },

  // ── pending shares ──
  async listPending(userId: string): Promise<PendingShare[]> {
    const all = await pending.list(`users/${userId}/pending-shares/`);
    return all.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  },
  async getPending(userId: string, id: string): Promise<PendingShare | null> {
    if (!/^[0-9a-f-]{36}$/.test(id)) return null;
    return pending.get(pendingPath(userId, id));
  },
  async addPending(share: Omit<PendingShare, "id" | "receivedAt">): Promise<PendingShare> {
    // One pending share per sender: a second ring replaces the first rather
    // than stacking up — this is not an inbox.
    const existing = (await this.listPending(share.userId)).filter(
      (p) => p.fromAddress === share.fromAddress,
    );
    await Promise.all(existing.map((p) => pending.delete(pendingPath(p.userId, p.id))));
    const row: PendingShare = {
      ...share,
      id: crypto.randomUUID(),
      receivedAt: new Date().toISOString(),
    };
    await pending.put(pendingPath(row.userId, row.id), row);
    return row;
  },
  async deletePending(userId: string, id: string): Promise<boolean> {
    return pending.delete(pendingPath(userId, id));
  },
};
