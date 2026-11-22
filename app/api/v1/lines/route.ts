// GET  /api/v1/lines — your own Lines, newest first.
// POST /api/v1/lines — post one. Same `clientId` twice → the first Line, 200.

import { store } from "@/lib/store";
import { isClientIdShaped, postLine } from "@/lib/app-lines";
import { lineView } from "@/lib/api-v1-views";
import { apiError, invalid, ok, paginate, readJsonObject, requireUser, v1 } from "@/lib/api-v1";
import { isModeTag } from "@/schemas/stream";
import { isVisibility } from "@/schemas/visibility";

const MAX_TEXT = 5_000;

export const GET = v1(async (request: Request) => {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const entries = await store.list(auth.user.id);
  const page = paginate(new URL(request.url), entries, (e) => ({ t: e.publishedAt, id: e.id }));
  if (page instanceof Response) return page;
  return ok({ items: page.items.map(lineView), next: page.next });
});

export const POST = v1(async (request: Request) => {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const body = await readJsonObject(request);
  if (body instanceof Response) return body;

  const { clientId, text, tag, visibility = "public" } = body;
  if (!isClientIdShaped(clientId)) {
    return invalid("clientId", "clientId must be 1–64 characters of A–Z, a–z, 0–9, - or _.");
  }
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) return invalid("text", "text is required.");
  if (trimmed.length > MAX_TEXT) return invalid("text", `text is longer than ${MAX_TEXT} characters.`);
  if (!isModeTag(tag)) return invalid("tag", "tag must be making, taking in or being.");
  if (!isVisibility(visibility)) {
    return invalid("visibility", "visibility must be public, friends or private.");
  }

  const result = await postLine(auth.user, { clientId, text: trimmed, tag, visibility });
  if (result.kind === "deleted") {
    return apiError(409, "conflict", "The Line with this clientId was deleted.");
  }
  return ok(lineView(result.entry), result.kind === "created" ? 201 : 200);
});
