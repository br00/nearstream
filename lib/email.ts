export async function sendMagicLink(to: string, url: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  // Always log the magic link to function logs when DEBUG_MAGIC_LINKS=1.
  // Resend's onboarding@resend.dev sandbox sender only delivers to the
  // account-owner's address; until a custom domain is verified in Resend,
  // testing with secondary emails requires fetching the link from logs.
  if (process.env.DEBUG_MAGIC_LINKS === "1") {
    console.log(`[nearstream] DEBUG magic link for ${to}: ${url}`);
  }

  if (!apiKey || !from) {
    console.log(
      `[nearstream] email: dev mode (no RESEND_API_KEY/RESEND_FROM) — magic link for ${to}:\n  ${url}`,
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Your Nearstream sign-in link",
      text: `Click to sign in to Nearstream:\n\n${url}\n\nThis link expires in 15 minutes. If you didn't ask for it, ignore this email.`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend rejected the request (${response.status}): ${detail}`);
  }
}
