// The protocol's moving parts (PROTOCOL.md §5–§6, §8), as plain functions
// the routes call. Outbound: share, revoke, announce. Inbound: a `share`
// ring, a `new` ring, accept / ignore.

import { after } from "next/server";
import type { User } from "@/schemas/user";
import { shareStore, newToken, type PendingShare, type ShareKey } from "@/lib/share-store";
import type { Source } from "@/schemas/source";
import { sourceStore } from "@/lib/source-store";
import { feedEntryStore } from "@/lib/feed-entry-store";
import { refreshSource } from "@/lib/feed-fetcher";
import {
  addressOf,
  discover,
  isKeyFrom,
  isProtocolUrl,
  keyAnswers,
  normalizeAddress,
  ring,
  siteUrlFor,
  urlForAddress,
} from "@/lib/protocol";

export type ShareResult =
  | { ok: true; key: ShareKey; rung: boolean }
  | { ok: false; error: string };

export function keyUrlFor(owner: User, token: string): string {
  return `${siteUrlFor(owner)}/feed/${token}`;
}

// ─── Outbound ─────────────────────────────────────────────────────────

/** §8 steps 1–3: look the address up, make (or reuse) their key, ring. */
export async function shareWith(owner: User, rawAddress: string): Promise<ShareResult> {
  const address = normalizeAddress(rawAddress);
  if (!address) return { ok: false, error: "That doesn’t look like an address." };
  if (address === addressOf(owner)) {
    return { ok: false, error: "That’s your own address." };
  }

  const doc = await discover(address);
  if (!doc) {
    return { ok: false, error: `No Nearstream found at ${address}.` };
  }

  // Sharing again with someone who already has a live key re-rings with
  // the same key rather than minting a second one: one friend, one key.
  const existing = (await shareStore.liveKeys(owner.id)).find(
    (k) => k.friendAddress === address,
  );
  const key: ShareKey = existing ?? {
    token: newToken(),
    ownerId: owner.id,
    friendAddress: address,
    friendName: doc.name,
    doorbell: doc.doorbell,
    createdAt: new Date().toISOString(),
  };
  if (!existing) await shareStore.addKey(key);

  const rung = await ring(doc.doorbell, {
    ring: "share",
    from: addressOf(owner),
    key: keyUrlFor(owner, key.token),
  });
  return { ok: true, key, rung };
}

/** §8 step 9. The key answers 410 from now on; the `new` ring makes the
 *  friend notice in seconds rather than at their next poll. */
export async function revoke(owner: User, token: string): Promise<ShareKey | null> {
  const key = await shareStore.revokeKey(owner.id, token);
  if (key) {
    const from = addressOf(owner);
    after(() => ring(key.doorbell, { ring: "new", from }).then(() => undefined));
  }
  return key;
}

/** §8 step 7: tell everyone you share with that something's new. Runs
 *  after the response, so posting never waits on friends' servers. */
export function announceNew(owner: User): void {
  after(async () => {
    const from = addressOf(owner);
    const doorbells = new Set((await shareStore.liveKeys(owner.id)).map((k) => k.doorbell));
    await Promise.all([...doorbells].map((d) => ring(d, { ring: "new", from })));
  });
}

// ─── Inbound ──────────────────────────────────────────────────────────

export type Namesake = { name: string; address: string | null };

/** A friend you already read under the same name as this pending share,
 *  at a different address. Names are self-chosen, so this is the one
 *  impersonation no protocol check can catch ("Alessandro Borelli" at
 *  someone else's address). Shown next to the share, so the person decides
 *  with both addresses in front of them. Exact match after normalising
 *  case, spacing and Unicode forms; looser matching would fire on every
 *  "Marco". `address` is null for a feed added by hand without a site. */
export function namesakeOf(
  share: Pick<PendingShare, "fromName" | "fromAddress">,
  sources: Source[],
): Namesake | null {
  const norm = (n: string) => n.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  const wanted = norm(share.fromName);
  if (!wanted) return null;
  for (const s of sources) {
    if (norm(s.name) !== wanted) continue;
    // Never the feed URL: for a shared friend it's their key.
    const address = s.address ?? (s.siteUrl ? normalizeAddress(s.siteUrl) : null);
    if (address === share.fromAddress) continue;
    return { name: s.name, address };
  }
  return null;
}

/** §6 `share`: verify, then hold it as a pending share. Silent on failure —
 *  the doorbell answers 202 regardless, so it can't be used to probe. */
export async function receiveShare(
  recipient: User,
  rawFrom: unknown,
  rawKey: unknown,
): Promise<void> {
  if (typeof rawFrom !== "string" || typeof rawKey !== "string") return;
  const from = normalizeAddress(rawFrom);
  if (!from || from === addressOf(recipient)) return;
  if (!isProtocolUrl(rawKey)) return;

  // 1. Fetch the sender's discovery document.
  const doc = await discover(from);
  if (!doc) return;
  // 2. The key must be one the sender issued: under `{from}/feed/`, worked
  //    out from the address rather than read from their document.
  if (!isKeyFrom(from, rawKey)) return;
  // 3. The key must answer with a feed.
  if (!(await keyAnswers(rawKey))) return;

  // Already reading them through this exact key → nothing to ask.
  const sources = await sourceStore.list(recipient.id);
  if (sources.some((s) => s.feedUrl === rawKey)) return;

  await shareStore.addPending({
    userId: recipient.id,
    fromAddress: from,
    fromName: doc.name,
    keyUrl: rawKey,
  });
}

/** §6 `new`: re-fetch whatever we already hold from that address. Only
 *  ever fetches URLs we already trust, so a forged ring costs one request. */
export async function receiveNew(recipient: User, rawFrom: unknown): Promise<void> {
  if (typeof rawFrom !== "string") return;
  const from = normalizeAddress(rawFrom);
  if (!from) return;
  const sources = (await sourceStore.list(recipient.id)).filter(
    (s) => s.address === from,
  );
  for (const s of sources) await refreshSource(recipient.id, s.id);
}

/** §8 step 5. Turns a pending share into a friend in the reader. If you
 *  were already reading their public feed, that row is upgraded to the
 *  key rather than duplicated. */
export async function acceptShare(user: User, pendingId: string): Promise<boolean> {
  const pending = await shareStore.getPending(user.id, pendingId);
  if (!pending) return false;

  const siteUrl = urlForAddress(pending.fromAddress);
  const sources = await sourceStore.list(user.id);
  const existing = sources.find(
    (s) =>
      s.address === pending.fromAddress ||
      (s.siteUrl && normalizeAddress(s.siteUrl) === pending.fromAddress),
  );

  let sourceId: string;
  if (existing) {
    await sourceStore.update(user.id, existing.id, {
      feedUrl: pending.keyUrl,
      address: pending.fromAddress,
      etag: undefined,
      lastModified: undefined,
    });
    // The old rows came from the public feed; the key feed is a superset
    // with different guids for friends-only items. Start clean.
    await feedEntryStore.deleteBySource(user.id, existing.id);
    sourceId = existing.id;
  } else {
    const source = await sourceStore.add(user.id, {
      name: pending.fromName,
      feedUrl: pending.keyUrl,
      siteUrl,
    });
    await sourceStore.update(user.id, source.id, { address: pending.fromAddress });
    sourceId = source.id;
  }

  await shareStore.deletePending(user.id, pending.id);
  try {
    await refreshSource(user.id, sourceId);
  } catch (err) {
    console.warn(`[acceptShare] first refresh failed for ${sourceId}`, err);
  }
  return true;
}

export async function ignoreShare(user: User, pendingId: string): Promise<boolean> {
  return shareStore.deletePending(user.id, pendingId);
}
