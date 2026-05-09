# Architecture

How the code is laid out. Pairs with [`NEARSTREAM.md`](./NEARSTREAM.md), which holds philosophy + decisions. This file holds shape.

> **Status:** Phase 1 · Slice 1 (skeleton) — in-memory store, no auth, no styling polish.

---

## Directory shape

```
nearstream/
├── app/                   Next.js App Router routes
│   ├── api/stream/        POST = add entry · GET = list entries (JSON)
│   ├── studio/            posting UI (server-rendered form)
│   ├── page.tsx           public stream timeline (server component)
│   └── layout.tsx         root layout, fonts, metadata
├── lib/
│   └── store.ts           Store interface + in-memory impl
├── schemas/
│   └── stream.ts          StreamEntry typed primitive
├── ARCHITECTURE.md        this file
├── NEARSTREAM.md          manifesto + lexicon + decisions
└── LICENSE                AGPL-3.0
```

## The data flow (slice 1)

```
  /studio                                 /api/stream                 /
  ───────                                 ───────────                 ─
  <form action="/api/stream" POST>  →     parse form/json    →        renders
   text + tag (radio)                     validate (schema)            store.list()
                                          store.add()
                                          revalidatePath("/")
                                          303 → /
```

Three rules followed:

1. **Schemas are the single source of truth.** `schemas/stream.ts` exports the `StreamEntry` type *and* `DISCIPLINE_TAGS` (the runtime list used by the studio's tag radios) *and* `isDisciplineTag()` (the runtime guard used by the API). One file feeds the form, the route handler, and the public render. This is the discipline NEARSTREAM.md §05 calls "schema-as-code."

2. **Store is an interface, not a database.** `lib/store.ts` exports a `Store` interface; slice 1 implements it in-memory. Slice 2 swaps in Cloudflare R2 — no other file changes. Future-self protection against picking the wrong storage.

3. **Public render is a server component.** `app/page.tsx` reads the store directly at request time. No client-side fetching, no API call from the browser. The `/api/stream` route exists for posting (and as a future read endpoint for the reader / RSS).

## Why these choices

- **No Sanity.** The studio is built into the app (NEARSTREAM.md §05: *"friends will not learn a second tool with a second login."*).
- **No Vercel-specific APIs.** Next.js standard features only — `revalidatePath`, route handlers, server components. The codebase must run on Fly.io / Hetzner / anywhere (NEARSTREAM.md §05: *"Vercel is a deployment target, not a dependency."*).
- **`force-dynamic` on `/`.** Prevents Next from caching the timeline at build. Slice 5 (RSS) will revisit caching properly.
- **Form posts, not client JS.** Studio works with JS off. Cheaper to maintain, friendlier to mobile, and means the API is just a route — same shape will serve the reader and RSS later.

## What's next per slice

| Slice | Adds | Touches |
|---|---|---|
| 1 (this) | skeleton end-to-end loop | `app/`, `lib/store.ts`, `schemas/stream.ts` |
| 2 | Cloudflare R2 storage backend | new `lib/r2-store.ts`, env config |
| 3 | Resend magic-link auth, gate `/studio` | `lib/auth.ts`, middleware |
| 4 | Public site styling pass | `app/page.tsx`, `globals.css` |
| 5 | RSS feed at `/rss.xml` | new `app/rss.xml/route.ts` |
| 6 | Fly.io deploy | `Dockerfile`, `fly.toml`, `.github/workflows/deploy.yml` |

Each slice is a PR. ARCHITECTURE.md updates with the slice. NEARSTREAM.md decisions log gets an entry only when a load-bearing choice is made.

---

## Open architectural questions (carry forward)

- **Storage layout in R2.** `entries/{id}.json` flat? Or partitioned by date prefix (`entries/2026/05/{id}.json`)? Decide in slice 2 — affects list cost and pagination.
- **Tag set.** `Code / Photo / Music / Writing` is the slice 1 set. Adding `Reading`, `Travel`, `Cooking` is one-line in `schemas/stream.ts` — defer until needed.
- **`StreamEntry.id`.** Currently `crypto.randomUUID()`. Slice 5 will need stable, sortable IDs for RSS — likely move to `ULID` or `${publishedAt}-${nanoid}`.
- **`force-dynamic`.** Pragmatic for slice 1. Slice 4 or 5 should swap to `revalidatePath` only (already wired) and let pages cache between posts.
