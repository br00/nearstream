# Architecture

How the code is laid out. Pairs with [`NEARSTREAM.md`](./NEARSTREAM.md), which holds philosophy + decisions. This file holds shape.

> **Status:** Phase 1 · Slice 2 (R2 storage) — durable storage via Cloudflare R2; no auth yet; no styling polish.

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
│   ├── store.ts           Store interface + InMemoryStore + env-driven picker
│   └── r2-store.ts        Cloudflare R2 implementation (aws4fetch, S3 API)
├── schemas/
│   └── stream.ts          StreamEntry typed primitive
├── .env.example           R2 credentials template
├── ARCHITECTURE.md        this file
├── NEARSTREAM.md          manifesto + lexicon + decisions
└── LICENSE                AGPL-3.0
```

## The data flow (slice 2)

```
  /studio                          /api/stream                           /
  ───────                          ───────────                           ─
  <form action="/api/stream" POST> parse form/json                       renders
   text + tag (radio)              validate (schema)                     store.list()
                                   store.add()  ──┐                       │
                                                  ▼                       ▼
                                          ┌────────────────────────────────┐
                                          │  store: R2Store | InMemoryStore │
                                          │   (picked at module load from  │
                                          │    process.env R2_* vars)      │
                                          └────────────────────────────────┘
                                                  │
                                                  ▼
                                   R2 bucket: entries/{id}.json (flat)
                                   add  = PUT  /entries/{id}.json
                                   list = ListObjectsV2 prefix=entries/
                                          then parallel GET each key
```

Three rules followed:

1. **Schemas are the single source of truth.** `schemas/stream.ts` exports the `StreamEntry` type *and* `DISCIPLINE_TAGS` (the runtime list used by the studio's tag radios) *and* `isDisciplineTag()` (the runtime guard used by the API). One file feeds the form, the route handler, and the public render. This is the discipline NEARSTREAM.md §05 calls "schema-as-code."

2. **Store is an interface, not a database.** `lib/store.ts` defines the `Store` interface and exports a single `store` instance. Which implementation it is — `InMemoryStore` (dev fallback) or `R2Store` (durable) — is decided once at module load by reading `R2_*` env vars. The rest of the app does not know or care.

3. **Public render is a server component.** `app/page.tsx` reads the store directly at request time. No client-side fetching, no API call from the browser. The `/api/stream` route exists for posting (and as a future read endpoint for the reader / RSS).

## Why these choices

- **No Sanity.** The studio is built into the app (NEARSTREAM.md §05: *"friends will not learn a second tool with a second login."*).
- **No Vercel-specific APIs.** Next.js standard features only — `revalidatePath`, route handlers, server components. The codebase must run on Fly.io / Hetzner / anywhere (NEARSTREAM.md §05: *"Vercel is a deployment target, not a dependency."*).
- **R2 via `aws4fetch`, not `@aws-sdk/client-s3`.** R2 speaks S3 — but the AWS SDK is ~1.6 MB across ~120 packages, almost all of it features (DynamoDB integrations, retry strategies, paginators) we don't need. `aws4fetch` is a single file: SigV4 signing + `fetch`. Edge-runtime compatible, future-proof for slice 6 (Fly.io).
- **Flat key layout: `entries/{id}.json`.** Decided in slice 2; documented in NEARSTREAM.md §05. Date partitioning is filed as a deferred follow-up (see [GitHub issue](#) — opened with this PR).
- **`force-dynamic` on `/`.** Prevents Next from caching the timeline at build. Slice 5 (RSS) will revisit caching properly.
- **Form posts, not client JS.** Studio works with JS off. Cheaper to maintain, friendlier to mobile, and means the API is just a route — same shape will serve the reader and RSS later.

## What's next per slice

| Slice | Adds | Touches |
|---|---|---|
| 1 | skeleton end-to-end loop | `app/`, `lib/store.ts`, `schemas/stream.ts` |
| 2 (this) | Cloudflare R2 storage backend | new `lib/r2-store.ts`, `.env.example`, store picker |
| 3 | Resend magic-link auth, gate `/studio` | `lib/auth.ts`, middleware |
| 4 | Public site styling pass | `app/page.tsx`, `globals.css` |
| 5 | RSS feed at `/rss.xml` | new `app/rss.xml/route.ts` |
| 6 | Fly.io deploy | `Dockerfile`, `fly.toml`, `.github/workflows/deploy.yml` |

Each slice is a PR. ARCHITECTURE.md updates with the slice. NEARSTREAM.md decisions log gets an entry only when a load-bearing choice is made.

---

## Open architectural questions (carry forward)

- **List cost / caching.** `store.list()` does one `ListObjectsV2` + N parallel GETs every page render. Fine for slice 1–2 volumes (tens of entries), but unbounded. Slice 4 or 5 should add a cached read path — likely an in-process LRU keyed on the bucket's `LastModified` of the entries prefix.
- **R2 layout if entries grow.** Currently flat (`entries/{id}.json`). Tracked as a GitHub issue for revisit when list cost becomes real — likely move to date-partitioned (`entries/YYYY/MM/{id}.json`) for cheap recent-window queries.
- **Tag set.** `Code / Photo / Music / Writing` is the slice 1 set. Adding `Reading`, `Travel`, `Cooking` is one-line in `schemas/stream.ts` — defer until needed.
- **`StreamEntry.id`.** Currently `crypto.randomUUID()`. Slice 5 will need stable, sortable IDs for RSS — likely move to `ULID` or `${publishedAt}-${nanoid}`. If/when this changes, R2 keys change too.
- **`force-dynamic`.** Pragmatic for slice 1. Slice 4 or 5 should swap to `revalidatePath` only (already wired) and let pages cache between posts.
