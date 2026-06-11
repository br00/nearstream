import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { store } from "@/lib/store";
import { userStore } from "@/lib/user-store";
import { getSession } from "@/lib/auth";
import { tenantBase } from "@/lib/tenant-domains";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await store.delete(session.userId, id);

  const user = await userStore.getById(session.userId);
  const handle = user?.handle ?? "";
  revalidatePath(`/${handle}`);
  revalidatePath(`/${handle}/stream`);
  revalidatePath(`/${handle}/rss.xml`);

  redirect(`${tenantBase(handle)}/stream`);
}
