// Transactional email — magic-link (returning sign-in) + welcome (first
// approval after an access request). Shared HTML shell keeps the visual
// identical; only the strings differ. Table-based layout because Gmail /
// Outlook still don't render flex/grid reliably. All styles inlined for
// the same reason.

const HOST_NAME = process.env.HOST_USER_NAME ?? "Alessandro";

// ─────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────

/** Standard magic-link email — used when a returning user requests a
 *  sign-in link from /login. */
export async function sendMagicLink(to: string, url: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Your Nearstream sign-in link",
    text: [
      "Sign in to Nearstream",
      "",
      "You requested a sign-in link. Click below to continue:",
      "",
      url,
      "",
      "The link expires in 15 minutes. If you didn't ask for it, ignore this email.",
    ].join("\n"),
    html: renderEmail({
      title: "Sign in to Nearstream",
      lead: "You requested a sign-in link. Click below to continue.",
      buttonLabel: "Sign in",
      url,
      footer:
        "The link expires in 15 minutes. If you didn&rsquo;t ask for it, you can ignore this email.",
    }),
  });
}

/** Welcome email — used when the host approves an access request. Same
 *  magic-link mechanics under the hood; different framing so the new
 *  friend knows they're being welcomed rather than getting a routine
 *  sign-in link. */
export async function sendWelcomeMagicLink(
  to: string,
  url: string,
): Promise<void> {
  const introLine = `${HOST_NAME} approved your request to join Nearstream. Welcome.`;
  await sendEmail({
    to,
    subject: `You're in — welcome to Nearstream`,
    text: [
      "Welcome to Nearstream",
      "",
      introLine,
      "",
      "Click below to sign in. Once you're in, you'll pick a handle for your site (yourhandle.nearstream.app style) and an animated mark. Takes 30 seconds.",
      "",
      url,
      "",
      "The link expires in 15 minutes. If it does, just head to nearstream.app/login with this email address — you're already on the allowlist.",
    ].join("\n"),
    html: renderEmail({
      title: "Welcome to Nearstream",
      lead: `${escapeHtml(introLine)} Click below to sign in — you&rsquo;ll pick a handle and an animated mark on the next screen. Takes about 30 seconds.`,
      buttonLabel: "Get started",
      url,
      footer:
        "The link expires in 15 minutes. If it does, just head to <a href=\"https://nearstream.app/login\" style=\"color:#a1a1aa;text-decoration:underline;\">nearstream.app/login</a> with this email address &mdash; you&rsquo;re on the allowlist.",
    }),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────────

async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (process.env.DEBUG_MAGIC_LINKS === "1") {
    console.log(`[nearstream] DEBUG email to ${params.to} · ${params.subject}`);
  }

  if (!apiKey || !from) {
    console.log(
      `[nearstream] email: dev mode (no RESEND_API_KEY/RESEND_FROM) — would send to ${params.to}:\n  subject: ${params.subject}\n  ${params.text.split("\n").find((l) => l.startsWith("http")) ?? ""}`,
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
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend rejected the request (${response.status}): ${detail}`);
  }
}

type TemplateProps = {
  title: string;
  lead: string;
  buttonLabel: string;
  url: string;
  /** HTML fragment allowed here so we can drop an anchor into the footer.
   *  Callers are responsible for escaping any variable content. */
  footer: string;
};

function renderEmail({ title, lead, buttonLabel, url, footer }: TemplateProps): string {
  const safeUrl = escapeHtml(url);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark only">
  <meta name="supported-color-schemes" content="dark only">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#000000;color:#e4e4e7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#000000;">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="480" style="max-width:480px;width:100%;">
          <tr>
            <td style="font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:3.5px;text-transform:uppercase;color:#71717a;padding-bottom:48px;">
              NEARSTREAM
            </td>
          </tr>
          <tr>
            <td style="font-size:22px;line-height:1.3;color:#e4e4e7;font-weight:400;padding-bottom:24px;letter-spacing:-0.01em;">
              ${escapeHtml(title)}
            </td>
          </tr>
          <tr>
            <td style="font-size:15px;line-height:1.65;color:#a1a1aa;padding-bottom:32px;">
              ${lead}
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;">
              <a href="${safeUrl}" style="display:inline-block;padding:14px 24px;border:1px solid #27272a;color:#e4e4e7;font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:2.2px;text-transform:uppercase;text-decoration:none;">
                ${escapeHtml(buttonLabel)} &rarr;
              </a>
            </td>
          </tr>
          <tr>
            <td style="font-size:13px;line-height:1.6;color:#71717a;padding-bottom:32px;">
              ${footer}
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #27272a;padding-top:24px;font-size:12px;line-height:1.6;color:#71717a;word-break:break-all;">
              If the button doesn&rsquo;t work, copy this URL into your browser:<br><br>
              <a href="${safeUrl}" style="color:#a1a1aa;text-decoration:underline;">${safeUrl}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
