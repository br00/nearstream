import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { inventoryStore } from "@/lib/inventory-store";
import { userStore } from "@/lib/user-store";
import { getSession } from "@/lib/auth";
import { tenantBase } from "@/lib/tenant-domains";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function POST(_req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  await inventoryStore.deleteBySlug(session.userId, slug);

  const user = await userStore.getById(session.userId);
  const handle = user?.handle ?? "";
  revalidatePath(`/${handle}/library`);
  revalidatePath(`/${handle}/library/inventory`);
  revalidatePath(`/${handle}/library/inventory/${slug}`);
  revalidatePath(`/${handle}/rss.xml`);

  redirect(`${tenantBase(handle)}/library/inventory`);
}
