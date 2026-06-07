import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sourceStore } from "@/lib/source-store";
import { getSession } from "@/lib/auth";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await sourceStore.delete(id);

  revalidatePath("/studio");

  redirect("/studio#sources");
}
