import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { essayStore } from "@/lib/essay-store";
import { deleteEssayImages } from "@/lib/essay-images";
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
  const essay = await essayStore.getBySlug(session.userId, slug);
  const deleted = await essayStore.deleteBySlug(session.userId, slug);
  // Its own images go with it; a pasted Picture URL is not in `images`,
  // so the Picture keeps its image (lib/essay-images.ts).
  if (deleted && essay?.images?.length) {
    after(() => deleteEssayImages(essay.images ?? []));
  }

  const user = await userStore.getById(session.userId);
  const handle = user?.handle ?? "";
  revalidatePath(`/${handle}/library`);
  revalidatePath(`/${handle}/library/${slug}`);
  revalidatePath(`/${handle}/rss.xml`);

  redirect(`${tenantBase(handle)}/library`);
}
