import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { inventoryStore } from "@/lib/inventory-store";
import { PageShell } from "@/app/_components/page-shell";
import { Kicker } from "@/app/_components/kicker";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleString("en", { month: "long" });
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const item = await inventoryStore.getBySlug(slug);
  if (!item) return { title: "Not found · Nearstream" };
  return {
    title: `${item.title} · Nearstream`,
  };
}

export default async function InventoryItemPage({ params }: Props) {
  const { slug } = await params;
  const item = await inventoryStore.getBySlug(slug);
  if (!item) notFound();

  const html = item.description
    ? await marked.parse(item.description, { async: true })
    : null;

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  const meta: { label: string; value: string }[] = [];
  if (item.dimensions) meta.push({ label: "Dimensions", value: item.dimensions });
  if (item.materials) meta.push({ label: "Materials", value: item.materials });
  if (item.edition) meta.push({ label: "Edition", value: item.edition });
  if (item.status) meta.push({ label: "Status", value: item.status });
  if (item.price) meta.push({ label: "Price", value: item.price });

  return (
    <PageShell
      rightNav={
        <Link href="/library/inventory" className={navLinkClasses}>
          ← Inventory
        </Link>
      }
    >
      <section className="flex flex-1 justify-center px-6">
        <article className="w-full max-w-2xl py-12">
          <Kicker>Library / Inventory</Kicker>

          <div className="mt-6 border border-border bg-foreground/5">
            <img
              src={`/api/media/${item.image.key}`}
              alt={item.title}
              className="block w-full"
              {...(item.image.width && item.image.height
                ? { width: item.image.width, height: item.image.height }
                : {})}
            />
          </div>

          <h1 className="mt-8 text-3xl font-normal leading-tight tracking-tight text-foreground">
            {item.title}
          </h1>
          <time
            dateTime={item.publishedAt}
            className="mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.2em] text-muted tabular-nums"
          >
            {formatDate(item.publishedAt)}
          </time>

          {meta.length > 0 && (
            <dl className="mt-10 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 border-t border-border pt-6">
              {meta.map(({ label, value }) => (
                <div key={label} className="contents">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
                    {label}
                  </dt>
                  <dd className="text-sm text-foreground/90">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {html && (
            <div
              className="prose-essay mt-12 text-[15px] leading-relaxed text-foreground/90"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </article>
      </section>
    </PageShell>
  );
}
