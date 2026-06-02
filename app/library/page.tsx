import Link from "next/link";
import { essayStore } from "@/lib/essay-store";
import { inventoryStore } from "@/lib/inventory-store";
import { PageShell } from "@/app/_components/page-shell";
import { Kicker } from "@/app/_components/kicker";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Library · Nearstream",
};

type LibraryEntry =
  | {
      type: "essay";
      id: string;
      title: string;
      href: string;
      publishedAt: string;
    }
  | {
      type: "inventory";
      id: string;
      title: string;
      href: string;
      publishedAt: string;
      imageKey: string;
    };

function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleString("en", { month: "short" });
  const day = d.getDate();
  const year = d.getFullYear();
  const sameYear = year === new Date().getFullYear();
  return sameYear ? `${month} ${day}` : `${month} ${day}, ${year}`;
}

export default async function LibraryPage() {
  const [essays, items] = await Promise.all([
    essayStore.list(),
    inventoryStore.list(),
  ]);

  const entries: LibraryEntry[] = [
    ...essays.map(
      (e): LibraryEntry => ({
        type: "essay",
        id: e.id,
        title: e.title,
        href: `/library/${e.slug}`,
        publishedAt: e.publishedAt,
      }),
    ),
    ...items.map(
      (i): LibraryEntry => ({
        type: "inventory",
        id: i.id,
        title: i.title,
        href: `/library/inventory/${i.slug}`,
        publishedAt: i.publishedAt,
        imageKey: i.image.key,
      }),
    ),
  ].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      rightNav={
        <>
          <Link href="/" className={navLinkClasses}>
            ← Stream
          </Link>
          <Link href="/library/inventory" className={navLinkClasses}>
            Inventory
          </Link>
          <Link href="/studio" className={navLinkClasses}>
            Studio →
          </Link>
        </>
      }
    >
      <section className="flex flex-1 justify-center px-6">
        <div className="w-full max-w-lg py-12">
          <Kicker>Library</Kicker>
          <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
            All entries
          </h1>

          {entries.length === 0 ? (
            <p className="mt-12 text-sm leading-relaxed text-muted">
              No library entries yet. Post one from the{" "}
              <Link
                href="/studio"
                className="text-foreground underline-offset-4 hover:underline"
              >
                studio
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-12 space-y-8">
              {entries.map((entry) => (
                <li key={`${entry.type}-${entry.id}`}>
                  <Link href={entry.href} className="group flex items-start gap-4">
                    {entry.type === "inventory" ? (
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden border border-border bg-foreground/5">
                        <img
                          src={`/api/media/${entry.imageKey}`}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="h-16 w-16 flex-shrink-0 border border-border bg-foreground/5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <time
                          dateTime={entry.publishedAt}
                          className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted tabular-nums"
                        >
                          {formatDate(entry.publishedAt)}
                        </time>
                        <span className="inline-block border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                          {entry.type}
                        </span>
                      </div>
                      <h2 className="mt-2 text-base font-normal tracking-tight text-foreground/90 transition-colors group-hover:text-foreground">
                        {entry.title}
                      </h2>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </PageShell>
  );
}
