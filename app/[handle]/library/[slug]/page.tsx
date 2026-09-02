import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { marked } from "marked";
import { essayStore } from "@/lib/essay-store";
import { userStore } from "@/lib/user-store";
import { getSession } from "@/lib/auth";
import { checkTenantVisibility, resolveSitePrivacy } from "@/lib/tenant-visibility";
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

/**
 * A share preview is often the only thing a stranger ever sees of an essay,
 * so it gets the essay's own opening rather than the site's boilerplate.
 * Markdown syntax and the leading H1 are stripped, since a preview card
 * rendering a literal `#` reads as broken.
 */
function shareExcerpt(body: string, max = 200): string {
  const flat = body
    .replace(/^#.*$/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "));
  return lastStop > max * 0.5
    ? cut.slice(0, lastStop + 1)
    : cut.trimEnd() + "…";
}

export async function generateMetadata({ params }: Props) {
  const { handle, slug } = await params;
  const user = await userStore.getByHandle(handle);
  if (!user) return { title: "Not found · Nearstream" };
  const essay = await essayStore.getBySlug(user.id, slug);
  if (!essay) return { title: "Not found · Nearstream" };

  const displayName = user.displayName || handle;
  const title = `${essay.title} · ${displayName}`;
  const description =
    shareExcerpt(essay.body) || `An essay by ${displayName} on Nearstream.`;

  // Search indexing follows the tenant's own privacy setting rather than
  // being off everywhere. A `friends` or `private` site must never be
  // indexed; a site its owner has deliberately made public, and is linking
  // to from elsewhere, has no reason to be invisible to search. Individual
  // private essays are still excluded below.
  const indexable =
    resolveSitePrivacy(user) === "public" &&
    visibilityOf(essay) === "public";

  return {
    title,
    description,
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "Nearstream",
      publishedTime: essay.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
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
  const gate = checkTenantVisibility(user, session);
  if (!gate.allowed) {
    if (gate.reason === "sign-in") {
      redirect(`/login?next=${encodeURIComponent(`/${handle}/library/${slug}`)}&reason=private-tenant`);
    }
    notFound();
  }
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
