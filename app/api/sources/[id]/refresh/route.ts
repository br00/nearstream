import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { refreshSource } from "@/lib/feed-fetcher";
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
  const result = await refreshSource(id);

  revalidatePath("/studio");
  revalidatePath("/reader");

  const isJson = (request.headers.get("content-type") ?? "").includes(
    "application/json",
  );
  if (isJson) {
    const status = result.status === "error" ? 502 : 200;
    return Response.json(result, { status });
  }

  redirect("/studio#sources");
}
