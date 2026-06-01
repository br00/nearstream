import { revalidatePath } from "next/cache";
import { essayStore } from "@/lib/essay-store";
import { slugify } from "@/schemas/essay";
import { getSession } from "@/lib/auth";

const TITLE_MAX = 200;
const BODY_MAX = 50_000;

export async function GET() {
  const essays = await essayStore.list();
  return Response.json({ essays });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  let title: unknown;
  let body: unknown;

  if (contentType.includes("application/json")) {
    const json = await request.json();
    title = json?.title;
    body = json?.body;
  } else {
    const form = await request.formData();
    title = form.get("title");
    body = form.get("body");
  }

  if (typeof title !== "string" || title.trim().length === 0) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }
  if (title.length > TITLE_MAX) {
    return Response.json(
      { error: `title must be ${TITLE_MAX} chars or fewer` },
      { status: 400 },
    );
  }
  if (typeof body !== "string" || body.trim().length === 0) {
    return Response.json({ error: "body is required" }, { status: 400 });
  }
  if (body.length > BODY_MAX) {
    return Response.json(
      { error: `body must be ${BODY_MAX} chars or fewer` },
      { status: 400 },
    );
  }

  const trimmedTitle = title.trim();
  const slug = slugify(trimmedTitle);
  if (slug.length === 0) {
    return Response.json(
      { error: "title must contain at least one letter or number" },
      { status: 400 },
    );
  }
  const existing = await essayStore.getBySlug(slug);
  if (existing) {
    return Response.json(
      { error: `an essay with the slug "${slug}" already exists — pick a different title` },
      { status: 409 },
    );
  }

  const essay = await essayStore.add({
    title: trimmedTitle,
    body: body.trim(),
  });
  revalidatePath("/library");
  revalidatePath(`/library/${essay.slug}`);

  if (contentType.includes("application/json")) {
    return Response.json({ essay }, { status: 201 });
  }

  return Response.redirect(new URL(`/library/${essay.slug}`, request.url), 303);
}
