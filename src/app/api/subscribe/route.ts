import { put, head, BlobNotFoundError } from "@vercel/blob";
import { NextResponse } from "next/server";

const BLOB_NAME = "subscribers.json";

interface Subscriber {
  email: string;
  timestamp: string;
}

async function getSubscribers(): Promise<Subscriber[]> {
  let blob;
  try {
    blob = await head(BLOB_NAME);
  } catch (err) {
    if (err instanceof BlobNotFoundError) {
      return [];
    }
    throw err;
  }

  const response = await fetch(blob.url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `Failed to read ${BLOB_NAME}: ${response.status} ${response.statusText}`,
    );
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error(
      `Unexpected ${BLOB_NAME} shape: expected array, got ${typeof data}`,
    );
  }

  return data as Subscriber[];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body?.email;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const subscribers = await getSubscribers();

    if (subscribers.some((s) => s.email === normalizedEmail)) {
      return NextResponse.json({ ok: true, message: "Already subscribed" });
    }

    subscribers.push({
      email: normalizedEmail,
      timestamp: new Date().toISOString(),
    });

    await put(BLOB_NAME, JSON.stringify(subscribers, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
