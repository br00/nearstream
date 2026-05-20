import { requestMagicLink } from "./actions";
import { SubmitButton } from "@/app/_components/submit-button";

export const metadata = {
  title: "Sign in · Nearstream",
};

interface LoginPageProps {
  searchParams: Promise<{ sent?: string; error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_email: "That doesn’t look like an email.",
  invalid_link: "That sign-in link is invalid or has expired. Request a new one.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const sent = params.sent === "1";
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : undefined;

  return (
    <div className="mx-auto w-full max-w-md px-6 py-24">
      <header className="mb-10">
        <h1 className="font-mono text-sm uppercase tracking-widest text-zinc-500">
          Sign in
        </h1>
      </header>

      {sent ? (
        <p className="text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
          If that email is on the allowlist, a sign-in link is on its way. The
          link expires in 15 minutes.
        </p>
      ) : (
        <form action={requestMagicLink} className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-zinc-500">
              Email
            </span>
            <input
              type="email"
              name="email"
              required
              autoFocus
              autoComplete="email"
              placeholder="you@example.com"
              className="rounded-md border border-zinc-200 bg-white p-3 text-base text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          {errorMessage ? (
            <p className="font-mono text-xs uppercase tracking-widest text-red-600">
              {errorMessage}
            </p>
          ) : null}

          <SubmitButton
            pendingLabel="Sending…"
            className="self-start rounded-full bg-zinc-900 px-5 py-2 font-mono text-xs uppercase tracking-widest text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Send link
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
