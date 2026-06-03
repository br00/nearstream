import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { store } from "@/lib/store";
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
  await store.delete(id);

  revalidatePath("/");
  revalidatePath("/rss.xml");

  redirect("/");
}
