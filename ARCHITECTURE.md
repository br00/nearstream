# Architecture

How the code is laid out. Pairs with [`NEARSTREAM.md`](./NEARSTREAM.md), which holds philosophy + decisions. This file holds shape.

> **Status:** Phase 1 · Slice 6 (production deploy on Vercel) — Phase 1 is now end-to-end live: durable R2 storage; magic-link auth on `/studio`; pure-mono Nearstream chrome; `/design` is the spec; reading stays public; RSS 2.0 at `/rss.xml`; production deploy on Vercel (interim — see NEARSTREAM.md §05 dated 2026-05-27). The Vercel deploy is the host only; the codebase still avoids Vercel-specific APIs so it stays portable to Fly / Hetzner / anywhere.

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
│   ├── design/            /design — Nearstream chrome spec page (palette, type, components)
│   ├── rss.xml/route.ts   public RSS 2.0 feed of all stream entries
│   ├── _components/       Nearstream chrome design system (see below)
│   ├── page.tsx           public stream timeline (server component) — entries carry id={`entry-${id}`}
│   └── layout.tsx         root layout, fonts, metadata, RSS auto-discovery link
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

## Design system (Nearstream chrome layer)

`app/_components/` is the **Nearstream chrome** layer — the platform identity that every Nearstream instance carries. NEARSTREAM.md §02 distinguishes the *reader* (Nearstream's territory) from the *site* (the user's territory). These components belong to the Nearstream side. User site templates (Phase 2) will live separately and may use their own palette + components.

```
app/_components/
├── nearstream-mark.tsx    constellation logo (NearstreamMark) + lockup (NearstreamLockup)
├── page-shell.tsx         top nav (lockup + optional right-nav) + footer ({year}_)
├── kicker.tsx             small-caps mono label ("Stream", "Studio", form labels)
├── button.tsx             outlined ghost button + buttonClasses helper
├── submit-button.tsx      client-component variant that auto-disables on form submit
├── input.tsx              bottom-border text input
├── textarea.tsx           bordered textarea
└── tag-chip.tsx           TagChip (display) + TagRadio (selectable)
```

The `/design` route is the live spec — color swatches, type scale, brand mark sizes, every component in every state. It is the single source of truth: pages compose components, `/design` shows components, components own their styles.

**Tokens** (in `app/globals.css`):
- `--background: #000` · `--foreground: #e4e4e7` · `--muted: #a1a1aa` · `--muted-soft: #71717a` · `--border: #27272a`
- No accent color, no light mode. The palette is the deployed landing site at `nearstream-khaki.vercel.app` ported verbatim, with `muted` lightened one step (from `#71717a` to `#a1a1aa`) so app text reads at functional contrast — the landing-site whisper stays available as `muted-soft`.

## Why these choices

- **No Sanity.** Studio is built into the app (NEARSTREAM.md §05: *"friends will not learn a second tool with a second login."*).
- **No Vercel-specific APIs.** Standard Next features only — `revalidatePath`, route handlers, server components, Proxy. Same code will run on Fly.io / Hetzner.
- **R2 via `aws4fetch`.** Single-file SigV4 signer + `fetch`. AWS SDK is ~1.6 MB of features we don't need.
- **Auth via raw HMAC, not `jose` / `next-auth` / Lucia.** Same ethos. ~30 lines of Web Crypto. Standard auth libraries assume a multi-provider, refresh-token, RBAC world Nearstream will never have.
- **Allowlist in env var.** Adding a friend = redeploy. Friction by design.
- **Magic-link login leaks nothing.** The login page always shows "if that email is on the allowlist, a link is on its way" — same response either way. No allowlist enumeration.
- **Resend via `fetch`, not the SDK.** Dev mode (no `RESEND_API_KEY` / `RESEND_FROM`) prints the link to console — same fallback shape as the R2 picker in slice 2.
- **Form posts, not client JS.** Login + studio both work with JS off.
- **`force-dynamic` on `/` and `/rss.xml`.** Prevents Next from caching the timeline or feed at build. Caching is still an open question (see below).
- **RSS via raw template string, no library.** Same ethos as auth and R2: a few well-escaped lines of XML beat a dependency. `escapeXml` covers attribute + text contexts; `<description>` uses `<![CDATA[…]]>` with a `]]>` splitter so entry text is passed through verbatim. Title is derived from the first line of `text`, truncated to 80 chars.
- **Item links are anchors on `/`, not per-entry permalink pages.** Entries render with `id={`entry-${entry.id}`}` on the timeline; the feed's `<link>` is `${SITE_URL}/#entry-${entry.id}`. Real per-entry routes belong to a later slice (Phase 2 library primitives will introduce per-entry URLs).

## What's next per slice

| Slice | Adds | Touches |
|---|---|---|
| 1 | skeleton end-to-end loop | `app/`, `lib/store.ts`, `schemas/stream.ts` |
| 2 | Cloudflare R2 storage backend | `lib/r2-store.ts`, `.env.example`, store picker |
| 3 | Resend magic-link auth, gate `/studio` | `lib/auth.ts`, `lib/email.ts`, `app/login/`, `app/auth/`, `proxy.ts` |
| 4 | Nearstream identity + chrome design system | `app/_components/`, `app/design/`, `globals.css`, all three pages refactored |
| 5 | RSS feed at `/rss.xml` | new `app/rss.xml/route.ts`, `layout.tsx` (alternates + metadataBase), `page.tsx` (entry anchors), `.env.example` (`NEARSTREAM_SITE_URL`) |
| 6 (this) | Production deploy on Vercel | NEARSTREAM.md §05 + §10 updates, ARCHITECTURE.md deploy section, Vercel project + env vars + GitHub auto-deploy |

Each slice is a PR. ARCHITECTURE.md updates with the slice. NEARSTREAM.md decisions log gets an entry only when a load-bearing choice is made.

---

## Deploy shape (slice 6)

```
  GitHub                  Vercel                     Cloudflare R2
  ───────                 ──────                     ─────────────
  br00/nearstream         (one project, linked       bucket: nearstream
  push to main      ──▶   to the repo)         ──▶   entries/{id}.json
                          auto-build, deploy
                          on every main push
                                  │
                                  ▼
                          *.vercel.app URL
                          (+ custom domain later)
                                  │
                                  ▼
                          Resend (magic-link
                          email out)
```

**Env vars (set in Vercel project settings, mirrored in `.env.local` for dev):**

| Var | Purpose | Source |
|---|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account ID | Cloudflare → R2 → Overview |
| `R2_ACCESS_KEY_ID` | R2 token (Object R/W on bucket) | Cloudflare → R2 → Manage R2 API Tokens |
| `R2_SECRET_ACCESS_KEY` | matching secret | shown once on token creation |
| `R2_BUCKET` | bucket name | the bucket we created in slice 2 |
| `AUTH_SECRET` | HMAC key for sessions + magic links | `openssl rand -base64 32` |
| `ALLOWED_EMAILS` | comma-separated allowlist | hand-curated |
| `RESEND_API_KEY` | Resend token | resend.com → API Keys |
| `RESEND_FROM` | sender address | `onboarding@resend.dev` (interim) or verified-domain address |
| `NEARSTREAM_SITE_URL` | absolute origin for RSS + metadata | the prod URL (e.g. `https://nearstream-xxx.vercel.app` or custom domain) |

**No `vercel.json`.** Default Next.js detection handles the build (`next build`) and output. Anything in `vercel.json` would be a Vercel-shaped configuration step we'd have to undo on Fly later.

**Deploy on push.** Vercel watches `main` by default. Branches (slice/*) get preview deployments — useful for end-to-end smoke testing without merging.

**Custom domain (deferred to a follow-up slice).** When ready: add the domain in Vercel → Domains, repoint DNS (Cloudflare Registrar / Namecheap) to Vercel's A/AAAA records, then update `NEARSTREAM_SITE_URL` env var. Also verify the same domain in Resend so magic-links send from `hello@<domain>` instead of `onboarding@resend.dev`.

---

## Open architectural questions (carry forward)

- **List cost / caching.** `store.list()` does one `ListObjectsV2` + N parallel GETs every page render — *and* every `/rss.xml` request. Fine for slice 1–5 volumes (tens of entries), but unbounded. A later slice should add a cached read path — likely an in-process LRU keyed on the bucket's `LastModified` of the entries prefix, with `revalidatePath('/')` + `revalidatePath('/rss.xml')` from the POST route to bust it on new entries.
- **R2 layout if entries grow.** Currently flat (`entries/{id}.json`). Tracked as a GitHub issue — likely move to `entries/YYYY/MM/{id}.json`.
- **Tag set.** `Code / Photo / Music / Writing` is the slice 1 set. Adding `Reading`, `Travel`, `Cooking` is one-line in `schemas/stream.ts` — defer until needed.
- **`StreamEntry.id`.** Currently `crypto.randomUUID()`. Slice 5 did not need to change this — the store already sorts by `publishedAt` and the feed `<guid>` is stable per entry regardless of ordering. Revisit when (a) pagination requires cursor IDs, or (b) we want lexicographically sortable R2 keys.
- **`force-dynamic`.** Pragmatic for slice 1. A later slice should swap to `revalidatePath` only (already wired in `POST /api/stream`) and let `/` and `/rss.xml` cache between posts.
- **Magic-link single-use.** Slice 3 tokens are time-bound (15 min) but technically replayable inside that window — verifying single-use would require persisted state (an R2 key with the token's nonce, deleted on use). For a 1–5-person allowlist this is acceptable risk; revisit if the allowlist grows or the threat model changes.
- **CSRF on POST routes.** Right now `POST /api/stream` and `POST /auth/logout` are protected by the session cookie alone. Browsers default-block cross-site cookie sends with `SameSite=Lax`, so this is fine for form-posts initiated from same-origin pages. If a slice adds cross-origin posting (the reader posting back? an iOS shortcut?), revisit with a CSRF token or `SameSite=Strict`.
- **Form idempotency.** The `SubmitButton` client component disables itself on submit, which prevents double-clicks *when JS is on*. With JS off, a fast user could still double-submit and create two entries. A real fix is server-side: hidden idempotency token in the form, server stores submitted tokens (e.g. in an `idempotency/{token}` R2 key) and rejects repeats. Deferred — not worth the plumbing for a 1-user app.
