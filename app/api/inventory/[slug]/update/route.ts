import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { inventoryStore } from "@/lib/inventory-store";
import { userStore } from "@/lib/user-store";
import { getSession } from "@/lib/auth";
import { tenantBase } from "@/lib/tenant-domains";
import { isInventoryStatus } from "@/schemas/inventory";
import type { NewInventoryItem } from "@/schemas/inventory";

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 50_000;
const STRING_FIELD_MAX = 200;

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

  const fields: Record<string, string | undefined> = {};
  for (const [name, max] of [
    ["description", DESCRIPTION_MAX],
    ["dimensions", STRING_FIELD_MAX],
    ["materials", STRING_FIELD_MAX],
    ["edition", STRING_FIELD_MAX],
    ["price", STRING_FIELD_MAX],
  ] as const) {
    const raw = form.get(name);
    if (typeof raw !== "string") {
      fields[name] = undefined;
      continue;
    }
    if (raw.trim().length === 0) {
      fields[name] = undefined;
      continue;
    }
    if (raw.length > max) {
      return errorRedirect(
        request,
        slug,
        `${name} must be ${max} characters or fewer`,
      );
    }
    fields[name] = raw.trim();
  }

  let validatedStatus: NewInventoryItem["status"];
  const rawStatus = form.get("status");
  if (typeof rawStatus === "string" && rawStatus.length > 0) {
    if (!isInventoryStatus(rawStatus)) {
      return errorRedirect(
        request,
        slug,
        "status must be available, sold, or archived",
      );
    }
    validatedStatus = rawStatus;
  }

  try {
    const updated = await inventoryStore.updateBySlug(session.userId, slug, {
      title: title.trim(),
      description: fields.description,
      dimensions: fields.dimensions,
      materials: fields.materials,
      edition: fields.edition,
      status: validatedStatus,
      price: fields.price,
    });
    if (!updated) return errorRedirect(request, slug, "item not found");

    const user = await userStore.getById(session.userId);
    const handle = user?.handle ?? "";
    revalidatePath(`/${handle}`);
    revalidatePath(`/${handle}/library`);
    revalidatePath(`/${handle}/library/inventory`);
    revalidatePath(`/${handle}/library/inventory/${slug}`);
    revalidatePath(`/${handle}/rss.xml`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[POST /api/inventory/${slug}/update] failed`, err);
    return errorRedirect(request, slug, `Could not save — ${message}`);
  }

  const user = await userStore.getById(session.userId);
  const base = user?.handle ? tenantBase(user.handle) : "";
  redirect(`${base}/library/inventory/${slug}`);
}

function errorRedirect(
  request: Request,
  slug: string,
  message: string,
): Response {
  const url = new URL(`/studio/inventory/${slug}/edit`, request.url);
  url.searchParams.set("error", message);
  return Response.redirect(url, 303);
}
