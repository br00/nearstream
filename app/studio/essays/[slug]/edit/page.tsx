import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { essayStore } from "@/lib/essay-store";
import { userStore } from "@/lib/user-store";
import { SubmitButton } from "@/app/_components/submit-button";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { Input } from "@/app/_components/input";
import { Textarea } from "@/app/_components/textarea";
import { Kicker } from "@/app/_components/kicker";

export const metadata = {
  title: "Edit essay · Studio",
};

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditEssay({ params, searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { slug } = await params;
  const { error } = await searchParams;

  const [essay, user] = await Promise.all([
    essayStore.getBySlug(session.userId, slug),
    userStore.getById(session.userId),
  ]);

  if (!essay) notFound();

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
            Essay
          </h1>
          <p className="mt-2 text-sm text-muted-soft">
            Edit the title and body. The URL slug{" "}
            <code className="font-mono">/{essay.slug}</code> stays the same so
            existing links keep working.
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
            action={`/api/essays/${slug}/update`}
            method="POST"
            className="mt-10 flex flex-col gap-8"
          >
            <label className="flex flex-col gap-2">
              <Kicker>Title</Kicker>
              <Input
                name="title"
                required
                maxLength={200}
                defaultValue={essay.title}
              />
            </label>

            <label className="flex flex-col gap-2">
              <Kicker>Body</Kicker>
              <Textarea
                name="body"
                required
                rows={14}
                defaultValue={essay.body}
              />
            </label>

            <div className="flex items-center gap-4">
              <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
              <Link
                href={`/${user?.handle ?? ""}/library/${slug}`}
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
