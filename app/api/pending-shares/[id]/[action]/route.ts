// POST /api/pending-shares/{id}/accept | ignore — answer a share
// (PROTOCOL.md §8 step 5).

import { acceptShare, ignoreShare } from "@/lib/sharing";
import { currentUser, reply, unauthorized } from "@/lib/shares-api";

type Props = { params: Promise<{ id: string; action: string }> };

export async function POST(request: Request, { params }: Props) {
  const user = await currentUser();
  if (!user) return unauthorized(request);
  const { id, action } = await params;

  if (action === "accept") {
    const ok = await acceptShare(user, id);
    if (!ok) return reply(request, 404, { error: "That share is no longer waiting." });
    return reply(request, 200, { accepted: true }, { key: "share", value: "accepted" });
  }
  if (action === "ignore") {
    await ignoreShare(user, id);
    return reply(request, 200, { ignored: true }, { key: "share", value: "ignored" });
  }
  return reply(request, 404, { error: "Unknown action." });
}
