# Architecture

How the code is laid out. Pairs with [`NEARSTREAM.md`](./NEARSTREAM.md), which holds philosophy + decisions. This file holds shape.

> **Status:** Phase 1 · Slice 3 (magic-link auth) — durable R2 storage; `/studio` and `POST /api/stream` gated by Resend magic-link sign-in; reading stays public; no styling polish.

---

## Directory shape

```
nearstream/
├── app/                   Next.js App Router routes
│   ├── api/stream/        POST = add entry (gated) · GET = list entries (public)
│   ├── auth/
│   │   ├── callback/      GET: verify magic-link token → set session → redirect
│   │   └── logout/        POST: clear session cookie
│   ├── login/
│   │   ├── page.tsx       email entry form
│   │   └── actions.ts     server action: send magic link
│   ├── studio/            posting UI — gated, also calls getSession() itself
│   ├── _components/       small client components (e.g. SubmitButton)
│   ├── page.tsx           public stream timeline (server component)
│   └── layout.tsx         root layout, fonts, metadata
├── lib/
│   ├── store.ts           Store interface + InMemoryStore + env-driven picker
│   ├── r2-store.ts        Cloudflare R2 implementation (aws4fetch, S3 API)
│   ├── auth.ts            HMAC token sign/verify, session cookie, allowlist
│   └── email.ts           Resend send + dev console fallback
├── schemas/
│   └── stream.ts          StreamEntry typed primitive
├── proxy.ts               Next 16 Proxy: optimistic redirect on /studio/*
├── .env.example           R2 + auth + Resend templates
├── ARCHITECTURE.md        this file
├── NEARSTREAM.md          manifesto + lexicon + decisions
└── LICENSE                AGPL-3.0
```

## The auth flow (slice 3)

```
  /login                          /login (POST server action)            /auth/callback?token=…
  ──────                          ─────────────────────────────          ────────────────────────
  <form action={requestMagicLink}> normalize + shape-check email          consumeMagicLinkToken()
   email                            ┌── isEmailAllowed(email) ──┐         (HMAC verify + exp + purpose)
                                    │                            │              │
                                    no  (silent)                yes              ▼
                                    │                            ▼         isEmailAllowed(email)
                                    │              createMagicLinkToken()        │
                                    │              + sendMagicLink (Resend       ▼
                                    │                 or console in dev)    createSession()
                                    │                            │         (Set-Cookie HttpOnly)
                                    └─────────────┬──────────────┘              │
                                                  ▼                              ▼
                                          /login?sent=1                       /studio


  proxy.ts (Next 16 Proxy)                              app/studio/page.tsx · app/api/stream POST
  ────────────────────────                              ─────────────────────────────────────────
  matcher: /studio/:path*                                getSession()  (HMAC verify cookie)
  cookie present? → next()                                 │
  cookie missing? → redirect /login                        ├── valid   → render / handle POST
                                                           └── invalid → redirect /login or 401

       (cheap, prefetch-friendly,                                  (real check, defense-in-depth)
        no signature verification)
```

Public surface:
- `GET /` — anyone, anonymous.
- `GET /api/stream` — anyone, anonymous. (Reader / RSS will use this in later slices.)

Gated surface:
- `GET /studio` — requires session (proxy redirect + real check in page).
- `POST /api/stream` — requires session (401 otherwise).

Sessions are signed cookies. There is no session store. Rotating `AUTH_SECRET` invalidates every session and every outstanding magic link in one step.

## The data flow (unchanged from slice 2)

```
  /studio                          /api/stream                           /
  ───────                          ───────────                           ─
  <form action="/api/stream" POST> getSession() → 401 if missing         renders
   text + tag (radio)              parse form/json                       store.list()
                                   validate (schema)                       │
                                   store.add()  ──┐                        ▼
                                                  ▼                ┌─────────────────────────────┐
                                          ┌──────────────────┐     │ store: R2Store | InMemory   │
                                          │  R2 bucket:      │     │ (picked at module load)     │
                                          │  entries/{id}.json│     └─────────────────────────────┘
                                          └──────────────────┘
```

## Rules followed

1. **Schemas are the single source of truth.** `schemas/stream.ts` exports the `StreamEntry` type *and* `DISCIPLINE_TAGS` *and* `isDisciplineTag()`. One file feeds the form, the route handler, and the public render. ("schema-as-code" — NEARSTREAM.md §05.)

2. **Store is an interface, not a database.** `lib/store.ts` picks `InMemoryStore` or `R2Store` at module load from `R2_*` env vars. The rest of the app doesn't know.

3. **Auth is one file, no SDK.** `lib/auth.ts` contains the entire auth surface: HMAC sign/verify, magic-link token, session cookie, allowlist. Web Crypto only — no `jose`, no `next-auth`. The Resend client in `lib/email.ts` is `fetch` against `api.resend.com`.

4. **Optimistic check + real check.** `proxy.ts` does a cheap cookie-presence check on every `/studio/*` request (no HMAC, no DB — runs on prefetches). `getSession()` in the page / route does the real HMAC verify. Standard Next 16 pattern.

5. **Public render is a server component.** `app/page.tsx` reads the store directly at request time. No client-side fetching, no API call from the browser. `/api/stream` exists for posting and for future readers / RSS.

## Why these choices

- **No Sanity.** Studio is built into the app (NEARSTREAM.md §05: *"friends will not learn a second tool with a second login."*).
- **No Vercel-specific APIs.** Standard Next features only — `revalidatePath`, route handlers, server components, Proxy. Same code will run on Fly.io / Hetzner.
- **R2 via `aws4fetch`.** Single-file SigV4 signer + `fetch`. AWS SDK is ~1.6 MB of features we don't need.
- **Auth via raw HMAC, not `jose` / `next-auth` / Lucia.** Same ethos. ~30 lines of Web Crypto. Standard auth libraries assume a multi-provider, refresh-token, RBAC world Nearstream will never have.
- **Allowlist in env var.** Adding a friend = redeploy. Friction by design.
- **Magic-link login leaks nothing.** The login page always shows "if that email is on the allowlist, a link is on its way" — same response either way. No allowlist enumeration.
- **Resend via `fetch`, not the SDK.** Dev mode (no `RESEND_API_KEY` / `RESEND_FROM`) prints the link to console — same fallback shape as the R2 picker in slice 2.
- **Form posts, not client JS.** Login + studio both work with JS off.
- **`force-dynamic` on `/`.** Prevents Next from caching the timeline at build. Slice 5 (RSS) will revisit caching properly.

## What's next per slice

| Slice | Adds | Touches |
|---|---|---|
| 1 | skeleton end-to-end loop | `app/`, `lib/store.ts`, `schemas/stream.ts` |
| 2 | Cloudflare R2 storage backend | `lib/r2-store.ts`, `.env.example`, store picker |
| 3 (this) | Resend magic-link auth, gate `/studio` | `lib/auth.ts`, `lib/email.ts`, `app/login/`, `app/auth/`, `proxy.ts` |
| 4 | Public site styling pass | `app/page.tsx`, `globals.css` |
| 5 | RSS feed at `/rss.xml` | new `app/rss.xml/route.ts` |
| 6 | Fly.io deploy | `Dockerfile`, `fly.toml`, `.github/workflows/deploy.yml` |

Each slice is a PR. ARCHITECTURE.md updates with the slice. NEARSTREAM.md decisions log gets an entry only when a load-bearing choice is made.

---

## Open architectural questions (carry forward)

- **List cost / caching.** `store.list()` does one `ListObjectsV2` + N parallel GETs every page render. Fine for slice 1–3 volumes (tens of entries), but unbounded. Slice 4 or 5 should add a cached read path — likely an in-process LRU keyed on the bucket's `LastModified` of the entries prefix.
- **R2 layout if entries grow.** Currently flat (`entries/{id}.json`). Tracked as a GitHub issue — likely move to `entries/YYYY/MM/{id}.json`.
- **Tag set.** `Code / Photo / Music / Writing` is the slice 1 set. Adding `Reading`, `Travel`, `Cooking` is one-line in `schemas/stream.ts` — defer until needed.
- **`StreamEntry.id`.** Currently `crypto.randomUUID()`. Slice 5 will need stable, sortable IDs for RSS — likely `ULID` or `${publishedAt}-${nanoid}`. If/when this changes, R2 keys change too.
- **`force-dynamic`.** Pragmatic for slice 1. Slice 4 or 5 should swap to `revalidatePath` only (already wired) and let pages cache between posts.
- **Magic-link single-use.** Slice 3 tokens are time-bound (15 min) but technically replayable inside that window — verifying single-use would require persisted state (an R2 key with the token's nonce, deleted on use). For a 1–5-person allowlist this is acceptable risk; revisit if the allowlist grows or the threat model changes.
- **CSRF on POST routes.** Right now `POST /api/stream` and `POST /auth/logout` are protected by the session cookie alone. Browsers default-block cross-site cookie sends with `SameSite=Lax`, so this is fine for form-posts initiated from same-origin pages. If a slice adds cross-origin posting (the reader posting back? an iOS shortcut?), revisit with a CSRF token or `SameSite=Strict`.
- **Form idempotency.** The `SubmitButton` client component disables itself on submit, which prevents double-clicks *when JS is on*. With JS off, a fast user could still double-submit and create two entries. A real fix is server-side: hidden idempotency token in the form, server stores submitted tokens (e.g. in an `idempotency/{token}` R2 key) and rejects repeats. Deferred — not worth the plumbing for a 1-user app.
