import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sourceStore } from "@/lib/source-store";
import { feedEntryStore } from "@/lib/feed-entry-store";
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

  // Cascade: remove cached feed entries first, then the Source row. Reverse
  // order would leave orphan entries if a later step failed.
  try {
    await feedEntryStore.deleteBySource(session.userId, id);
  } catch (err) {
    console.error(`[delete source ${id}] entry cascade failed`, err);
    // Surface no error to the caller — orphan entries are cheap; an
    // undeletable Source row is the worse UX.
  }
  await sourceStore.delete(session.userId, id);

  revalidatePath("/studio");
  revalidatePath("/reader");

  redirect("/studio#sources");
}
