import { put, list } from "@vercel/blob";
import { NextResponse } from "next/server";

const BLOB_NAME = "subscribers.json";

interface Subscriber {
  email: string;
  timestamp: string;
}

async function getSubscribers(): Promise<{
  subscribers: Subscriber[];
  url: string | null;
}> {
  try {
    const { blobs } = await list({ prefix: BLOB_NAME });
    if (blobs.length === 0) return { subscribers: [], url: null };

    const response = await fetch(blobs[0].url, { cache: "no-store" });
    const subscribers = await response.json();
    return { subscribers, url: blobs[0].url };
  } catch {
    return { subscribers: [], url: null };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body?.email;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { subscribers } = await getSubscribers();

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
      contentType: "application/json",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
