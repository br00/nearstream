import { letterStore } from "@/lib/letter-store";
import { nowView, personView } from "@/lib/api-v1-views";
import { ok, requireUser, v1 } from "@/lib/api-v1";

export const GET = v1(async (request: Request) => {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const letter = await letterStore.get(auth.user.id);
  return ok({
    person: personView(auth.user),
    ...(letter ? { now: nowView(letter) } : {}),
  });
});
