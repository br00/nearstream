// Posting a Line from the app (docs/app/API.md §5) — the same write the
// web's POST /api/stream does, plus `clientId` idempotency so the app's
// offline outbox can retry without fear.
//
// The clientId → Line index lives at users/{userId}/line-clients/{clientId}
// (lib/json-collection.ts), so a retry costs one read rather than a scan of
// every Line. The index outlives a deleted Line on purpose: a late retry
// must not bring a deleted post back.

import { revalidatePath } from "next/cache";
import { jsonCollection } from "@/lib/json-collection";
import { store } from "@/lib/store";
import { announceNew } from "@/lib/sharing";
import type { ModeTag, StreamEntry } from "@/schemas/stream";
import type { Visibility } from "@/schemas/visibility";
import type { User } from "@/schemas/user";

type ClientIndexRow = { lineId: string; createdAt: string };
const clientIndex = jsonCollection<ClientIndexRow>("app-line-clients");
const indexPath = (userId: string, clientId: string) => `users/${userId}/line-clients/${clientId}`;

export function isClientIdShaped(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

export type PostResult =
  | { kind: "created"; entry: StreamEntry }
  | { kind: "existing"; entry: StreamEntry }
  | { kind: "deleted" };

// Two copies of the same retry arriving together share one write.
const inFlight = new Map<string, Promise<PostResult>>();

export function postLine(
  user: User,
  input: { clientId: string; text: string; tag: ModeTag; visibility: Visibility },
): Promise<PostResult> {
  const key = `${user.id}|${input.clientId}`;
  const running = inFlight.get(key);
  if (running) return running;
  const p = doPost(user, input).finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

async function doPost(
  user: User,
  input: { clientId: string; text: string; tag: ModeTag; visibility: Visibility },
): Promise<PostResult> {
  const path = indexPath(user.id, input.clientId);
  const seen = await clientIndex.get(path);
  if (seen) {
    const entry = await store.getById(user.id, seen.lineId);
    return entry ? { kind: "existing", entry } : { kind: "deleted" };
  }

  const entry = await store.add(user.id, {
    text: input.text,
    tag: input.tag,
    visibility: input.visibility,
    clientId: input.clientId,
  });
  await clientIndex.put(path, { lineId: entry.id, createdAt: entry.publishedAt });
  afterLineChange(user, entry);
  return { kind: "created", entry };
}

/** What the web routes do after a post or delete: ring friends (nothing
 *  to ring for a private Line — it's in no feed) and drop cached pages. */
export function afterLineChange(user: User, entry: StreamEntry): void {
  if (user.handle && (entry.visibility ?? "public") !== "private") announceNew(user);
  revalidatePath(`/${user.handle}`);
  revalidatePath(`/${user.handle}/stream`);
  revalidatePath(`/${user.handle}/rss.xml`);
}
