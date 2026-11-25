import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { essayStore } from "@/lib/essay-store";
import {
  deleteEssayImages,
  settleEssayImages,
  verifyEssayImageTokens,
} from "@/lib/essay-images";
import { slugify } from "@/schemas/essay";
import { isVisibility, type Visibility } from "@/schemas/visibility";
import { getSession } from "@/lib/auth";
import { userStore } from "@/lib/user-store";
import { tenantBase } from "@/lib/tenant-domains";
import { announceNew } from "@/lib/sharing";

const TITLE_MAX = 200;
const BODY_MAX = 50_000;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const essays = await essayStore.list(session.userId);
  return Response.json({ essays });
}

export async function POST(request: Request) {
  const session = await getSession();
  const contentType = request.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!session) {
    return errorResponse(request, isJson, 401, "unauthorized");
  }

  let title: unknown;
  let body: unknown;
  let rawVisibility: unknown;
  let imageTokens: unknown[] = [];

  if (isJson) {
    const json = await request.json();
    title = json?.title;
    body = json?.body;
    rawVisibility = json?.visibility;
    if (Array.isArray(json?.imageTokens)) imageTokens = json.imageTokens;
  } else {
    const form = await request.formData();
    title = form.get("title");
    body = form.get("body");
    rawVisibility = form.get("visibility");
    imageTokens = form.getAll("imageTokens");
  }

  const visibility: Visibility = isVisibility(rawVisibility)
    ? rawVisibility
    : "public";

  if (typeof title !== "string" || title.trim().length === 0) {
    return errorResponse(request, isJson, 400, "title is required");
  }
  if (title.length > TITLE_MAX) {
    return errorResponse(
      request,
      isJson,
      400,
      `title must be ${TITLE_MAX} characters or fewer`,
    );
  }
  if (typeof body !== "string" || body.trim().length === 0) {
    return errorResponse(request, isJson, 400, "body is required");
  }
  if (body.length > BODY_MAX) {
    return errorResponse(
      request,
      isJson,
      400,
      `body must be ${BODY_MAX} characters or fewer`,
    );
  }

  const trimmedTitle = title.trim();
  const slug = slugify(trimmedTitle);
  if (slug.length === 0) {
    return errorResponse(
      request,
      isJson,
      400,
      "title must contain at least one letter or number",
    );
  }
  const existing = await essayStore.getBySlug(session.userId, slug);
  if (existing) {
    return errorResponse(
      request,
      isJson,
      409,
      `an essay with the slug "${slug}" already exists — pick a different title`,
    );
  }

  const trimmedBody = body.trim();
  // Images uploaded in the editor but taken out again before publishing
  // are deleted now rather than left in R2 with nothing pointing at them.
  const uploaded = await verifyEssayImageTokens(session.userId, imageTokens);
  const images = settleEssayImages([], uploaded, trimmedBody);

  const essay = await essayStore.add(session.userId, {
    title: trimmedTitle,
    body: trimmedBody,
    visibility,
    images: images.keep,
  });
  after(() => deleteEssayImages(images.drop));

  const user = await userStore.getById(session.userId);
  // Ring everyone you share with (PROTOCOL.md §6). Private posts are in
  // no feed, so there's nothing to announce.
  if (user?.handle && visibility !== "private") announceNew(user);
  const handle = user?.handle ?? "";
  revalidatePath(`/${handle}`);
  revalidatePath(`/${handle}/library`);
  revalidatePath(`/${handle}/library/${essay.slug}`);
  revalidatePath(`/${handle}/rss.xml`);

  if (isJson) {
    return Response.json({ essay }, { status: 201 });
  }

  return Response.redirect(
    new URL(`${tenantBase(handle)}/library/${essay.slug}`, request.url),
    303,
  );
}

function errorResponse(
  request: Request,
  isJson: boolean,
  status: number,
  message: string,
): Response {
  if (isJson) {
    return Response.json({ error: message }, { status });
  }
  const url = new URL("/studio", request.url);
  url.searchParams.set("essay-error", message);
  url.hash = "essay-form";
  return Response.redirect(url, 303);
}
