import Link from "next/link";
import { requestMagicLink } from "./actions";
import { SubmitButton } from "@/app/_components/submit-button";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { Input } from "@/app/_components/input";
import { Kicker } from "@/app/_components/kicker";

export const metadata = {
  title: "Sign in · Nearstream",
};

interface LoginPageProps {
  searchParams: Promise<{
    sent?: string;
    error?: string;
    next?: string;
    reason?: string;
  }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_email: "That doesn’t look like an email.",
  invalid_link: "That sign-in link is invalid or has expired. Request a new one.",
};

const REASON_MESSAGES: Record<string, string> = {
  "private-tenant":
    "That page is only visible to friends on this instance. Sign in — or request access below.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const sent = params.sent === "1";
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : undefined;
  const reasonMessage = params.reason ? REASON_MESSAGES[params.reason] : undefined;

  return (
    <PageShell leftNav={<NearstreamLockup size={24} className="text-foreground" />}>
      <section className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm py-12">
          <h1 className="text-2xl font-normal tracking-tight text-foreground">
            Sign in
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            A magic link will arrive in your inbox. The link expires in 15
            minutes.
          </p>

          {reasonMessage && !sent ? (
            <p className="mt-6 border-l-2 border-foreground/50 pl-4 text-sm leading-relaxed text-foreground">
              {reasonMessage}
            </p>
          ) : null}

          {sent ? (
            <>
              <p className="mt-10 text-sm leading-relaxed text-foreground">
                If that email is on the allowlist, a sign-in link is on its
                way.
              </p>
              <p className="mt-6 text-sm leading-relaxed text-muted">
                No invite yet?{" "}
                <Link
                  href="/request-access"
                  className="text-foreground underline underline-offset-4 decoration-muted-soft hover:decoration-foreground"
                >
                  Request access
                </Link>
                .
              </p>
            </>
          ) : (
            <form action={requestMagicLink} className="mt-10 flex flex-col gap-6">
              <label className="flex flex-col gap-2">
                <Kicker>Email</Kicker>
                <Input
                  type="email"
                  name="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>

              {errorMessage ? (
                <Kicker tone="default">{errorMessage}</Kicker>
              ) : null}

              <SubmitButton pendingLabel="Sending…" className="self-start">
                Send link
              </SubmitButton>

              <p className="mt-4 border-t border-border pt-6 text-sm leading-relaxed text-muted-soft">
                No invite yet?{" "}
                <Link
                  href="/request-access"
                  className="text-foreground underline underline-offset-4 decoration-muted-soft hover:decoration-foreground"
                >
                  Request access →
                </Link>
              </p>
            </form>
          )}
        </div>
      </section>
    </PageShell>
  );
}
