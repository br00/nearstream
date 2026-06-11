import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { essayStore } from "@/lib/essay-store";
import { userStore } from "@/lib/user-store";
import { getSession } from "@/lib/auth";
import { tenantBase } from "@/lib/tenant-domains";
import { visibilityOf } from "@/schemas/visibility";
import { PageShell } from "@/app/_components/page-shell";
import { Kicker } from "@/app/_components/kicker";
import { DeleteButton } from "@/app/_components/delete-button";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ handle: string; slug: string }>;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleString("en", { month: "long" });
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

export async function generateMetadata({ params }: Props) {
  const { handle, slug } = await params;
  const user = await userStore.getByHandle(handle);
  if (!user) return { title: "Not found · Nearstream" };
  const essay = await essayStore.getBySlug(user.id, slug);
  if (!essay) return { title: "Not found · Nearstream" };
  return {
    title: `${essay.title} · ${user.displayName || handle}`,
    robots: { index: false, follow: false },
  };
}

export default async function EssayPage({ params }: Props) {
  const { handle, slug } = await params;
  const user = await userStore.getByHandle(handle);
  if (!user) notFound();

  const [essay, session] = await Promise.all([
    essayStore.getBySlug(user.id, slug),
    getSession(),
  ]);
  if (!essay) notFound();
  const isOwner = session?.userId === user.id;
  // Private essays 404 for non-owners — don't even leak that the slug exists.
  if (visibilityOf(essay) === "private" && !isOwner) notFound();

  const html = await marked.parse(essay.body, { async: true });

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      rightNav={
        <>
          <Link
            href={`${tenantBase(handle)}/library`}
            className={navLinkClasses}
          >
            ← Library
          </Link>
          {isOwner && (
            <>
              <Link
                href={`/studio/essays/${essay.slug}/edit`}
                className={navLinkClasses}
              >
                Edit
              </Link>
              <DeleteButton
                action={`/api/essays/${essay.slug}/delete`}
                confirmMessage={`Delete essay "${essay.title}"? This is permanent.`}
              />
            </>
          )}
        </>
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
