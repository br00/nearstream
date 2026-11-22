// GET /api/v1/me — who this token belongs to. `handle` is null until
// onboarding is done on the web.

import { meView } from "@/lib/api-v1-views";
import { ok, requireUser, v1 } from "@/lib/api-v1";

export const GET = v1(async (request: Request) => {
  const auth = await requireUser(request, { needsHandle: false });
  if (auth instanceof Response) return auth;
  return ok(meView(auth.user));
});
