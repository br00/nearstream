// npm run lab:test — PROTOCOL.md §8, end to end, against two real
// instances. Starts both, signs Alice, Carol and Bob in through the real
// magic-link + onboarding routes, acts out the story, checks every step,
// stops both. Exit code 0 = the protocol works.

import { INSTANCES, startInstance, stopAll, waitReady } from "./instances.mjs";
import { sessionCookieFor } from "./config.mjs";

const A = INSTANCES.a;
const B = INSTANCES.b;
const addr = (instance, handle) => `${new URL(instance.url).host}/${handle}`;
const run = Math.random().toString(36).slice(2, 8);

// ─── tiny harness ─────────────────────────────────────────────────────

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "  ✓" : "  ✗"} ${name}${!ok && detail ? `\n      ${detail}` : ""}`);
}
async function eventually(fn, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await fn()) return true;
    if (Date.now() > deadline) return false;
    await new Promise((r) => setTimeout(r, 400));
  }
}

// ─── sign-in, the same way a person does ──────────────────────────────

// Mints a magic-link token exactly like lib/auth.ts does (HMAC-SHA256 over
// base64url JSON) with the lab instance's secret — the stand-in for
// clicking the link in the email.
function b64url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}
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

async function signIn(instance, person) {
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
  await fetch(`${instance.url}/api/onboarding`, {
    method: "POST",
    body: form,
    headers: { cookie },
    redirect: "manual",
  });
  return { ...person, instance, cookie, address: addr(instance, person.handle) };
}

const api = (who, path, init = {}) =>
  fetch(`${who.instance.url}${path}`, {
    ...init,
    redirect: "manual",
    headers: { cookie: who.cookie, "content-type": "application/json", ...(init.headers ?? {}) },
  });
const post = (who, path, body) => api(who, path, { method: "POST", body: JSON.stringify(body ?? {}) });
const shares = async (who) => (await api(who, "/api/shares")).json();
const readerHtml = async (who) => (await api(who, "/reader")).text();
const sources = async (who) => (await (await api(who, "/api/sources")).json()).sources ?? [];

// ─── the story ────────────────────────────────────────────────────────

const children = [startInstance(A), startInstance(B)];
let exitCode = 1;
try {
  console.log("Starting both instances (first compile takes a while)…");
  await Promise.all([waitReady(A), waitReady(B)]);

  const alice = await signIn(A, A.people[0]);
  const carol = await signIn(A, A.people[1]);
  const bob = await signIn(B, B.people[0]);
  console.log(`\nAlice ${alice.address} · Carol ${carol.address} · Bob ${bob.address}\n`);

  console.log("§3 Address");
  const wk = await fetch(`${B.url}/bob/.well-known/nearstream`).then((r) => r.json());
  check("Bob's .well-known names his address", wk.address === bob.address, JSON.stringify(wk));
  check("…and his doorbell and key prefix", !!wk.doorbell && wk.keys === `${B.url}/bob/feed/`);

  console.log("\n§8 steps 1–5 — Alice shares with Bob (across instances)");
  const shareRes = await post(alice, "/api/shares", { address: bob.address });
  const share = await shareRes.json();
  check("Alice's server found Bob and rang his doorbell", shareRes.status === 201 && share.rung === true, JSON.stringify(share));
  const gotPending = await eventually(async () =>
    (await shares(bob)).pending.some((p) => p.fromAddress === alice.address),
  );
  check("Bob sees “Alice wants to share with you”", gotPending);
  const pendingId = (await shares(bob)).pending.find((p) => p.fromAddress === alice.address)?.id;
  const acceptRes = await post(bob, `/api/pending-shares/${pendingId}/accept`);
  check("Bob accepts", acceptRes.status === 200);
  check("Alice is now one of Bob's friends", (await sources(bob)).some((s) => s.address === alice.address));

  console.log("\n§8 steps 6–8 — Alice posts; the doorbell brings it to Bob");
  const friendsText = `friends-only line ${run}`;
  const privateText = `private line ${run}`;
  const publicText = `public line ${run}`;
  await post(alice, "/api/stream", { text: friendsText, tag: "being", visibility: "friends" });
  await post(alice, "/api/stream", { text: privateText, tag: "being", visibility: "private" });
  await post(alice, "/api/stream", { text: publicText, tag: "being", visibility: "public" });
  const arrived = await eventually(async () => (await readerHtml(bob)).includes(friendsText));
  check("Alice's friends-only Line reaches Bob's reader without him refreshing", arrived);
  const bobReader = await readerHtml(bob);
  check("…and her public one", bobReader.includes(publicText));
  check("…but never her private one", !bobReader.includes(privateText));

  console.log("\n§5 Keys");
  const aliceKeys = (await shares(alice)).keys;
  const bobKey = aliceKeys.find((k) => k.friendAddress === bob.address);
  const keyFeed = await fetch(bobKey.keyUrl);
  const keyXml = await keyFeed.text();
  check("Bob's key works in any RSS reader (plain GET, no cookie)", keyFeed.status === 200 && keyXml.includes(friendsText));
  check("…marks friends-only items", keyXml.includes("<nearstream:visibility>friends</nearstream:visibility>"));
  check("…and leaves private ones out", !keyXml.includes(privateText));
  const publicFeed = await fetch(`${A.url}/alice/rss.xml`).then(async (r) => ({ status: r.status, body: await r.text() }));
  check("Alice's public feed never carries friends-only posts", !publicFeed.body.includes(friendsText));
  // Carol is signed in on Alice's instance but isn't Alice — the hardest
  // case for the site's own visibility filter.
  const sitePage = await fetch(`${A.url}/alice/stream`, { headers: { cookie: carol.cookie } });
  const siteHtml = await sitePage.text();
  check(
    "…nor does her site, even to someone signed in on her instance",
    sitePage.status === 200 && siteHtml.includes(publicText) && !siteHtml.includes(friendsText),
  );
  const guessed = await fetch(`${A.url}/alice/feed/k_${"x".repeat(32)}`);
  check("A guessed key is just 404", guessed.status === 404);

  console.log("\n§6 Doorbell");
  const forgedRes = await fetch(`${B.url}/bob/doorbell`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ring: "share", from: carol.address, key: bobKey.keyUrl }),
  });
  check("A ring always answers 202", forgedRes.status === 202);
  await new Promise((r) => setTimeout(r, 2_000));
  check(
    "A forged share (Carol's name, Alice's key) is rejected",
    !(await shares(bob)).pending.some((p) => p.fromAddress === carol.address),
  );
  const junk = await fetch(`${B.url}/bob/doorbell`, { method: "POST", body: "not json" });
  check("Junk rings are ignored, still 202", junk.status === 202);

  console.log("\n§10 Same instance — Alice shares with Carol");
  await post(alice, "/api/shares", { address: carol.address });
  await eventually(async () => (await shares(carol)).pending.some((p) => p.fromAddress === alice.address));
  const carolPending = (await shares(carol)).pending.find((p) => p.fromAddress === alice.address);
  await post(carol, `/api/pending-shares/${carolPending?.id}/accept`);
  check("Carol, on Alice's own instance, reads her friends-only Line", (await readerHtml(carol)).includes(friendsText));

  console.log("\n§8 step 9 — Alice stops sharing with Bob");
  await post(alice, `/api/shares/${bobKey.token}/revoke`);
  check("Bob's key now answers 410 Gone", (await fetch(bobKey.keyUrl)).status === 410);
  const gone = await eventually(async () => !(await readerHtml(bob)).includes(friendsText));
  check("Alice's posts disappear from Bob's reader", gone);
  check("…and Alice from his friends", !(await sources(bob)).some((s) => s.address === alice.address));
  check("Carol still reads Alice — one key, one friend", (await readerHtml(carol)).includes(friendsText));

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  exitCode = failed === 0 ? 0 : 1;
} catch (err) {
  console.error("\nLab test crashed:", err);
  for (const c of children) console.error(`\n--- ${c.spawnargs.join(" ")} log tail ---\n${c.logText().slice(-3000)}`);
} finally {
  stopAll(children);
}
process.exit(exitCode);
