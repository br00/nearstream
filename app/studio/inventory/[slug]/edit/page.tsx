import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { inventoryStore } from "@/lib/inventory-store";
import { userStore } from "@/lib/user-store";
import { INVENTORY_STATUSES } from "@/schemas/inventory";
import { SubmitButton } from "@/app/_components/submit-button";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { Input } from "@/app/_components/input";
import { Textarea } from "@/app/_components/textarea";
import { Kicker } from "@/app/_components/kicker";
import { VisibilityRadio } from "@/app/_components/visibility-radio";
import { visibilityOf } from "@/schemas/visibility";

export const metadata = {
  title: "Edit inventory item · Studio",
};

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditInventoryItem({ params, searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { slug } = await params;
  const { error } = await searchParams;

  const [item, user] = await Promise.all([
    inventoryStore.getBySlug(session.userId, slug),
    userStore.getById(session.userId),
  ]);

  if (!item) notFound();

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      leftNav={<NearstreamLockup size={24} className="text-foreground" />}
      rightNav={
        <Link href="/studio" className={navLinkClasses}>
          ← Studio
        </Link>
      }
    >
      <section className="flex flex-1 justify-center px-6">
        <div className="w-full max-w-lg py-12">
          <Kicker>Edit</Kicker>
          <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
            Inventory item
          </h1>
          <p className="mt-2 text-sm text-muted-soft">
            Edit text fields. URL slug <code className="font-mono">/{item.slug}</code>
            {" "}stays the same; the image cannot be changed here (delete + repost
            to swap the photo).
          </p>

          {error && (
            <div
              role="alert"
              className="mt-8 border-l-2 border-foreground/50 pl-4 py-2"
            >
              <Kicker>Could not save</Kicker>
              <p className="mt-1 text-sm text-muted">{error}</p>
            </div>
          )}

          <form
            action={`/api/inventory/${slug}/update`}
            method="POST"
            className="mt-10 flex flex-col gap-8"
          >
            <label className="flex flex-col gap-2">
              <Kicker>Title</Kicker>
              <Input
                name="title"
                required
                maxLength={200}
                defaultValue={item.title}
              />
            </label>

            <label className="flex flex-col gap-2">
              <Kicker>Description (optional, markdown)</Kicker>
              <Textarea
                name="description"
                rows={6}
                defaultValue={item.description ?? ""}
              />
            </label>

            <label className="flex flex-col gap-2">
              <Kicker>Dimensions</Kicker>
              <Input
                name="dimensions"
                maxLength={200}
                defaultValue={item.dimensions ?? ""}
              />
            </label>

            <label className="flex flex-col gap-2">
              <Kicker>Materials</Kicker>
              <Input
                name="materials"
                maxLength={200}
                defaultValue={item.materials ?? ""}
              />
            </label>

            <label className="flex flex-col gap-2">
              <Kicker>Edition</Kicker>
              <Input
                name="edition"
                maxLength={200}
                defaultValue={item.edition ?? ""}
              />
            </label>

            <label className="flex flex-col gap-2">
              <Kicker>Status</Kicker>
              <select
                name="status"
                defaultValue={item.status ?? ""}
                className="border-b border-border bg-transparent px-0 py-2 font-sans text-sm text-foreground outline-none focus:border-foreground"
              >
                <option value="">— none —</option>
                {INVENTORY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <Kicker>Price</Kicker>
              <Input
                name="price"
                maxLength={200}
                defaultValue={item.price ?? ""}
              />
            </label>

            <VisibilityRadio defaultValue={visibilityOf(item)} />

            <div className="flex items-center gap-4">
              <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
              <Link
                href={`/${user?.handle ?? ""}/library/inventory/${slug}`}
                className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft transition-colors hover:text-foreground"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </section>
    </PageShell>
  );
}
