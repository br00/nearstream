// One-shot migration endpoint. Copies the host user's existing R2 content from
// the legacy flat layout (entries/, library/essays/, library/inventory/,
// site/letter.json, reader/sources/, reader/feed/) into the new per-tenant
// layout (users/{hostId}/...). Idempotent — checks for a marker key and exits
// early on second run. Auth-gated to the host user only.
//
// After running, the legacy keys remain in place (safety). You can clean them
// up manually after verifying everything reads correctly. R2 storage is cheap;
// no rush.

import { getSession, isHostEmail } from "@/lib/auth";
import { userStore } from "@/lib/user-store";
import { R2Client } from "@/lib/r2-client";

const MARKER_KEY = "migrations/v3-multi-tenant.complete";

const LEGACY_PREFIXES = [
  "entries/",
  "library/essays/",
  "library/inventory/",
  "reader/sources/",
  "reader/feed/",
];

const LEGACY_SINGLE_KEYS = ["site/letter.json"];

type R2Env = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

function getR2Env(): R2Env | null {
  const {
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET: bucket,
  } = process.env;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function parseListKeys(xml: string): string[] {
  const out: string[] = [];
  const re = /<Key>([^<]+)<\/Key>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  // Only the configured host email can run migrations.
  if (!isHostEmail(session.email)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const env = getR2Env();
  if (!env) {
    return Response.json(
      { error: "R2 env not configured" },
      { status: 500 },
    );
  }

  const hostUser = await userStore.getById(session.userId);
  if (!hostUser || !hostUser.handle) {
    return Response.json(
      { error: "host user has no handle (complete onboarding first)" },
      { status: 400 },
    );
  }

  const client = new R2Client({
    accessKeyId: env.accessKeyId,
    secretAccessKey: env.secretAccessKey,
  });
  const base = `https://${env.accountId}.r2.cloudflarestorage.com/${env.bucket}`;
  const userPrefix = `users/${hostUser.id}`;

  // Skip if marker exists — idempotent.
  const markerRes = await client.fetch(`${base}/${MARKER_KEY}`, {
    method: "HEAD",
  });
  if (markerRes.ok) {
    return Response.json({ status: "already-migrated" });
  }

  const summary: Record<string, number> = {};

  for (const prefix of LEGACY_PREFIXES) {
    const listUrl = `${base}/?list-type=2&prefix=${encodeURIComponent(prefix)}`;
    const listRes = await client.fetch(listUrl);
    if (!listRes.ok) {
      const text = await listRes.text();
      return Response.json(
        { error: `LIST ${prefix} failed: ${listRes.status} ${text}` },
        { status: 500 },
      );
    }
    const keys = parseListKeys(await listRes.text());
    let copied = 0;
    for (const key of keys) {
      const newKey = `${userPrefix}/${key}`;
      const ok = await copyObject(client, base, key, newKey);
      if (!ok) {
        return Response.json(
          { error: `copy failed for ${key} → ${newKey}` },
          { status: 500 },
        );
      }
      copied++;
    }
    summary[prefix] = copied;
  }

  for (const single of LEGACY_SINGLE_KEYS) {
    const ok = await copyObject(client, base, single, `${userPrefix}/${single}`);
    summary[single] = ok ? 1 : 0;
  }

  // Write the marker.
  const markerPut = await client.fetch(`${base}/${MARKER_KEY}`, {
    method: "PUT",
    body: JSON.stringify({
      completedAt: new Date().toISOString(),
      hostUserId: hostUser.id,
      summary,
    }),
    headers: { "content-type": "application/json" },
  });
  if (!markerPut.ok) {
    return Response.json(
      { error: "marker write failed", summary },
      { status: 500 },
    );
  }

  return Response.json({ status: "migrated", summary });
}

async function copyObject(
  client: R2Client,
  base: string,
  fromKey: string,
  toKey: string,
): Promise<boolean> {
  // R2 supports S3-style CopyObject via PUT with `x-amz-copy-source`. Fall
  // back to GET-then-PUT if Copy fails (some R2 configs differ).
  const copy = await client.fetch(`${base}/${toKey}`, {
    method: "PUT",
    headers: {
      "x-amz-copy-source": `/${base.split("/").pop()}/${fromKey}`,
    },
  });
  if (copy.ok) return true;

  // Fallback: download + reupload.
  const get = await client.fetch(`${base}/${fromKey}`);
  if (!get.ok) return false;
  const contentType =
    get.headers.get("content-type") ?? "application/octet-stream";
  const body = await get.arrayBuffer();
  const put = await client.fetch(`${base}/${toKey}`, {
    method: "PUT",
    body,
    headers: { "content-type": contentType },
  });
  return put.ok;
}
