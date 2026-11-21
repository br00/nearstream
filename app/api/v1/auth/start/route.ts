// POST /api/v1/auth/start — email a sign-in link + code (docs/app/API.md §2).
//
// Always 202 for a well-formed request, allowlisted or not, and the
// allowlist check + email both run after the response, so neither the
// status nor the timing says whether an address has an account.

import { after } from "next/server";
import { isEmailAllowed, normalizeEmail } from "@/lib/auth";
import { createAuthCode, isChallengeShaped } from "@/lib/app-auth";
import { sendAppSignIn } from "@/lib/email";
import { instanceUrl } from "@/lib/protocol";
import { apiError, clientIp, invalid, ok, RateLimit, readJsonObject, v1 } from "@/lib/api-v1";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WINDOW_MS = 15 * 60 * 1000;
const perEmail = new RateLimit(5, WINDOW_MS);
const perIp = new RateLimit(20, WINDOW_MS);

export const POST = v1(async (request: Request) => {
  const body = await readJsonObject(request);
  if (body instanceof Response) return body;

  const { email: rawEmail, challenge, device: rawDevice } = body;
  if (typeof rawEmail !== "string" || rawEmail.length > 254 || !EMAIL_PATTERN.test(rawEmail.trim())) {
    return invalid("email", "That doesn't look like an email address.");
  }
  if (!isChallengeShaped(challenge)) {
    return invalid("challenge", "challenge must be base64url(sha256(verifier)).");
  }
  const device =
    typeof rawDevice === "string" && rawDevice.trim()
      ? rawDevice.trim().slice(0, 64)
      : "Unknown device";
  const email = normalizeEmail(rawEmail);

  const wait = Math.max(perIp.hit(clientIp(request)), perEmail.hit(email));
  if (wait > 0) {
    return apiError(429, "slow_down", "Too many sign-in requests.", { retryAfterSeconds: wait });
  }

  after(async () => {
    try {
      if (!(await isEmailAllowed(email))) return;
      const code = await createAuthCode(email, challenge, device);
      const server = new URL(instanceUrl()).host;
      const link = `nearstream://auth?server=${encodeURIComponent(server)}&code=${code}`;
      await sendAppSignIn(email, { link, code });
    } catch (err) {
      console.error("[api/v1] auth/start send failed:", err instanceof Error ? err.message : err);
    }
  });

  return ok({}, 202);
});
