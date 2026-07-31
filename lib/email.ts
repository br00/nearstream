// Transactional email — magic-link (returning sign-in), welcome (first
// approval after an access request), and daily digest (slice 38 — one
// summary email a day when friends actually posted). Shared HTML shell
// for magic-link + welcome; the digest gets its own template because
// its structure is a list of activity, not a single CTA. Table-based
// layout because Gmail / Outlook still don't render flex/grid
// reliably. All styles inlined for the same reason.

import type { Digest, DigestItem } from "@/lib/digest";
import { digestSubject, digestTextBody, formatAudioDuration } from "@/lib/digest";

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

/** Daily digest — a summary of what friends posted in the last window.
 *  The digest itself is built in lib/digest.ts; this function is only
 *  responsible for wrapping it in the shared visual identity and
 *  handing it to Resend. `readerUrl` is the recipient's own
 *  `/reader` link (absolute) so the primary CTA in the mail lands
 *  them right on the feed. */
export async function sendDigestEmail(
  to: string,
  digest: Digest,
  readerUrl: string,
): Promise<void> {
  await sendEmail({
    to,
    subject: digestSubject(digest),
    text: digestTextBody(digest, readerUrl),
    html: renderDigestEmail(digest, readerUrl),
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

function renderDigestEmail(digest: Digest, readerUrl: string): string {
  const safeReader = escapeHtml(readerUrl);
  const itemsHtml = digest.items.map(renderDigestItem).join("\n");
  const heading =
    digest.authorCount === 1
      ? `${escapeHtml(digest.items[0].authorName)} posted.`
      : `${digest.authorCount} friends posted.`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark only">
  <meta name="supported-color-schemes" content="dark only">
  <title>${escapeHtml(digestSubject(digest))}</title>
</head>
<body style="margin:0;padding:0;background:#000000;color:#e4e4e7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#000000;">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="max-width:520px;width:100%;">
          <tr>
            <td style="font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:3.5px;text-transform:uppercase;color:#71717a;padding-bottom:32px;">
              NEARSTREAM &middot; DAILY
            </td>
          </tr>
          <tr>
            <td style="font-size:22px;line-height:1.3;color:#e4e4e7;font-weight:400;padding-bottom:32px;letter-spacing:-0.01em;">
              ${heading}
            </td>
          </tr>
          ${itemsHtml}
          <tr>
            <td style="padding-top:24px;padding-bottom:32px;">
              <a href="${safeReader}" style="display:inline-block;padding:14px 24px;border:1px solid #27272a;color:#e4e4e7;font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:2.2px;text-transform:uppercase;text-decoration:none;">
                Open reader &rarr;
              </a>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #27272a;padding-top:24px;font-size:12px;line-height:1.6;color:#71717a;">
              You&rsquo;re getting this because a friend on your Nearstream instance posted today. Turn it off in <a href="${safeReader.replace(/\/reader\/?$/, "/settings")}#display" style="color:#a1a1aa;text-decoration:underline;">Settings</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderDigestItem(item: DigestItem): string {
  const author = escapeHtml(item.authorName);
  // Voice notes get a distinct "voice note" label + duration in the kicker,
  // both to disambiguate from plain notes and because "you have to click
  // through to hear it" is worth being explicit about.
  const typeLabel =
    item.type === "voice"
      ? item.audioDurationMs
        ? `voice note · ${formatAudioDuration(item.audioDurationMs)}`
        : "voice note"
      : item.type === "unknown"
        ? "post"
        : item.type;
  const safeUrl = escapeHtml(item.url);
  // Title takes precedence; else use the excerpt as the body line.
  const title = item.title ? escapeHtml(item.title) : "";
  const excerpt =
    item.excerpt && item.excerpt !== item.title
      ? escapeHtml(truncateForHtml(item.excerpt, 200))
      : "";
  // Thumbnail — only include for pictures. Sized 96x96 so mobile clients
  // render without blowing out the layout. Voice notes get a mono ▶ glyph
  // in the same slot so the row shape stays consistent.
  const thumb =
    item.type === "picture" && item.imageThumbUrl
      ? `<td width="96" valign="top" style="padding-right:16px;width:96px;">
          <a href="${safeUrl}" style="text-decoration:none;">
            <img src="${escapeHtml(item.imageThumbUrl)}" width="96" height="96" alt="" style="display:block;width:96px;height:96px;object-fit:cover;border:1px solid #27272a;">
          </a>
        </td>`
      : item.type === "voice"
        ? `<td width="96" valign="top" style="padding-right:16px;width:96px;">
          <a href="${safeUrl}" style="text-decoration:none;">
            <div style="display:block;width:96px;height:96px;border:1px solid #27272a;background:#0a0a0a;text-align:center;line-height:96px;color:#e4e4e7;font-size:36px;">&#9654;</div>
          </a>
        </td>`
        : "";
  return `<tr>
    <td style="padding-bottom:20px;border-bottom:1px solid #18181b;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          ${thumb}
          <td valign="top">
            <div style="font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:10px;letter-spacing:2.4px;text-transform:uppercase;color:#71717a;padding-bottom:6px;">
              ${author} &middot; ${escapeHtml(typeLabel)}
            </div>
            ${title ? `<div style="font-size:16px;line-height:1.35;color:#e4e4e7;padding-bottom:${excerpt ? "6px" : "10px"};"><a href="${safeUrl}" style="color:#e4e4e7;text-decoration:none;">${title}</a></div>` : ""}
            ${excerpt ? `<div style="font-size:14px;line-height:1.55;color:#a1a1aa;padding-bottom:10px;"><a href="${safeUrl}" style="color:#a1a1aa;text-decoration:none;">${excerpt}</a></div>` : ""}
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr><td style="height:20px;line-height:20px;">&nbsp;</td></tr>`;
}

function truncateForHtml(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}
