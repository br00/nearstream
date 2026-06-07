import Link from "next/link";
import { notFound } from "next/navigation";
import { inventoryStore } from "@/lib/inventory-store";
import { userStore } from "@/lib/user-store";
import { getSession } from "@/lib/auth";
import { PageShell } from "@/app/_components/page-shell";
import { Kicker } from "@/app/_components/kicker";
import { DeleteButton } from "@/app/_components/delete-button";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { handle } = await params;
  const user = await userStore.getByHandle(handle);
  return {
    title: user
      ? `Inventory · ${user.displayName || handle}`
      : "Inventory · Nearstream",
  };
}

export default async function InventoryArchivePage({ params }: Props) {
  const { handle } = await params;
  const user = await userStore.getByHandle(handle);
  if (!user) notFound();

  const [items, session] = await Promise.all([
    inventoryStore.list(user.id),
    getSession(),
  ]);
  const isOwner = session?.userId === user.id;

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      rightNav={
        <>
          <Link href={`/${handle}/library`} className={navLinkClasses}>
            ← Library
          </Link>
          {isOwner && (
            <Link href="/studio" className={navLinkClasses}>
              Studio →
            </Link>
          )}
        </>
      }
    >
      <section className="flex flex-1 justify-center px-6">
        <div className="w-full max-w-3xl py-12">
          <Kicker>Library / Inventory</Kicker>
          <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
            {user.displayName || handle}
          </h1>

          {items.length === 0 ? (
            <p className="mt-12 text-sm leading-relaxed text-muted">
              No items yet.
              {isOwner && (
                <>
                  {" "}Post one from the{" "}
                  <Link
                    href="/studio"
                    className="text-foreground underline-offset-4 hover:underline"
                  >
                    studio
                  </Link>
                  .
                </>
              )}
            </p>
          ) : (
            <ul className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-3">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/${handle}/library/inventory/${item.slug}`}
                    className="group block"
                  >
                    <div className="aspect-square w-full overflow-hidden border border-border bg-foreground/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/media/${item.image.thumbKey ?? item.image.key}`}
                        alt={item.title}
                        className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
                        loading="lazy"
                      />
                    </div>
                    <h2 className="mt-3 text-sm font-normal tracking-tight text-foreground/90 transition-colors group-hover:text-foreground">
                      {item.title}
                    </h2>
                    {item.status && (
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
                        {item.status}
                      </p>
                    )}
                  </Link>
                  {isOwner && (
                    <div className="mt-2">
                      <DeleteButton
                        action={`/api/inventory/${item.slug}/delete`}
                        confirmMessage={`Delete "${item.title}"? This removes both the metadata and the image files. Permanent.`}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </PageShell>
  );
}
