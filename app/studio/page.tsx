import Link from "next/link";
import { redirect } from "next/navigation";
import { DISCIPLINE_TAGS } from "@/schemas/stream";
import { getSession } from "@/lib/auth";
import { SubmitButton } from "@/app/_components/submit-button";
import { PageShell } from "@/app/_components/page-shell";
import { Input } from "@/app/_components/input";
import { Textarea } from "@/app/_components/textarea";
import { Kicker } from "@/app/_components/kicker";
import { TagRadio } from "@/app/_components/tag-chip";

export const metadata = {
  title: "Studio · Nearstream",
};

export default async function StudioPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const navLinkClasses =
    "font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground";

  return (
    <PageShell
      rightNav={
        <>
          <Link href="/" className={navLinkClasses}>
            ← Stream
          </Link>
          <Link href="/library" className={navLinkClasses}>
            Library
          </Link>
          <form action="/auth/logout" method="POST">
            <button type="submit" className={navLinkClasses}>
              Sign out
            </button>
          </form>
        </>
      }
    >
      <section className="flex flex-1 justify-center px-6">
        <div className="w-full max-w-lg py-12">
          <Kicker>Studio</Kicker>
          <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
            New entry
          </h1>

          <form action="/api/stream" method="POST" className="mt-10 flex flex-col gap-8">
            <label className="flex flex-col gap-2">
              <Kicker>Entry</Kicker>
              <Textarea
                name="text"
                required
                rows={5}
                placeholder="What are you doing right now?"
              />
            </label>

            <fieldset className="flex flex-col gap-3">
              <legend>
                <Kicker>Discipline</Kicker>
              </legend>
              <div className="flex flex-wrap gap-2">
                {DISCIPLINE_TAGS.map((tag, i) => (
                  <TagRadio
                    key={tag}
                    name="tag"
                    value={tag}
                    defaultChecked={i === 0}
                    required
                  >
                    {tag}
                  </TagRadio>
                ))}
              </div>
            </fieldset>

            <SubmitButton pendingLabel="Posting…" className="self-start">
              Post
            </SubmitButton>
          </form>

          <hr className="mt-20 border-border" />

          <h2 className="mt-20 text-2xl font-normal tracking-tight text-foreground">
            New essay
          </h2>
          <p className="mt-2 text-sm text-muted-soft">
            Markdown. Lands at <code className="font-mono">/library/[slug]</code>.
          </p>

          <form action="/api/essays" method="POST" className="mt-10 flex flex-col gap-8">
            <label className="flex flex-col gap-2">
              <Kicker>Title</Kicker>
              <Input
                name="title"
                required
                maxLength={200}
                placeholder="The shape of a quieter web"
              />
            </label>

            <label className="flex flex-col gap-2">
              <Kicker>Body</Kicker>
              <Textarea
                name="body"
                required
                rows={14}
                placeholder="## A heading&#10;&#10;Markdown body. Links, *italics*, **bold**, lists, code, blockquotes — all supported."
              />
            </label>

            <SubmitButton pendingLabel="Publishing…" className="self-start">
              Publish
            </SubmitButton>
          </form>
        </div>
      </section>
    </PageShell>
  );
}
