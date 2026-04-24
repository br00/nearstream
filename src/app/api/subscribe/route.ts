import { put, head, list } from "@vercel/blob";
import { NextResponse } from "next/server";

const BLOB_NAME = "subscribers.json";

interface Subscriber {
  email: string;
  timestamp: string;
}

async function getSubscribers(): Promise<Subscriber[]> {
  try {
    // Check if blob exists
    const { blobs } = await list({ prefix: BLOB_NAME });
    if (blobs.length === 0) return [];

    const response = await fetch(blobs[0].url);
    return await response.json();
  } catch {
    return [];
  }
}

async function saveSubscribers(subscribers: Subscriber[]) {
  await put(BLOB_NAME, JSON.stringify(subscribers, null, 2), {
    access: "public",
    addRandomSuffix: false,
  });
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const subscribers = await getSubscribers();

    // Check if already subscribed
    if (subscribers.some((s) => s.email === normalizedEmail)) {
      return NextResponse.json({ ok: true, message: "Already subscribed" });
    }

    subscribers.push({
      email: normalizedEmail,
      timestamp: new Date().toISOString(),
    });

    await saveSubscribers(subscribers);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
