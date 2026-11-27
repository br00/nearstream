// npm run lab:test — PROTOCOL.md §8, end to end, against two real
// instances. Starts both, signs Alice, Carol and Bob in through the real
// magic-link + onboarding routes, acts out the story, checks every step,
// stops both. Exit code 0 = the protocol works.

import { INSTANCES, startInstance, stopAll, waitReady } from "./instances.mjs";
import { sessionCookieFor } from "./config.mjs";
import { createServer } from "node:http";

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

// A stranger's server: a .well-known whose fields she chose, and one key
// of her own (`/feed/{STRANGER_TOKEN}`) that answers with a feed. Listens
// on 127.0.0.1 (not "localhost") so Node can't pick ::1 instead.
const STRANGER_TOKEN = `k_${"m".repeat(32)}`;
function startStranger(makeDoc) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (req.url === "/.well-known/nearstream") {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify(makeDoc(address)));
      }
      if (req.url === `/feed/${STRANGER_TOKEN}`) {
        res.writeHead(200, { "content-type": "application/rss+xml" });
        return res.end(`<?xml version="1.0"?><rss version="2.0"><channel><title>Alice</title></channel></rss>`);
      }
      res.writeHead(404);
      res.end();
    });
    let address = "";
    server.listen(0, "127.0.0.1", () => {
      address = `127.0.0.1:${server.address().port}`;
      resolve({ address, close: () => server.close() });
    });
  });
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

// ─── the app API (docs/app/API.md) ────────────────────────────────────

// Every v1 response body, so the last check can prove no key ever leaked.
const v1Bodies = [];

async function v1(who, path, { method = "GET", body, token = who.token } = {}) {
  const res = await fetch(`${who.instance.url}/api/v1${path}`, {
    method,
    redirect: "manual",
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  v1Bodies.push({ path, text });
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // leave null
  }
  return { status: res.status, json, text };
}

function pkce() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  return { verifier, challengeOf: async (v) => b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)))) };
}

/** The app's sign-in email, read from the instance's lab-only email log. */
async function emailFor(child, email, sinceLength) {
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

async function appSignIn(who, child, { device = "Lab phone" } = {}) {
  const { verifier, challengeOf } = pkce();
  const challenge = await challengeOf(verifier);
  const since = child.logText().length;
  const start = await v1(who, "/auth/start", { method: "POST", body: { email: who.email, challenge, device } });
  const mail = await emailFor(child, who.email, since);
  const code = mail?.match(/type this code into the app: ([A-Z2-9]{4}) ([A-Z2-9]{4})/);
  const link = mail?.match(/nearstream:\/\/auth\?server=[^&\s]+&code=([A-Z2-9]{8})/);
  return { start, mail, code: code ? code[1] + code[2] : null, linkCode: link?.[1] ?? null, verifier };
}

async function appApiChecks({ alice, bob, childA, childB }) {
  console.log("\nApp API v1 — discovery and sign-in");
  const wk = await fetch(`${A.url}/alice/.well-known/nearstream`).then((r) => r.json());
  check("Discovery names the app API", wk.api === `${A.url}/api/v1`, JSON.stringify(wk));

  const s = await appSignIn(alice, childA);
  check("/auth/start answers 202", s.start.status === 202, s.start.text);
  check("The email carries the nearstream:// link and the same code typed out", !!s.code && s.code === s.linkCode, s.mail ?? "no email");

  const strangerSince = childA.logText().length;
  const { verifier: sv, challengeOf } = pkce();
  const stranger = await v1({ instance: A }, "/auth/start", {
    method: "POST",
    body: { email: "stranger@lab.test", challenge: await challengeOf(sv), device: "x" },
  });
  const strangerMail = await emailFor(childA, "stranger@lab.test", strangerSince);
  check("A stranger gets the same 202 — and no email", stranger.status === 202 && strangerMail === null);

  const wrong = await v1({ instance: A }, "/auth/token", {
    method: "POST",
    body: { code: s.code, verifier: b64url(crypto.getRandomValues(new Uint8Array(32))) },
  });
  check("A stolen code without the verifier is refused", wrong.status === 400 && wrong.json?.error?.code === "invalid" && wrong.json?.error?.field === "code", wrong.text);

  const tok = await v1({ instance: A }, "/auth/token", { method: "POST", body: { code: s.code.toLowerCase(), verifier: s.verifier } });
  check("Code + verifier → a device token and me", tok.status === 200 && /^nst_[A-Za-z0-9_-]{43}$/.test(tok.json?.token ?? "") && tok.json?.user?.handle === "alice", tok.text);
  alice.token = tok.json?.token;

  const again = await v1({ instance: A }, "/auth/token", { method: "POST", body: { code: s.code, verifier: s.verifier } });
  check("…and the code is single use", again.status === 400, again.text);

  const me = await v1(alice, "/me");
  check("/me is Alice", me.status === 200 && me.json?.address === alice.address && me.json?.id?.startsWith("u_"), me.text);
  const anon = await v1(alice, "/me", { token: null });
  check("No token → 401 unauthorized", anon.status === 401 && anon.json?.error?.code === "unauthorized", anon.text);

  const bs = await appSignIn(bob, childB);
  const btok = await v1({ instance: B }, "/auth/token", { method: "POST", body: { code: bs.code, verifier: bs.verifier } });
  bob.token = btok.json?.token;
  check("Bob signs in on his own server", btok.status === 200 && !!bob.token, btok.text);

  console.log("\nApp API v1 — sharing over v1");
  const share = await v1(alice, "/sharing", { method: "POST", body: { address: bob.address } });
  check("Alice shares with Bob → 201 with an opaque id", share.status === 201 && share.json?.id?.startsWith("sh_") && share.json?.address === bob.address, share.text);
  const reshare = await v1(alice, "/sharing", { method: "POST", body: { address: bob.address } });
  check("Sharing again re-rings the same key → 200, same id", reshare.status === 200 && reshare.json?.id === share.json?.id, reshare.text);
  const badShare = await v1(alice, "/sharing", { method: "POST", body: { address: "" } });
  check("A missing address is 400 on that field", badShare.status === 400 && badShare.json?.error?.field === "address", badShare.text);

  let pendingId;
  await eventually(async () => {
    const f = await v1(bob, "/friends");
    pendingId = f.json?.pending?.find((p) => p.address === alice.address)?.id;
    return !!pendingId;
  });
  check("Bob's /friends lists Alice as pending", !!pendingId);
  const accept = await v1(bob, `/pending/${pendingId}/accept`, { method: "POST" });
  check("Bob accepts over v1 → friend", accept.status === 200 && accept.json?.friend?.address === alice.address, accept.text);
  const bobFriends = await v1(bob, "/friends");
  check("…Alice is in his friends", bobFriends.json?.friends?.some((f) => f.address === alice.address));
  const aliceFriends = await v1(alice, "/friends");
  check("…and Bob in the people Alice shares with", aliceFriends.json?.sharing?.some((x) => x.address === bob.address && x.id === share.json?.id), aliceFriends.text);
  const ghost = await v1(bob, "/pending/pd_00000000-0000-0000-0000-000000000000/ignore", { method: "POST" });
  check("Ignoring a share that isn't there is 404", ghost.status === 404 && ghost.json?.error?.code === "not_found", ghost.text);

  console.log("\nApp API v1 — Lines and the reader");
  const clientId = crypto.randomUUID();
  const lineText = `app friends-only line ${run}`;
  const p1 = await v1(alice, "/lines", { method: "POST", body: { clientId, text: lineText, tag: "being", visibility: "friends" } });
  check("POST /lines → 201", p1.status === 201 && p1.json?.clientId === clientId && p1.json?.visibility === "friends", p1.text);
  const p2 = await v1(alice, "/lines", { method: "POST", body: { clientId, text: lineText, tag: "being", visibility: "friends" } });
  check("Same clientId again → 200, the first Line", p2.status === 200 && p2.json?.id === p1.json?.id, p2.text);
  const lines = await v1(alice, "/lines?limit=100");
  check("…and only one copy in /lines", lines.json?.items?.filter((l) => l.text === lineText).length === 1, lines.text);
  const badTag = await v1(alice, "/lines", { method: "POST", body: { clientId: crypto.randomUUID(), text: "x", tag: "nope" } });
  check("A bad tag is 400 on that field", badTag.status === 400 && badTag.json?.error?.field === "tag", badTag.text);

  let item;
  const reached = await eventually(async () => {
    const r = await v1(bob, "/reader?limit=100");
    item = r.json?.items?.find((i) => i.text === lineText);
    return !!item;
  });
  check("Alice's friends-only Line reaches Bob's /reader", reached);
  check("…marked friends, from Alice", item?.visibility === "friends" && item?.friend?.address === alice.address && item?.id?.startsWith("fe_"), JSON.stringify(item));
  const page1 = await v1(bob, "/reader?limit=1");
  const page2 = page1.json?.next ? await v1(bob, `/reader?limit=1&before=${encodeURIComponent(page1.json.next)}`) : null;
  check("The reader pages with an opaque cursor", page1.json?.items?.length === 1 && !!page2 && page2.json?.items?.[0]?.id !== page1.json.items[0].id, page1.text);
  const refresh = await v1(bob, "/reader/refresh", { method: "POST" });
  check("POST /reader/refresh → 202", refresh.status === 202);

  const del = await v1(alice, `/lines/${p1.json?.id}`, { method: "DELETE" });
  check("DELETE /lines/{id} → 204", del.status === 204);
  const gone = await eventually(async () => !(await v1(bob, "/reader?limit=100")).json?.items?.some((i) => i.text === lineText));
  check("…and it leaves Bob's reader", gone);
  const retryDeleted = await v1(alice, "/lines", { method: "POST", body: { clientId, text: lineText, tag: "being", visibility: "friends" } });
  check("A late retry of a deleted Line doesn't bring it back (409)", retryDeleted.status === 409, retryDeleted.text);

  console.log("\nApp API v1 — stop sharing and devices");
  const stop = await v1(alice, `/sharing/${share.json?.id}`, { method: "DELETE" });
  check("DELETE /sharing/{id} → 204", stop.status === 204, stop.text);
  const dropped = await eventually(async () => !(await v1(bob, "/friends")).json?.friends?.some((f) => f.address === alice.address));
  check("…and Alice drops out of Bob's friends", dropped);

  const second = await appSignIn(alice, childA, { device: "Lab tablet" });
  const t2 = await v1({ instance: A }, "/auth/token", { method: "POST", body: { code: second.code, verifier: second.verifier } });
  const tablet = { ...alice, token: t2.json?.token };
  const devs = await v1(alice, "/devices");
  const current = devs.json?.devices?.find((d) => d.current);
  const other = devs.json?.devices?.find((d) => !d.current && d.device === "Lab tablet");
  check("/devices lists both, this one marked current", devs.status === 200 && current?.device === "Lab phone" && !!other, devs.text);
  const cut = await v1(alice, `/devices/${other?.id}`, { method: "DELETE" });
  check("Signing the tablet out → 204", cut.status === 204);
  const dead = await v1(tablet, "/me");
  check("…and its token now gets 401", dead.status === 401 && dead.json?.error?.code === "unauthorized", dead.text);
  check("…while the phone's still works", (await v1(alice, "/me")).status === 200);

  const leaks = v1Bodies.filter((b) => /\/feed\/k_|k_[A-Za-z0-9_-]{32}/.test(b.text));
  check(`No key URL or key token in any of ${v1Bodies.length} v1 responses`, leaks.length === 0, leaks.map((l) => l.path).join(", "));
}

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

  console.log("\n§6 A stranger forwards a key Alice gave someone else");
  const carolKey = (await shares(alice)).keys.find((k) => k.friendAddress === carol.address);
  const mallory = await startStranger((address) => ({
    protocol: "nearstream/0.1",
    address,
    name: "Alice",
    feed: `http://${address}/rss.xml`,
    doorbell: `http://${address}/doorbell`,
    // Her own document, so she can claim Alice's key prefix as hers.
    keys: `${A.url}/alice/feed/`,
  }));
  const relabel = await fetch(`${B.url}/bob/doorbell`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ring: "share", from: mallory.address, key: carolKey.keyUrl }),
  });
  await new Promise((r) => setTimeout(r, 4_000));
  check(
    "Mallory can't pass Carol's key off as her own share",
    relabel.status === 202 && !(await shares(bob)).pending.some((p) => p.fromAddress === mallory.address),
  );
  // With a real key of her own the share goes through (the protocol can't
  // know "Alice" isn't her name), so Bob is warned instead.
  await fetch(`${B.url}/bob/doorbell`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ring: "share", from: mallory.address, key: `http://${mallory.address}/feed/${STRANGER_TOKEN}` }),
  });
  const namesakePending = await eventually(async () =>
    (await shares(bob)).pending.some((p) => p.fromAddress === mallory.address),
  );
  check("…but a key of her own still arrives as a share", namesakePending);
  const friendsHtml = await (await api(bob, "/reader/friends")).text();
  check(
    "…with a warning that Bob already reads an Alice at another address",
    friendsHtml.includes("You already read a") && friendsHtml.includes(mallory.address),
  );
  const malloryPending = (await shares(bob)).pending.find((p) => p.fromAddress === mallory.address);
  await post(bob, `/api/pending-shares/${malloryPending?.id}/ignore`);
  mallory.close();

  console.log("\n§8 step 9 — Alice stops sharing with Bob");
  await post(alice, `/api/shares/${bobKey.token}/revoke`);
  check("Bob's key now answers 410 Gone", (await fetch(bobKey.keyUrl)).status === 410);
  const gone = await eventually(async () => !(await readerHtml(bob)).includes(friendsText));
  check("Alice's posts disappear from Bob's reader", gone);
  check("…and Alice from his friends", !(await sources(bob)).some((s) => s.address === alice.address));
  check("Carol still reads Alice — one key, one friend", (await readerHtml(carol)).includes(friendsText));

  await appApiChecks({ alice, bob, carol, childA: children[0], childB: children[1] });

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
