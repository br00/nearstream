// Public form: someone landed here without an invite, wants in. They
// submit email + a sentence about themselves; the host reviews in
// /settings under Host tools. Approving adds them to the allowlist and
// sends a welcome magic-link.
//
// No auth on this page. Rate limiting is absent for now; add if the
// LinkedIn traffic turns hostile.

import { SubmitButton } from "@/app/_components/submit-button";
import { PageShell } from "@/app/_components/page-shell";
import { NearstreamLockup } from "@/app/_components/nearstream-mark";
import { Input } from "@/app/_components/input";
import { Textarea } from "@/app/_components/textarea";
import { Kicker } from "@/app/_components/kicker";
import { MESSAGE_MAX } from "@/schemas/access-request";

export const metadata = {
  title: "Request access · Nearstream",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ sent?: string; error?: string; email?: string }>;
};

export default async function RequestAccessPage({ searchParams }: Props) {
  const { sent, error, email: prefilledEmail } = await searchParams;
  const submitted = sent === "1";

  return (
    <PageShell
      leftNav={<NearstreamLockup size={24} className="text-foreground" />}
    >
      <section className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-md py-12">
          <Kicker>Request access</Kicker>
          <h1 className="mt-2 text-2xl font-normal tracking-tight text-foreground">
            Ask for an invite
          </h1>

          {submitted ? (
            <div className="mt-10 flex flex-col gap-4 text-sm leading-relaxed text-muted">
              <p>
                Thanks &mdash; your request is in the queue. If
                Alessandro thinks Nearstream is the right room for you,
                you&rsquo;ll get an email invite.
              </p>
              <p className="text-muted-soft">
                No email means it wasn&rsquo;t a fit this time. Nearstream is
                intentionally small.
              </p>
            </div>
          ) : (
            <>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Nearstream is invitation-only &mdash; a small closed group.
                Tell me who you are and I&rsquo;ll decide from there. No
                pressure either way.
              </p>

              <form
                action="/api/access-requests"
                method="POST"
                className="mt-10 flex flex-col gap-6"
              >
                <label className="flex flex-col gap-2">
                  <Kicker>Your email</Kicker>
                  <Input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    defaultValue={prefilledEmail ?? ""}
                    placeholder="you@example.com"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <Kicker>Who are you</Kicker>
                  <Textarea
                    name="message"
                    rows={5}
                    required
                    maxLength={MESSAGE_MAX}
                    placeholder="One or two sentences. How do we know each other, what draws you to this?"
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft">
                    {MESSAGE_MAX} chars max
                  </span>
                </label>

                {error ? (
                  <div
                    role="alert"
                    className="border-l-2 border-foreground/50 pl-4 py-2"
                  >
                    <Kicker>Could not send</Kicker>
                    <p className="mt-1 text-sm text-muted">{error}</p>
                  </div>
                ) : null}

                <SubmitButton pendingLabel="Sending…" className="self-start">
                  Send request
                </SubmitButton>
              </form>
            </>
          )}
        </div>
      </section>
    </PageShell>
  );
}
