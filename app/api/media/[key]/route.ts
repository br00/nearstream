import { mediaStore } from "@/lib/media-store";

type Props = {
  params: Promise<{ key: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  if (!mediaStore) {
    return new Response("media disabled", { status: 503 });
  }
  const { key } = await params;
  return mediaStore.getImage(key);
}
