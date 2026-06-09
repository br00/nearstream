import { revalidatePath } from "next/cache";
import { sourceStore } from "@/lib/source-store";
import { isValidFeedUrl } from "@/schemas/source";
import { getSession } from "@/lib/auth";

const NAME_MAX = 80;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const sources = await sourceStore.list(session.userId);
  return Response.json({ sources });
}

export async function POST(request: Request) {
  const session = await getSession();
  const contentType = request.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!session) {
    return errorResponse(request, isJson, 401, "unauthorized");
  }

  let name: unknown;
  let feedUrl: unknown;
  let siteUrl: unknown;

  if (isJson) {
    const json = await request.json();
    name = json?.name;
    feedUrl = json?.feedUrl;
    siteUrl = json?.siteUrl;
  } else {
    const form = await request.formData();
    name = form.get("name");
    feedUrl = form.get("feedUrl");
    siteUrl = form.get("siteUrl");
  }

  if (typeof name !== "string" || name.trim().length === 0) {
    return errorResponse(request, isJson, 400, "name is required");
  }
  if (name.length > NAME_MAX) {
    return errorResponse(
      request,
      isJson,
      400,
      `name must be ${NAME_MAX} characters or fewer`,
    );
  }
  if (typeof feedUrl !== "string" || feedUrl.trim().length === 0) {
    return errorResponse(request, isJson, 400, "feedUrl is required");
  }
  if (!isValidFeedUrl(feedUrl.trim())) {
    return errorResponse(
      request,
      isJson,
      400,
      "feedUrl must be an http(s) URL",
    );
  }

  const trimmedSiteUrl =
    typeof siteUrl === "string" && siteUrl.trim().length > 0
      ? siteUrl.trim()
      : undefined;
  if (trimmedSiteUrl && !isValidFeedUrl(trimmedSiteUrl)) {
    return errorResponse(
      request,
      isJson,
      400,
      "siteUrl must be an http(s) URL",
    );
  }

  let source;
  try {
    const existing = await sourceStore.list(session.userId);
    if (existing.some((s) => s.feedUrl === feedUrl.trim())) {
      return errorResponse(
        request,
        isJson,
        409,
        "that feed URL is already in your sources",
      );
    }

    source = await sourceStore.add(session.userId, {
      name: name.trim(),
      feedUrl: feedUrl.trim(),
      siteUrl: trimmedSiteUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[POST /api/sources] storage failed`, err);
    return errorResponse(
      request,
      isJson,
      502,
      `Could not save source — ${message}. Try again in a moment.`,
    );
  }

  revalidatePath("/studio");

  if (isJson) {
    return Response.json({ source }, { status: 201 });
  }

  const url = new URL("/studio", request.url);
  url.hash = "sources";
  return Response.redirect(url, 303);
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
  url.searchParams.set("source-error", message);
  url.hash = "sources";
  return Response.redirect(url, 303);
}
