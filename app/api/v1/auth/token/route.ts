// POST /api/v1/auth/token — trade a code + PKCE verifier for a device
// token (docs/app/API.md §2).

import { isEmailAllowed } from "@/lib/auth";
import { createDeviceToken, redeemAuthCode } from "@/lib/app-auth";
import { findOrCreateUser } from "@/lib/sign-in";
import { meView } from "@/lib/api-v1-views";
import { apiError, clientIp, invalid, ok, RateLimit, readJsonObject, v1 } from "@/lib/api-v1";

// Codes are 40 bits and each one dies after five wrong verifiers; this
// stops one address from walking the code space.
const perIp = new RateLimit(30, 15 * 60 * 1000);

const failed = () => invalid("code", "That code didn't work. Ask for a new one.");

export const POST = v1(async (request: Request) => {
  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  const { code, verifier } = body;
  if (typeof code !== "string" || code.length > 32) return invalid("code", "code is required.");
  if (typeof verifier !== "string" || !/^[A-Za-z0-9_-]{43,128}$/.test(verifier)) {
    return invalid("verifier", "verifier must be 43–128 base64url characters.");
  }

  const wait = perIp.hit(clientIp(request));
  if (wait > 0) {
    return apiError(429, "slow_down", "Too many attempts.", { retryAfterSeconds: wait });
  }

  const result = await redeemAuthCode(code, verifier);
  if (!result.ok) return failed();
  // The allowlist can change in the 15 minutes a code lives.
  if (!(await isEmailAllowed(result.email))) return failed();

  const user = await findOrCreateUser(result.email);
  const { token } = await createDeviceToken(user.id, result.device);
  return ok({ token, user: meView(user) });
});
