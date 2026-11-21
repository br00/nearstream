// DELETE /api/v1/devices/{id} — sign a device out. On the current device
// this is "sign out here"; the token is dead from the next request.

import { revokeDevice } from "@/lib/app-auth";
import { noContent, notFound, requireUser, v1 } from "@/lib/api-v1";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = v1(async (request: Request, { params }: Ctx) => {
  const auth = await requireUser(request, { needsHandle: false });
  if (auth instanceof Response) return auth;
  const { id } = await params;
  if (!(await revokeDevice(auth.user.id, id))) return notFound("No such device.");
  return noContent();
});
