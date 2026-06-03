import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { inventoryStore } from "@/lib/inventory-store";
import { getSession } from "@/lib/auth";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function POST(_req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  await inventoryStore.deleteBySlug(slug);

  revalidatePath("/library");
  revalidatePath("/library/inventory");
  revalidatePath(`/library/inventory/${slug}`);

  redirect("/library/inventory");
}
