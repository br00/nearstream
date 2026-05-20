export async function sendMagicLink(to: string, url: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

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
