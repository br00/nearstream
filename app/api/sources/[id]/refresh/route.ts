import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { refreshSource } from "@/lib/feed-fetcher";
import { sourceStore } from "@/lib/source-store";
import { getSession } from "@/lib/auth";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Props) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const isJson = (request.headers.get("content-type") ?? "").includes(
    "application/json",
  );

  // Belt-and-braces: refreshSource captures its own errors onto the Source row,
  // but if anything OUTSIDE that flow throws (sourceStore.update itself
  // failing, an unexpected parse path, etc.), we want the user to see the
  // reason in /studio rather than a generic 500.
  let result;
  try {
    result = await refreshSource(session.userId, id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[refresh ${id}] unhandled error`, err);
    try {
      await sourceStore.update(session.userId, id, {
        lastFetchedAt: new Date().toISOString(),
        lastError: `unhandled: ${message}`,
      });
    } catch {
      // If we can't even persist the error, fall through — the response
      // below still surfaces it.
    }
    result = {
      status: "error" as const,
      sourceId: id,
      error: `unhandled: ${message}`,
    };
  }

  revalidatePath("/studio");
  revalidatePath("/reader");

  if (isJson) {
    const status = result.status === "error" ? 502 : 200;
    return Response.json(result, { status });
  }

  redirect("/studio#sources");
}
