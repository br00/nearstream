import { revalidatePath } from "next/cache";
import { store } from "@/lib/store";
import {
  isModeTag,
  isLibraryLinkType,
  type LibraryLink,
} from "@/schemas/stream";
import { getSession } from "@/lib/auth";
import { userStore } from "@/lib/user-store";
import { tenantBase } from "@/lib/tenant-domains";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const entries = await store.list(session.userId);
  return Response.json({ entries });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  let text: unknown;
  let tag: unknown;
  let rawLink: unknown;

  if (contentType.includes("application/json")) {
    const body = await request.json();
    text = body?.text;
    tag = body?.tag;
    rawLink = body?.link;
  } else {
    const form = await request.formData();
    text = form.get("text");
    tag = form.get("tag");
    rawLink = form.get("link");
  }

  if (typeof text !== "string" || text.trim().length === 0) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }
  if (!isModeTag(tag)) {
    return Response.json({ error: "invalid mode" }, { status: 400 });
  }

  const link = parseLink(rawLink);
  if (typeof link === "string") {
    return Response.json({ error: link }, { status: 400 });
  }

  const entry = await store.add(session.userId, {
    text: text.trim(),
    tag,
    link,
  });

  const user = await userStore.getById(session.userId);
  const handle = user?.handle ?? "";
  revalidatePath(`/${handle}`);
  revalidatePath(`/${handle}/stream`);
  revalidatePath(`/${handle}/rss.xml`);

  if (contentType.includes("application/json")) {
    return Response.json({ entry }, { status: 201 });
  }

  return Response.redirect(new URL(tenantBase(handle), request.url), 303);
}

// Accepts either a structured object (JSON) or a "type::slug" string (form).
// Returns the parsed LibraryLink, undefined for no link, or an error message string.
function parseLink(value: unknown): LibraryLink | undefined | string {
  if (value === undefined || value === null || value === "") return undefined;

  if (typeof value === "string") {
    const parts = value.split("::");
    if (parts.length !== 2) return "invalid link format";
    const [type, slug] = parts;
    if (!isLibraryLinkType(type)) return "invalid link type";
    if (slug.length === 0) return "invalid link slug";
    return { type, slug };
  }

  if (typeof value === "object") {
    const { type, slug } = value as Record<string, unknown>;
    if (!isLibraryLinkType(type)) return "invalid link type";
    if (typeof slug !== "string" || slug.length === 0) {
      return "invalid link slug";
    }
    return { type, slug };
  }

  return "invalid link";
}
