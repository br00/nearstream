import { sessionCookieFor } from "./config.mjs";

export async function eventually(fn, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await fn()) return true;
    if (Date.now() > deadline) return false;
    await new Promise((r) => setTimeout(r, 400));
  }
}

export function b64url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

export const addressOf = (instance, handle) => `${new URL(instance.url).host}/${handle}`;

async function magicToken(instance, email) {
  const body = b64url(
    new TextEncoder().encode(
      JSON.stringify({ email, exp: Math.floor(Date.now() / 1000) + 900, purpose: "magic" }),
    ),
  );
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(instance.authSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return `${body}.${b64url(new Uint8Array(sig))}`;
}

export async function signIn(instance, person) {
  const token = await magicToken(instance, person.email);
  const cb = await fetch(`${instance.url}/auth/callback?token=${encodeURIComponent(token)}`, {
    redirect: "manual",
  });
  const cookie = (cb.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(";")[0])
    .find((c) => c.startsWith(`${sessionCookieFor(instance)}=`));
  if (!cookie) throw new Error(`sign-in failed for ${person.email} (${cb.status})`);
  const form = new FormData();
  form.set("handle", person.handle);
  form.set("displayName", person.name);
  if (person.mark !== undefined) form.set("profileMark", String(person.mark));
  await fetch(`${instance.url}/api/onboarding`, {
    method: "POST",
    body: form,
    headers: { cookie },
    redirect: "manual",
  });
  return { ...person, instance, cookie, address: addressOf(instance, person.handle) };
}

export function webApi(who, path, init = {}) {
  return fetch(`${who.instance.url}${path}`, {
    ...init,
    redirect: "manual",
    headers: { cookie: who.cookie, "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

export function webPost(who, path, body) {
  return webApi(who, path, { method: "POST", body: JSON.stringify(body ?? {}) });
}

export function pkce() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  return {
    verifier,
    challengeOf: async (v) =>
      b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)))),
  };
}

export async function emailFor(child, email, sinceLength) {
  let found = null;
  await eventually(async () => {
    const log = child.logText().slice(sinceLength);
    const start = log.indexOf(`[nearstream-lab-email] to=${email}`);
    if (start === -1) return false;
    const end = log.indexOf("[/nearstream-lab-email]", start);
    if (end === -1) return false;
    found = log.slice(start, end);
    return true;
  }, 10_000);
  return found;
}

export async function appSignIn(who, child, { device = "Lab phone" } = {}) {
  const { verifier, challengeOf } = pkce();
  const challenge = await challengeOf(verifier);
  const since = child.logText().length;
  const res = await fetch(`${who.instance.url}/api/v1/auth/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: who.email, challenge, device }),
  });
  const start = { status: res.status, text: await res.text() };
  const mail = await emailFor(child, who.email, since);
  const code = mail?.match(/type this code into the app: ([A-Z2-9]{4}) ([A-Z2-9]{4})/);
  const link = mail?.match(/nearstream:\/\/auth\?server=[^&\s]+&code=([A-Z2-9]{8})/);
  return { start, mail, code: code ? code[1] + code[2] : null, linkCode: link?.[1] ?? null, verifier };
}

export async function requestAppToken(who, child, { device } = {}) {
  const { code, verifier } = await appSignIn(who, child, { device });
  if (!code) throw new Error(`no app sign-in code arrived for ${who.email}`);
  const res = await fetch(`${who.instance.url}/api/v1/auth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, verifier }),
  });
  const json = await res.json();
  if (!json?.token) throw new Error(`token exchange failed for ${who.email} (${res.status})`);
  return json.token;
}
