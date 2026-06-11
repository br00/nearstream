import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { essayStore } from "@/lib/essay-store";
import { isVisibility, type Visibility } from "@/schemas/visibility";
import { userStore } from "@/lib/user-store";
import { getSession } from "@/lib/auth";
import { tenantBase } from "@/lib/tenant-domains";

const TITLE_MAX = 200;
const BODY_MAX = 50_000;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, { params }: Props) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const form = await request.formData();
  const title = form.get("title");
  const body = form.get("body");
  const rawVisibility = form.get("visibility");
  const visibility: Visibility = isVisibility(rawVisibility)
    ? rawVisibility
    : "public";

  if (typeof title !== "string" || title.trim().length === 0) {
    return errorRedirect(request, slug, "title is required");
  }
  if (title.length > TITLE_MAX) {
    return errorRedirect(
      request,
      slug,
      `title must be ${TITLE_MAX} characters or fewer`,
    );
  }
  if (typeof body !== "string" || body.trim().length === 0) {
    return errorRedirect(request, slug, "body is required");
  }
  if (body.length > BODY_MAX) {
    return errorRedirect(
      request,
      slug,
      `body must be ${BODY_MAX} characters or fewer`,
    );
  }

  try {
    const updated = await essayStore.updateBySlug(session.userId, slug, {
      title: title.trim(),
      body: body.trim(),
      visibility,
    });
    if (!updated) return errorRedirect(request, slug, "essay not found");

    const user = await userStore.getById(session.userId);
    const handle = user?.handle ?? "";
    revalidatePath(`/${handle}`);
    revalidatePath(`/${handle}/library`);
    revalidatePath(`/${handle}/library/${slug}`);
    revalidatePath(`/${handle}/rss.xml`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[POST /api/essays/${slug}/update] failed`, err);
    return errorRedirect(request, slug, `Could not save — ${message}`);
  }

  const user = await userStore.getById(session.userId);
  const base = user?.handle ? tenantBase(user.handle) : "";
  redirect(`${base}/library/${slug}`);
}

function errorRedirect(
  request: Request,
  slug: string,
  message: string,
): Response {
  const url = new URL(`/studio/essays/${slug}/edit`, request.url);
  url.searchParams.set("error", message);
  return Response.redirect(url, 303);
}
