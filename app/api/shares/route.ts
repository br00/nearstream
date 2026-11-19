// GET  /api/shares — who you share with, and shares waiting for you.
// POST /api/shares — share with an address (PROTOCOL.md §8 steps 1–3).

import { shareStore } from "@/lib/share-store";
import { shareWith, keyUrlFor } from "@/lib/sharing";
import { currentUser, isJson, reply, unauthorized } from "@/lib/shares-api";

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized(request);
  const [keys, pending] = await Promise.all([
    shareStore.listKeys(user.id),
    shareStore.listPending(user.id),
  ]);
  return Response.json({
    keys: keys.map((k) => ({
      token: k.token,
      friendAddress: k.friendAddress,
      friendName: k.friendName,
      keyUrl: keyUrlFor(user, k.token),
      createdAt: k.createdAt,
      revokedAt: k.revokedAt ?? null,
    })),
    pending: pending.map((p) => ({
      id: p.id,
      fromAddress: p.fromAddress,
      fromName: p.fromName,
      receivedAt: p.receivedAt,
    })),
  });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized(request);

  let address: unknown;
  if (isJson(request)) address = (await request.json())?.address;
  else address = (await request.formData()).get("address");
  if (typeof address !== "string") {
    return reply(request, 400, { error: "An address is required." });
  }

  const result = await shareWith(user, address);
  if (!result.ok) return reply(request, 400, { error: result.error });
  return reply(
    request,
    201,
    {
      token: result.key.token,
      friendAddress: result.key.friendAddress,
      friendName: result.key.friendName,
      rung: result.rung,
    },
    { key: "share", value: "sent" },
  );
}
