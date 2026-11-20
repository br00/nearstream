// POST {site}/doorbell — the only door between servers (PROTOCOL.md §6).
//
// It rings; it holds no content. Always answers 202, whatever happened,
// so it can't be used to learn who exists or what was accepted. The work
// runs after the response, so a slow sender never holds the connection.

import { after } from "next/server";
import { userStore } from "@/lib/user-store";
import { receiveNew, receiveShare } from "@/lib/sharing";
import { normalizeAddress } from "@/lib/protocol";

type Props = { params: Promise<{ handle: string }> };

const MAX_BODY_BYTES = 4_096;

// Rings from the same sender more often than this are ignored. Per process,
// so best-effort on serverless — the point is to blunt a flood, not to
// count precisely. The lab sets it to 0 so the end-to-end test needn't wait.
const MIN_INTERVAL_MS = Number(process.env.NEARSTREAM_DOORBELL_MIN_INTERVAL_MS ?? 60_000);
const lastRing = new Map<string, number>();

function tooSoon(key: string): boolean {
  const now = Date.now();
  const last = lastRing.get(key);
  if (last !== undefined && now - last < MIN_INTERVAL_MS) return true;
  lastRing.set(key, now);
  if (lastRing.size > 10_000) lastRing.clear();
  return false;
}

const accepted = () => new Response(null, { status: 202 });

export async function POST(request: Request, { params }: Props) {
  const { handle } = await params;

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return accepted();
  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return accepted();
    body = parsed as Record<string, unknown>;
  } catch {
    return accepted();
  }

  const from = typeof body.from === "string" ? normalizeAddress(body.from) : null;
  if (!from) return accepted();
  if (tooSoon(`${handle}|${from}|${String(body.ring)}`)) return accepted();

  const recipient = await userStore.getByHandle(handle);
  if (!recipient) return accepted();

  // Unknown ring types are ignored (§11 must-ignore).
  const logFailure = (err: unknown) =>
    console.warn(`[doorbell] ${String(body.ring)} from ${from} failed`, err);
  if (body.ring === "share") {
    after(() => receiveShare(recipient, from, body.key).catch(logFailure));
  } else if (body.ring === "new") {
    after(() => receiveNew(recipient, from).catch(logFailure));
  }
  return accepted();
}
