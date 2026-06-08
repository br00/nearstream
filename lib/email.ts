// Magic-link email: plain-text fallback + an HTML version styled like the
// Nearstream chrome (pure mono palette, mono accents for kicker labels and
// the sign-in button). Table-based layout because Gmail / Outlook still don't
// render flex/grid reliably. All styles inlined for the same reason.

export async function sendMagicLink(to: string, url: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

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
      text: textBody(url),
      html: htmlBody(url),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend rejected the request (${response.status}): ${detail}`);
  }
}

function textBody(url: string): string {
  return [
    "Sign in to Nearstream",
    "",
    "You requested a sign-in link. Click below to continue:",
    "",
    url,
    "",
    "The link expires in 15 minutes. If you didn't ask for it, ignore this email.",
  ].join("\n");
}

function htmlBody(url: string): string {
  const safeUrl = escapeHtml(url);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark only">
  <meta name="supported-color-schemes" content="dark only">
  <title>Sign in to Nearstream</title>
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
              Sign in to Nearstream
            </td>
          </tr>
          <tr>
            <td style="font-size:15px;line-height:1.65;color:#a1a1aa;padding-bottom:32px;">
              You requested a sign-in link. Click below to continue.
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;">
              <a href="${safeUrl}" style="display:inline-block;padding:14px 24px;border:1px solid #27272a;color:#e4e4e7;font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:2.2px;text-transform:uppercase;text-decoration:none;">
                Sign in &rarr;
              </a>
            </td>
          </tr>
          <tr>
            <td style="font-size:13px;line-height:1.6;color:#71717a;padding-bottom:32px;">
              The link expires in 15 minutes. If you didn&rsquo;t ask for it, you can ignore this email.
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
