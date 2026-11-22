// GET /api/v1/devices — the devices signed in to this account.

import { listDevices } from "@/lib/app-auth";
import { ok, requireUser, v1 } from "@/lib/api-v1";

export const GET = v1(async (request: Request) => {
  const auth = await requireUser(request, { needsHandle: false });
  if (auth instanceof Response) return auth;
  const rows = await listDevices(auth.user.id);
  return ok({
    devices: rows.map((d) => ({
      id: d.id,
      device: d.device,
      createdAt: d.createdAt,
      lastUsedAt: d.lastUsedAt,
      current: d.id === auth.device.deviceId,
    })),
  });
});
