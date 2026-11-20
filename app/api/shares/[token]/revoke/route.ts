// POST /api/shares/{token}/revoke — stop sharing with one friend
// (PROTOCOL.md §8 step 9). Their key answers 410 from now on.

import { revoke } from "@/lib/sharing";
import { currentUser, reply, unauthorized } from "@/lib/shares-api";

type Props = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Props) {
  const user = await currentUser();
  if (!user) return unauthorized(request);
  const { token } = await params;
  const key = await revoke(user, token);
  if (!key) return reply(request, 404, { error: "No such key." });
  return reply(request, 200, { revoked: true }, { key: "share", value: "revoked" });
}
