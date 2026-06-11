import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { store } from "@/lib/store";
import { userStore } from "@/lib/user-store";
import { getSession } from "@/lib/auth";
import { tenantBase } from "@/lib/tenant-domains";
import {
  isDisciplineTag,
  isLibraryLinkType,
  type LibraryLink,
} from "@/schemas/stream";
import { isVisibility, type Visibility } from "@/schemas/visibility";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Props) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const form = await request.formData();
  const text = form.get("text");
  const tag = form.get("tag");
  const rawLink = form.get("link");
  const rawVisibility = form.get("visibility");

  if (typeof text !== "string" || text.trim().length === 0) {
    return errorRedirect(request, id, "text is required");
  }
  if (!isDisciplineTag(tag)) {
    return errorRedirect(request, id, "invalid tag");
  }

  const link = parseLink(rawLink);
  if (typeof link === "string") {
    return errorRedirect(request, id, link);
  }

  const visibility: Visibility = isVisibility(rawVisibility)
    ? rawVisibility
    : "public";

  try {
    const updated = await store.update(session.userId, id, {
      text: text.trim(),
      tag,
      link,
      visibility,
    });
    if (!updated) return errorRedirect(request, id, "entry not found");

    const user = await userStore.getById(session.userId);
    const handle = user?.handle ?? "";
    revalidatePath(`/${handle}`);
    revalidatePath(`/${handle}/stream`);
    revalidatePath(`/${handle}/rss.xml`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[POST /api/stream/${id}/update] failed`, err);
    return errorRedirect(request, id, `Could not save — ${message}`);
  }

  const user = await userStore.getById(session.userId);
  const base = user?.handle ? tenantBase(user.handle) : "";
  redirect(`${base}/stream#entry-${id}`);
}

function errorRedirect(request: Request, id: string, message: string): Response {
  const url = new URL(`/studio/stream/${id}/edit`, request.url);
  url.searchParams.set("error", message);
  return Response.redirect(url, 303);
}

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
  return "invalid link";
}
