// GET {site}/feed/{token}/media/{ref} — a photo or audio file, through a
// key (PROTOCOL.md §5, `lib/key-media.ts`). Dies with the key.

import { userStore } from "@/lib/user-store";
import { shareStore } from "@/lib/share-store";
import { mediaStore } from "@/lib/media-store";
import { resolveMediaRef } from "@/lib/key-media";

type Props = {
  params: Promise<{ handle: string; token: string; ref: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const { handle, token, ref } = await params;
  const owner = await userStore.getByHandle(handle);
  if (!owner) return new Response("not found", { status: 404 });

  const key = await shareStore.getKey(owner.id, token);
  if (!key) return new Response("not found", { status: 404 });
  if (key.revokedAt) return new Response("gone", { status: 410 });

  const mediaKey = await resolveMediaRef(owner, token, ref);
  if (!mediaKey) return new Response("not found", { status: 404 });
  if (!mediaStore) return new Response("media disabled", { status: 503 });

  const res = await mediaStore.getImage(mediaKey);
  if (!res.ok) return res;
  // The upstream response is cacheable forever; this one must not outlive
  // the key in any shared cache.
  const headers = new Headers(res.headers);
  headers.set("cache-control", "private, max-age=3600");
  return new Response(res.body, { status: res.status, headers });
}
