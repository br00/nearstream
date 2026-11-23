# Nearstream App API — v1

The contract between the native app (KMP) and a Nearstream server.
Status: **built** — every endpoint on this page is implemented under
`app/api/v1/` and exercised by `npm run lab:test`. `core:network` gets
built against this page.

Decisions taken while building it that weren't in the draft are marked
**Decision** and listed together in §10. They're up for review.

## 0. The shape

The app is an **email client for Nearstream**. It signs in to *one* server —
the one your account lives on — and talks only to that server. It never
talks to friends' servers: your server already does the protocol work
(PROTOCOL.md) and keeps your reader up to date. The app is a window, plus an
offline cache.

```
 app ──HTTPS + bearer token──▶ your server ──protocol──▶ friends' servers
```

Anyone on any Nearstream server can use the same app, because the app finds
the server from the address the person types.

Rules for the whole API:

- Base URL comes from discovery (§1), never hardcoded. Paths below are
  relative to it, e.g. `https://nearstream.app/api/v1`.
- JSON in, JSON out. UTF-8. Times are ISO 8601 UTC strings.
- **Additive only within v1.** New fields may appear; the app must ignore
  fields it doesn't know. Removing or changing a field means `/api/v2`.
- Every endpoint except §2's `/auth/*` needs `Authorization: Bearer <token>`.
- **Ids are opaque strings.** They carry a short type prefix (`u_`, `ln_`,
  `fe_`, `fr_`, `sh_`, `pd_`, `dv_`) to help a person reading logs; the app
  must not parse them.
- **Optional fields are omitted, not `null`** — except where a field is
  shown as `string | null` below (`/me` before onboarding, `next`).
- Responses are `cache-control: private, no-store`.

## 1. Find the server

The person types their address: `nearstream.app/maria`, or
`alessandroborelli.it`. The app does:

```
GET https://{address}/.well-known/nearstream
```

The discovery document gains one optional field (additive to PROTOCOL.md §3):

```json
{
  "protocol": "nearstream/0.1",
  "address": "nearstream.app/maria",
  "name": "Maria",
  "api": "https://nearstream.app/api/v1"
}
```

`api` is always on the instance, even for a custom-domain address
(`alessandroborelli.it` → `https://nearstream.app/api/v1`).

No `api` field → "this server doesn't support the app yet". The app says so
and stops.

## 2. Sign in

Same magic link as the web, but it lands in the app and becomes a
**device token**. PKCE-style, so a stolen link is worthless.

1. App generates a random `verifier` (32 bytes, base64url — 43 chars; 43–128
   accepted) and keeps it in memory. `challenge = base64url(sha256(verifier))`
   (43 chars, no padding).
2. ```
   POST /auth/start
   { "email": "maria@example.com", "challenge": "…", "device": "Pixel 9" }
   → 202 {}
   ```
   Always 202 for a well-formed request, allowlisted or not (no account
   enumeration). The allowlist check and the email happen after the
   response, so timing doesn't tell either. `device` is optional (≤64 chars,
   default "Unknown device"). Bad email or challenge shape → 400 `invalid`
   with `field`.

   Rate-limited, in memory per server process: 5 per email and 20 per IP
   per 15 minutes → 429 `slow_down` with `retry-after`.

   The server emails a link **and** an 8-character code from
   `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I). The email shows the code
   as `ABCD 2345`.
3. The person either:
   - taps the link — `nearstream://auth?server=nearstream.app&code=ABCD2345`
     opens the app (`server` is the instance host, with a port when there is
     one, e.g. `localhost:3001` in the lab), or
   - types the code into the app (for when the email is open on a laptop).
     The server ignores case, spaces and dashes.
4. ```
   POST /auth/token
   { "code": "ABCD2345", "verifier": "…" }
   → 200 { "token": "nst_…", "user": { …me… } }
   ```
   The server checks `sha256(verifier) == challenge` (constant-time). A code
   is single use, lives 15 minutes, and dies after 5 wrong verifiers. Every
   failure — unknown, expired, used, wrong verifier, no longer allowlisted —
   is the same `400 invalid` with `field: "code"`. Rate-limited to 30 per IP
   per 15 minutes.

   A first sign-in creates the account, exactly as the web callback does.

Why a custom scheme and not App Links / Universal Links: those need the
app's domains baked in at build time, so they'd only work for
nearstream.app, never for someone's own domain. Any app can claim
`nearstream://` — PKCE is what makes that safe: an app that steals the link
doesn't have the verifier.

**The token.** `nst_` + 32 random bytes in base64url (47 chars). The server
stores only its SHA-256: the device row at `users/{userId}/devices/{hash}`
(`id`, `device`, `createdAt`, `lastUsedAt`), plus an index
`device-tokens/{hash}` → user, because a bearer lookup doesn't know the user
yet. `lastUsedAt` is updated at most once a minute per token. No expiry; it
dies when revoked. The app keeps it in Keychain / Android Keystore-backed
storage, never in plain prefs.

```
GET    /devices        → { "devices": [ { "id", "device", "createdAt", "lastUsedAt", "current" } ] }
DELETE /devices/{id}   → 204    // sign a device out; on "current" = sign out here
```

`/me` and `/devices` work before onboarding; everything else needs a handle
(§7, `onboarding_required`).

*Not built yet:* the web settings page listing devices (so a lost phone can
be cut off from a laptop). It's the next small slice.

## 3. Me

```
GET /me
→ 200 {
  "id": "u_…",
  "handle": "maria",
  "name": "Maria",
  "address": "nearstream.app/maria",
  "siteUrl": "https://nearstream.app/maria"
}
```

`handle`, `address` and `siteUrl` are `null` until onboarding is done (`name`
too, usually) — in v1 the app sends the person to the web for that (one less
screen to build).

## 4. Reader

Your friends' posts, newest first — the same items `/reader` shows. Your own
Lines are not included (§5).

```
GET /reader?limit=30&before={cursor}
→ 200 { "items": [ ReaderItem ], "next": "cursor-or-null" }
```

```
ReaderItem {
  id           "fe_…"
  kind         note | essay | picture | voice | track | unknown
  publishedAt  "2026-11-20T09:12:00Z"
  url          permalink — open in browser
  visibility   public | friends
  friend       { id, name, address? }
  title?, excerpt?, text?
  images?      [ { url, thumbUrl?, width?, height? } ]
  audio?       { url, mime, durationMs? }
  track?       { title, artist?, durationMs?, coverUrl? }
}
```

- `text` is the plain-text body (HTML stripped, paragraph breaks kept). It
  is left out for essays; show `excerpt` and open `url`.
- `visibility` is `friends` when the friend's key feed marked the item
  `<nearstream:visibility>friends</nearstream:visibility>`. **Decision:** the
  reader now stores that mark (`FeedEntry.visibility`); items fetched before
  this change read as `public` until the friend's next refresh.
- `friend.address` is absent for a feed added by hand with no homepage.

Optional fields are omitted, not `null`. Media URLs are absolute and work
without the token (friends-only media already uses key-scoped URLs,
PROTOCOL.md §5), so the image loader needs no auth headers. See §10 on what
that means for "no key URLs".

`limit` is 1–100 (default 30; out of range → 400 `invalid`, `field: "limit"`).
The cursor is opaque: pass it back, never parse it. A garbled cursor is 400
with `field: "before"`.

**Offline.** The server is the truth; the app's cache is a window. On
refresh the app fetches page one and replaces its cached window with it,
then pages back only on scroll. A friend who stops sharing disappears from
`/friends`, and the app drops their cached items. Cache cap ~500 items.

```
POST /reader/refresh   → 202 {}   // re-pull friends now (pull-to-refresh)
```

The pull runs after the response; poll `/reader` a moment later. At most one
pull per user every 30 seconds — extra calls still get 202 and do nothing.

## 5. Lines (your own posts)

```
GET    /lines?limit=30&before={cursor}   → { "items": [ Line ], "next": … }
POST   /lines                             → 201 Line   (200 Line on a repeat clientId)
DELETE /lines/{id}                        → 204
```

```json
POST /lines
{
  "clientId": "uuid-made-by-the-app",
  "text": "first coffee in the new flat",
  "tag": "being",
  "visibility": "friends"
}
```

`clientId` is required: 1–64 characters of `A–Z a–z 0–9 - _` (a UUID fits).
`text` is required, trimmed, ≤5000 characters. `tag` is
`making | taking in | being`. `visibility` is `public | friends | private`,
default `public`. Each bad field → 400 `invalid` with that `field`.

`clientId` makes posting safe to retry: the same `clientId` twice returns
the first Line (200, not a duplicate). That's what makes an **offline
outbox** possible — write locally, send when online, retry without fear.
**Decision:** the server keeps a `clientId → Line` index
(`users/{id}/line-clients/{clientId}`) so a retry is one read, and the
index outlives the Line: a retry for a Line that has since been deleted
gets **409 `conflict`**, never a resurrected post. The app should drop that
outbox item.

`Line` = `{ id, clientId?, text, tag, visibility, publishedAt }`.
`clientId` is absent for Lines posted on the web. Voice notes posted on the
web are listed too, with their caption as `text`; their audio isn't in v1.
Voice notes and pictures can't be posted in v1 — they need upload URLs and
get their own slice.

Posting a non-private Line and deleting any non-private Line both ring
everyone you share with, so friends see the change in seconds.

## 6. Friends and sharing

The same operations as `/reader/friends` on the web.

```
GET /friends
→ {
  "friends": [ { id, name, address? } ],             // people you read
  "sharing": [ { id, name, address, since } ],       // people who read you
  "pending": [ { id, name, address, receivedAt, namesake } ]   // want to share with you
}

POST   /sharing               { "address": "nearstream.app/bob" }  → 201 { id, name, address, since, rung }
DELETE /sharing/{id}          → 204    // stop sharing: Bob's key dies
POST   /pending/{id}/accept   → 200 { "friend": { id, name, address? } }
POST   /pending/{id}/ignore   → 204
```

- **`name` is whatever the sender calls themselves; `address` is who they
  are.** Show the address first. `namesake` is `{ name, address }` when you
  already read a friend with the same name at a *different* address (address
  is null for a feed added by hand without a site), else `null`. Show it as
  a warning on the share: it's how someone would pretend to be a friend, and
  no server check can catch it.
- **Decision:** `POST /sharing` to someone you already share with is **200**
  (not 409) with the same `id`: the server rings them again with the same
  key (PROTOCOL.md §6 — one friend, one key). That's "send it again" if they
  ignored it by mistake. 201 means a new key was made.
- `rung` is whether their doorbell answered. `false` isn't an error: the
  key exists and their server will find it when it next polls.
- An address that isn't one, is your own, or has no Nearstream behind it →
  400 `invalid`, `field: "address"`, with a readable `message`.
- An unknown or already-answered `{id}` → 404 `not_found`.

**Key URLs never appear in this API.** **Decision:** `sharing[].id` is an
HMAC of the key token under the server secret, so it is stable and opaque
and can't be turned back into the key. A key is a credential, and the app
has no reason to hold one.

## 7. Errors

```json
{ "error": { "code": "not_found", "message": "for logs, not for UI", "field": "only for invalid" } }
```

| Status | `code` | App does |
|---|---|---|
| 400 | `invalid` (+ `field`) | show it on that field |
| 401 | `unauthorized` | token is dead: wipe it, back to sign-in |
| 403 | `onboarding_required` | **Decision.** Signed in, but no handle yet: send them to the web to finish, then re-check `/me` |
| 404 | `not_found` | drop the thing from the cache |
| 409 | `conflict` | e.g. a retried Line that was deleted: drop it |
| 429 | `slow_down` | back off for `retry-after` seconds |
| 5xx | `server` | retry with backoff; keep the outbox |

The app switches on `code`, never on `message`. Treat an unknown `code` by
its status.

## 8. Not in v1, on purpose

Push notifications (the doorbell could wake the phone — later), media
upload, essays, editing, in-app onboarding, multiple accounts. Each one is
an additive slice.

## 9. Open questions — answered for v1

1. **Onboarding on the web in v1.** Yes. `/me` says `handle: null`; other
   endpoints answer `onboarding_required`.
2. **Code** — 8 chars, alphabet without 0/O/1/I (40 bits). With 5 wrong
   verifiers per code, a 15-minute life and per-IP limits, enough.
3. **Offline cap** ~500 reader items — the app's call; nothing on the server
   depends on it.
4. **Does `/reader` include your own Lines?** No. `/lines` is yours,
   `/reader` is friends; the app merges them if it wants one timeline.
5. **Scheme name** — `nearstream://`.

## 10. Decisions for review

Taken while building; each is small to change before an app ships against it.

1. **Friends-only marking in the reader.** `FeedEntry` gains
   `visibility?: "friends"`, parsed from `<nearstream:visibility>` in
   `lib/feed-parser.ts`, so `ReaderItem.visibility` is real.
2. **`clientId` storage.** `StreamEntry.clientId` (optional) plus a
   `clientId → Line` index; a retry of a deleted Line is 409.
3. **`sharing[].id`** is an HMAC of the key token, not a stored id.
4. **Re-sharing** is 200 + re-ring, not 409.
5. **`403 onboarding_required`** is a new error code for handle-less accounts.
6. **Lab sign-in.** `npm run lab:test` reads the code from the instance's
   log: with `NEARSTREAM_LAB_EMAIL_LOG=1` (set only by
   `scripts/lab/config.mjs`) and no Resend credentials, `lib/email.ts`
   prints the whole email body. Elsewhere, codes and tokens are never
   logged.
7. **Media URLs from friends' key feeds contain the key.** A friend's
   friends-only image or voice note comes through their key-scoped URL
   `{site}/feed/{token}/media/{ref}` (PROTOCOL.md §5), and `/reader` passes
   it through as-is, so the app — like the web reader's `<img>` tags today —
   holds a URL with the friend's key in its path. The lab can't show this
   (it has no R2, so no media). Closing it means proxying friends-only media
   through your own server (costs bandwidth) or a per-media URL scheme in
   the protocol. Not done in v1; flagged.
8. **Rate limits and the code lock are per process**, like the doorbell's.
   On serverless that's per warm instance: they blunt a flood but don't
   count exactly.
