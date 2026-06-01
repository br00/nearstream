import Link from "next/link";
import { essayStore } from "@/lib/essay-store";
import { PageShell } from "@/app/_components/page-shell";
import { Kicker } from "@/app/_components/kicker";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Library · Nearstream",
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
  const essays = await essayStore.list();

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      rightNav={
        <>
          <Link href="/" className={navLinkClasses}>
            ← Stream
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
            Essays
          </h1>

          {essays.length === 0 ? (
            <p className="mt-12 text-sm leading-relaxed text-muted">
              No essays yet. Write one from the{" "}
              <Link
                href="/studio"
                className="text-foreground underline-offset-4 hover:underline"
              >
                studio
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-12 space-y-6">
              {essays.map((essay) => (
                <li key={essay.id}>
                  <Link
                    href={`/library/${essay.slug}`}
                    className="group block"
                  >
                    <time
                      dateTime={essay.publishedAt}
                      className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted tabular-nums"
                    >
                      {formatDate(essay.publishedAt)}
                    </time>
                    <h2 className="mt-1 text-lg font-normal tracking-tight text-foreground/90 transition-colors group-hover:text-foreground">
                      {essay.title}
                    </h2>
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
