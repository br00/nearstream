import { revalidatePath } from "next/cache";
import { letterStore } from "@/lib/letter-store";
import { getSession } from "@/lib/auth";

const BODY_MAX = 2000;

export async function GET() {
  const letter = await letterStore.get();
  return Response.json({ letter });
}

export async function POST(request: Request) {
  const session = await getSession();
  const contentType = request.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!session) {
    return errorResponse(request, isJson, 401, "unauthorized");
  }

  let body: unknown;

  if (isJson) {
    const json = await request.json();
    body = json?.body;
  } else {
    const form = await request.formData();
    body = form.get("body");
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

  const letter = await letterStore.set({ body: body.trim() });
  revalidatePath("/");

  if (isJson) {
    return Response.json({ letter }, { status: 200 });
  }
  return Response.redirect(new URL("/studio", request.url), 303);
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
  url.searchParams.set("letter-error", message);
  url.hash = "letter-form";
  return Response.redirect(url, 303);
}
