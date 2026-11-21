// POST /api/v1/sharing — share with an address (PROTOCOL.md §8 steps 1–3).
//
// 201 when this makes a new key. 200 when you already share with them: the
// same key is rung again (PROTOCOL.md §6 — one friend, one key), which is
// how "send it again" works if they ignored it by mistake.

import { revalidatePath } from "next/cache";
import { shareStore } from "@/lib/share-store";
import { shareWith } from "@/lib/sharing";
import { normalizeAddress } from "@/lib/protocol";
import { sharingView } from "@/lib/api-v1-views";
import { invalid, ok, readJsonObject, requireUser, v1 } from "@/lib/api-v1";

export const POST = v1(async (request: Request) => {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  if (typeof body.address !== "string" || !body.address.trim()) {
    return invalid("address", "An address is required.");
  }

  const address = normalizeAddress(body.address);
  const already = address
    ? (await shareStore.liveKeys(auth.user.id)).some((k) => k.friendAddress === address)
    : false;

  const result = await shareWith(auth.user, body.address);
  if (!result.ok) return invalid("address", result.error);
  revalidatePath("/reader/friends");
  return ok({ ...sharingView(result.key), rung: result.rung }, already ? 200 : 201);
});
