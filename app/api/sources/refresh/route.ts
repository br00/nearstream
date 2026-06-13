import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { refreshAllSources } from "@/lib/feed-fetcher";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const results = await refreshAllSources(session.userId);

  revalidatePath("/reader");
  revalidatePath("/reader/friends");

  const isJson = (request.headers.get("content-type") ?? "").includes(
    "application/json",
  );
  if (isJson) {
    return Response.json({ results });
  }

  // Land on whichever page the user clicked Refresh from (reader feed or
  // /reader/friends). Default to /reader if no referer.
  redirect(refererPath(request) ?? "/reader");
}

function refererPath(req: Request): string | undefined {
  const ref = req.headers.get("referer");
  if (!ref) return undefined;
  try {
    const u = new URL(ref);
    if (u.pathname === "/reader/friends" || u.pathname === "/reader") {
      return u.pathname;
    }
  } catch {
    // ignore malformed referer
  }
  return undefined;
}
