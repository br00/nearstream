import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { essayStore } from "@/lib/essay-store";
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
  const essay = await essayStore.getBySlug(slug);
  if (!essay) return { title: "Not found · Nearstream" };
  return {
    title: `${essay.title} · Nearstream`,
  };
}

export default async function EssayPage({ params }: Props) {
  const { slug } = await params;
  const essay = await essayStore.getBySlug(slug);
  if (!essay) notFound();

  const html = await marked.parse(essay.body, { async: true });

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      rightNav={
        <Link href="/library" className={navLinkClasses}>
          ← Library
        </Link>
      }
    >
      <section className="flex flex-1 justify-center px-6">
        <article className="w-full max-w-xl py-12">
          <Kicker>Essay</Kicker>
          <h1 className="mt-2 text-3xl font-normal leading-tight tracking-tight text-foreground">
            {essay.title}
          </h1>
          <time
            dateTime={essay.publishedAt}
            className="mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.2em] text-muted tabular-nums"
          >
            {formatDate(essay.publishedAt)}
          </time>
          <div
            className="prose-essay mt-12 text-[15px] leading-relaxed text-foreground/90"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>
      </section>
    </PageShell>
  );
}
