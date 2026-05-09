import { revalidatePath } from "next/cache";
import { store } from "@/lib/store";
import { isDisciplineTag } from "@/schemas/stream";

export async function GET() {
  const entries = await store.list();
  return Response.json({ entries });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  let text: unknown;
  let tag: unknown;

  if (contentType.includes("application/json")) {
    const body = await request.json();
    text = body?.text;
    tag = body?.tag;
  } else {
    const form = await request.formData();
    text = form.get("text");
    tag = form.get("tag");
  }

  if (typeof text !== "string" || text.trim().length === 0) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }
  if (!isDisciplineTag(tag)) {
    return Response.json({ error: "invalid tag" }, { status: 400 });
  }

  const entry = await store.add({ text: text.trim(), tag });
  revalidatePath("/");

  if (contentType.includes("application/json")) {
    return Response.json({ entry }, { status: 201 });
  }

  return Response.redirect(new URL("/", request.url), 303);
}
