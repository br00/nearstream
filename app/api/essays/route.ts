import { revalidatePath } from "next/cache";
import { essayStore } from "@/lib/essay-store";
import { slugify } from "@/schemas/essay";
import { getSession } from "@/lib/auth";
import { userStore } from "@/lib/user-store";

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

  if (isJson) {
    const json = await request.json();
    title = json?.title;
    body = json?.body;
  } else {
    const form = await request.formData();
    title = form.get("title");
    body = form.get("body");
  }

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

  const essay = await essayStore.add(session.userId, {
    title: trimmedTitle,
    body: body.trim(),
  });

  const user = await userStore.getById(session.userId);
  const handle = user?.handle ?? "";
  revalidatePath(`/${handle}`);
  revalidatePath(`/${handle}/library`);
  revalidatePath(`/${handle}/library/${essay.slug}`);
  revalidatePath(`/${handle}/rss.xml`);

  if (isJson) {
    return Response.json({ essay }, { status: 201 });
  }

  return Response.redirect(
    new URL(`/${handle}/library/${essay.slug}`, request.url),
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
