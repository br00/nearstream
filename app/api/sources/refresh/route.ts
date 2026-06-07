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

  revalidatePath("/studio");
  revalidatePath("/reader");

  const isJson = (request.headers.get("content-type") ?? "").includes(
    "application/json",
  );
  if (isJson) {
    return Response.json({ results });
  }

  redirect("/studio#sources");
}
