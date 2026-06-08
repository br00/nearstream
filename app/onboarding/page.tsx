import { redirect } from "next/navigation";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { SubmitButton } from "@/app/_components/submit-button";
import { Input } from "@/app/_components/input";
import { Kicker } from "@/app/_components/kicker";
import { getSession } from "@/lib/auth";
import { userStore } from "@/lib/user-store";

export const metadata = {
  title: "Welcome · Nearstream",
};

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function OnboardingPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await userStore.getById(session.userId);
  if (!user) redirect("/login");
  if (user.handle) redirect("/studio");

  const { error } = await searchParams;

  return (
    <PageShell
      leftNav={<NearstreamLockup size={24} className="text-foreground" />}
    >
      <section className="flex flex-1 justify-center px-6">
        <div className="w-full max-w-sm py-16">
          <Kicker>Welcome</Kicker>
          <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
            Pick your handle
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Your site will live at{" "}
            <code className="font-mono text-foreground">/your-handle</code>.
            Choose carefully &mdash; this is your address on the instance and
            can&rsquo;t be changed later.
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
            action="/api/onboarding"
            method="POST"
            className="mt-10 flex flex-col gap-8"
          >
            <label className="flex flex-col gap-2">
              <Kicker>Handle</Kicker>
              <Input
                name="handle"
                required
                autoFocus
                placeholder="gosia"
                pattern="[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
                minLength={2}
                maxLength={32}
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
                2–32 chars, lowercase letters / digits / hyphens.
              </span>
            </label>

            <label className="flex flex-col gap-2">
              <Kicker>Display name</Kicker>
              <Input
                name="displayName"
                required
                maxLength={80}
                placeholder="Gosia Tymczak"
              />
            </label>

            <SubmitButton pendingLabel="Saving…" className="self-start">
              Continue
            </SubmitButton>
          </form>
        </div>
      </section>
    </PageShell>
  );
}
