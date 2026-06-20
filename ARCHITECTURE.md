# Architecture

How the code is laid out. Pairs with [`NEARSTREAM.md`](./NEARSTREAM.md), which holds philosophy + decisions. This file holds shape.

> **Status:** Phase 3 shipped + Tier-1 polish + per-post privacy + slice 23 (marks, modes, structured manifesto) + slice 25 (studio split) live on `alessandroborelli.it` and `nearstream.app`. The instance is a real shared room: friends sign in by email, pick a handle and an animated profile mark, get their own site at `nearstream.app/{handle}` (or their own custom domain when they have one). Tenant pages, RSS, and the reader all enforce a `public` / `private` visibility flag per post. Authed surfaces are three URLs (one intent each): `/studio` posts, `/reader` reads + manages friends, `/settings` profile + export + sign-out. The mid-2026 "stretch" goals from `NEARSTREAM.md §07` — multi-tenant + reader at minimum — are done. Next chunks live at the bottom of this doc under "What's next per slice"; the manifesto's Phase 6 (federation, replies, ActivityPub bridge, POSSE) is the long arc.
>
> Most recent shipped (newest first):
> - **Slice 30 — reader perf (thumbnails, shimmer, auto-refresh).** Federico and Gosia's first pictures landed in the room, but iPhone-photo originals (4032×3024, multi-MB) were stalling the reader: first paint felt frozen, the layout jumped when bytes finally arrived, and "Refresh all" was a button you had to remember to tap. Three fixes: (1) RSS extension `<nearstream:thumbnail url width height>` added to inventory items in `app/[handle]/rss.xml/route.ts` — dimensions derived from the original + the 600px cap (matches `THUMB_MAX_DIM` in inventory-upload-form.tsx). Feed parser in `lib/feed-parser.ts` reads it via `pickNearstreamThumb`; `FeedEntryImage` in `schemas/feed-entry.ts` gains `thumbUrl/thumbWidth/thumbHeight`. Reader uses thumb when present, falls back to original for arbitrary feeds. ~95% byte reduction for picture cards. (2) New client component `app/_components/reader-picture.tsx` reserves the layout slot with `width`/`height` attrs + `aspect-[4/3]`, shows a `.shimmer-sweep` placeholder (90deg gradient, 4% white, 1.6s sweep — defined in `globals.css`) behind the image, cross-fades the image in on `load` (and on `error` so broken images don't shimmer forever). (3) New client component `app/_components/reader-refresh.tsx` replaces the old POST-form Refresh All button — on mount, if any source is stale (>5 min since `lastFetchedAt`), it POSTs `/api/sources/refresh` and `router.refresh()`s. iOS Safari pull-to-refresh works for free since PTR is just a page reload that re-runs the staleness check. Label flips to "Refreshing…" while in flight. **Store change** in `lib/feed-entry-store.ts`: `upsertMany` now always overwrites instead of skipping existing entries — slice 30's schema addition would otherwise never reach the picture entries Alessandro already had in his local store. Tradeoff: re-PUT per entry per refresh (Class A op, ~negligible at small-instance scale); the R2 store also drops its old HEAD-then-skip pattern which removes a round trip per entry.
> - **Slice 29 — mobile lab + app-density chrome.** The "too weby, too small" complaint from Alessandro's own usage gets a three-surface pass. `app/design/mobile-lab/page.tsx` is a public design surface (no-index) with nine prototypes — three directional variants each of bottom nav, reader feed, and studio composer — rendered in 375px black viewports at life size so you can read them on an actual iPhone. The picked directions land on the real pages: `<AuthedNavBottom>` switches from a 1px dot + 9.5px label over py-3 to a 2px indicator bar + 11px label over py-4 with pb-[28px] iOS safe-area padding (clears the 44pt tap minimum and the home-indicator gesture bar). Reader entries on `/reader` move to 15px font-medium author name + mode pill, 10.5px date stamp, 17px body for notes, 20px font-medium essay titles with a mono "Read essay →" affordance, and picture entries `-mx-6` bleed past the page gutter for edge-to-edge images. Studio collapses from four-stacked-forms to a compose-first picker: new client component `app/_components/studio-composer.tsx` renders a horizontally-scrollable Stream / Picture / Essay / Letter chip row; tapping a chip swaps the form below with no reload. Stream is the default; if a form action redirects back with `letter-error` or `essay-error`, the composer auto-selects that primitive so the error renders next to the form that produced it. All four POST endpoints (`/api/stream`, `/api/letter`, `/api/essays`, inventory upload) unchanged — the wiring is intact, only the chrome moved. `/design` gains a Logo lab + Mobile lab card row up top.
> - **Slice 28 — tester feedback round 1.** Closes the social loop. Signed-in visitors to `nearstream.app/{handle}` see an `Add {first-name} as friend` button under the hero; it POSTs `handle` to `app/api/friends/follow/route.ts`, which resolves the handle via `userStore.getByHandle`, derives the tenant's `siteUrl` + `feedUrl` from `tenantAbsoluteBase`, and adds a Source to the visitor's reader (idempotent — already-following counts as success). The tenant page also probes the visitor's source list so it can render `✓ Following · Open reader →` instead of the button. `POST /api/sources` now auto-derives `siteUrl` by stripping `/rss.xml` (or `/feed.xml`, `/atom.xml`) from the feed URL when none is provided, so the friends list at `/reader/friends` can render each friend's name as a clickable link to their site (testers were arriving at friends with no in-product way to reach their profile). Onboarding microcopy stops saying "this is permanent" with no recourse — instead says "your handle is the only permanent thing here" + a sub-line clarifying display name and profile mark are editable in Settings. `/about` gains a one-sentence hero ("Nearstream is a quieter way to share with people you actually know") before the experience section; the technical "Under the hood" section is now collapsed in a `<details>` block and inline code references use a `TechBit` component (bordered, soft background) instead of bare mono text so non-technical visitors don't read it as a broken stylesheet. `/manifesto` gets a "Heads up" banner up top with a link back to `/about` for the one-minute read plus quick-jump nav to all ten sections (`#sec-NN` anchors added to `Section`). Round-1 testers: Federico bounced off vocabulary + missing app; Margherita "confused"; Gosia bounced off the manifesto's depth + thought the code block was broken.
> - **Slice 25 — studio split.** `/studio` shrinks to posting only (Letter / Stream / Essay / Inventory). Friend-graph management moves to `/reader/friends` (new page) with a `Friends · N →` pill on `/reader` linking to it. Profile mark + display name + export + host tools + sign-out move to `/settings` (new top-level route). Top nav across the three authed surfaces is two cross-links: from `/studio` → Reader + Settings; from `/reader` → Studio + Settings; from `/settings` → Studio + Reader. The friend-add empty state on `/reader` reads "Add a friend →" not "Add a source →". User-facing label "Following" never appears; the codebase keeps `sourceStore` internally but the surface says "Friends." Reserved handles include `settings` + `friends`. The split is the recovery from Federico's "I got a bit lost" — eight sections on one page collapses to three pages with single intents.
> - **Slice 23 — marks, modes, structured manifesto, delete/empty-state polish.** Animated `>` mark (helix backbone + tiny dust satellites, slowed cadence) lives in `app/_components/site/nearstream-mark-animated.tsx` and renders on the landing hero and the `/reader` empty state; `/design/logo-lab` keeps the parents (Helix, Swarm) plus a PNG snapshot tool for static frames. Ten profile-mark variants (`lib/profile-mark-variants.ts` + `app/_components/site/profile-mark.tsx` + `profile-mark-picker.tsx`) replace profile photos — picked on `/onboarding`, editable in `/studio` Profile, persisted as `User.profileMark`, rendered at the top of every tenant home (host included). Stream tag is a **mode** (`making` / `taking in` / `being`) — see `schemas/stream.ts` and `app/_components/mode-radio.tsx`; legacy discipline strings still render but fail validation so an edit forces re-selection. `/manifesto` is a structured Tailwind page (`app/manifesto/page.tsx`) — NEARSTREAM.md remains the internal working doc. `/studio` shows a one-paragraph welcome on first visit; the three delete routes redirect to the tenant path (no more 404 after deleting your last item); empty Stream section on the tenant home is hidden instead of rendering "no notes yet."
> - **Slice 21 — per-post privacy.** Two-level `public` / `private` flag on Stream, Essay, Inventory. New `schemas/visibility.ts` + `VisibilityRadio` chrome component. Tenant pages filter non-public entries from non-owners; detail pages `notFound()` (so the slug existence isn't even leaked); RSS omits private items entirely. Owner-only "PRIVATE" badge on stream + library list rows. Letter is host-broadcast only and stays public. Three-level (`friends`) plan documented in the PR description as a follow-up that needs a friend-graph primitive + instance-authenticated tenant rendering.
> - **Tier-1 polish round.** `noindex` meta on every tenant page (soft-privacy default). Editable `displayName` via a Profile section in `/studio`. Self-export — "Download all my content" returns a ZIP with `nearstream-export.json` + every inventory image as bytes under `media/` + a `README.txt`. Edit existing Stream / Essay / Inventory entries via dedicated `/studio/{primitive}/{id|slug}/edit` pages; slug + image + publishedAt + id are preserved across edits so URLs and RSS guids never change.
> - **Slice 19 — multi-tenant base.** New `User` primitive (`schemas/user.ts` + `lib/user-store.ts` at R2 prefix `users-meta/`). Auth session carries `userId`; first sign-in finds-or-creates a user and routes through `/onboarding` to pick handle + display name. All seven content stores accept `userId` and namespace R2 at `users/{userId}/...`. Public routes moved from the root into `app/[handle]/...`. A hostname-aware proxy reads `TENANT_DOMAINS` and rewrites custom-domain requests internally. Tenant-page links generate canonical URLs natively via a `tenantBase()` helper (no per-request redirect dance). `nearstream.app/` is the instance landing for signed-out visitors. One-shot `POST /api/admin/migrate-host` copies the host's legacy R2 keys.

---

## Directory shape

```
nearstream/
├── app/                   Next.js App Router routes
│   ├── api/
│   │   ├── stream/                POST = add entry (gated) · GET = list entries (public)
│   │   ├── essays/                POST = publish essay (gated) · GET = list essays (public)
│   │   ├── inventory/
│   │   │   ├── route.ts           POST = save inventory metadata (gated, JSON) · GET = list items (public)
│   │   │   └── upload-url/route.ts POST = mint a presigned R2 PUT URL for the browser (gated)
│   │   ├── media/[key]/route.ts   GET = server-proxy stream of an image from R2 (public, immutable-cache)
│   │   ├── letter/route.ts        POST = update the home-page Letter (gated, form or JSON) · GET = current Letter (public)
│   │   └── sources/
│   │       ├── route.ts                    POST = add a reader source (gated) · GET = list (gated)
│   │       ├── refresh/route.ts            POST = refresh every source sequentially (gated)
│   │       └── [id]/
│   │           ├── delete/route.ts         POST = delete a source + cascade its feed entries (gated)
│   │           └── refresh/route.ts        POST = refresh a single source (gated)
│   ├── auth/
│   │   ├── callback/      GET: verify magic-link token → set session → redirect
│   │   └── logout/        POST: clear session cookie
│   ├── login/
│   │   ├── page.tsx       email entry form
│   │   └── actions.ts     server action: send magic link
│   ├── studio/            posting UI — gated, holds Letter + Stream + Essay + Inventory forms (Letter first)
│   ├── design/            /design — Nearstream chrome spec page (palette, type, components)
│   ├── library/
│   │   ├── page.tsx                       public Library hub — essays + inventory mixed by date
│   │   ├── [slug]/page.tsx                public per-essay page — renders markdown body via `marked`
│   │   └── inventory/
│   │       ├── page.tsx                   public Inventory archive — grid of items with thumbnails
│   │       └── [slug]/page.tsx            public per-item page — full image + metadata
│   ├── stream/page.tsx    public Stream archive (the full timeline lives here; the home shows only the most recent 4)
│   ├── reader/page.tsx    gated reader home — chronological feed of all source entries with note / essay / picture per-type shapes
│   ├── rss.xml/route.ts   public RSS 2.0 feed of all stream entries + essays + inventory
│   ├── _components/
│   │   ├── (chrome bits) Nearstream platform identity — PageShell, Kicker, TagChip, etc. (see "Design system" below)
│   │   ├── inventory-upload-form.tsx  client component for the presigned-URL upload flow
│   │   └── site/
│   │       └── human-circle.tsx       Alessandro's "moving.points" port — client component, inline Perlin 3D noise (no deps). USER-TERRITORY: lives under `_components/site/` to separate from platform chrome.
│   ├── page.tsx           public Notebook home — Human Circle masthead, Letter, then Stream/Pictures/Essays/Elsewhere as quiet sections
│   ├── globals.css        tokens + `.prose-essay` styles for rendered markdown
│   └── layout.tsx         root layout, fonts, metadata, RSS auto-discovery link
├── lib/
│   ├── store.ts           Stream store: interface + InMemoryStore + env-driven picker
│   ├── r2-store.ts        Stream Cloudflare R2 implementation (aws4fetch, S3 API)
│   ├── r2-client.ts       Shared aws4fetch wrapper with retry-once on transient TLS errors
│   ├── essay-store.ts     Essay store: interface + InMemory + R2 (mirror of stream store, key prefix `library/essays/`)
│   ├── inventory-store.ts Inventory store: interface + InMemory + R2 (prefix `library/inventory/`)
│   ├── media-store.ts     Media (image) store: presigned R2 PUT URLs for upload, server-proxy stream for read (prefix `media/`)
│   ├── letter-store.ts    Single-record Letter store. R2 key: `site/letter.json`. `get()` returns null if not set yet; `set()` overwrites with a fresh `updatedAt`.
│   ├── source-store.ts    Reader Source store: interface + InMemory + R2 (prefix `reader/sources/`). Holds the local friend graph.
│   ├── feed-parser.ts     Pure RSS 2.0 + Atom 1.0 → `NewFeedEntry[]`. Built on `fast-xml-parser`. Tolerant of malformed input.
│   ├── feed-fetcher.ts    HTTP fetch + conditional GET (ETag / Last-Modified) + parse + entry upsert + Source state update. `refreshSource(id)` and `refreshAllSources()`.
│   ├── feed-entry-store.ts Reader FeedEntry store: interface + InMemory + R2 (prefix `reader/feed/{sourceId}/`). Stable entry IDs from SHA-256 of `sourceId+guid` — refetches dedupe.
│   ├── slug.ts            shared `slugify()` + `isValidSlug()` used by essay + inventory schemas
│   ├── auth.ts            HMAC token sign/verify, session cookie, allowlist
│   └── email.ts           Resend send + dev console fallback
├── schemas/
│   ├── stream.ts          StreamEntry typed primitive
│   ├── essay.ts           Essay typed primitive (re-exports slug helpers from `lib/slug.ts`)
│   ├── inventory.ts       InventoryItem typed primitive + `INVENTORY_STATUSES` + `isInventoryStatus()`
│   ├── letter.ts          Letter typed primitive — `{ date, body, updatedAt }`. Free-form date string so the host can be expressive ("today", "midsummer").
│   ├── source.ts          Reader Source typed primitive — `{ id, name, feedUrl, siteUrl?, addedAt, lastFetchedAt?, etag?, lastModified?, lastError? }`. Plus `isValidFeedUrl()` helper.
│   └── feed-entry.ts      Reader FeedEntry typed primitive — normalized RSS/Atom item with `{ id, sourceId, guid, url, publishedAt, title?, authorName?, body?, excerpt?, type, image?, fetchedAt }`. `type` is `"unknown"` until slice 17 detects it.
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

## The image upload flow (slice 9)

```
  /studio (browser)                /api/inventory/upload-url       R2 bucket
  ─────────────────                ─────────────────────────       ─────────
  user picks file                  (gated, JSON)                   (Cloudflare,
   │                                  │                             CORS enabled)
   ├── 1. POST { contentType, size }──▶
   │                                  │
   │                                  ├── mediaStore.getUploadUrl()
   │                                  │   validates contentType (allowlist)
   │                                  │   generates UUID key
   │                                  │   aws4fetch sign({ signQuery: true })
   │                                  │   → presigned URL valid 5 min
   │   { uploadUrl, key } ◀──────────┤
   │                                                                 │
   ├── 2. PUT file directly (XMLHttpRequest, progress events) ──▶ media/{key}
   │                                                                 │
   │                                  /api/inventory                 │
   │                                  ──────────────                 │
   │                                  (gated, JSON)                  │
   ├── 3. POST { title, image: { key, contentType, size }, … } ──▶  │
   │                                  │                              │
   │                                  ├── inventoryStore.add()       │
   │                                  │   PUT library/inventory/{id}.json
   │                                  │   revalidatePath /library, /library/inventory
   │   redirect /library/inventory/{slug} ◀────────┤
   │
   /library/inventory/{slug} (browser)              /api/media/{key}              R2 bucket
   ──────────────────────────────────              ────────────────              ─────────
   server-rendered, includes <img                  (public, server-proxy)
     src="/api/media/{key}">                          │
                                                      ├── mediaStore.getImage()
                                                      │   GET media/{key} via aws4fetch
                                                      │   Cache-Control: immutable, 1yr
                                                      │   stream body back
                                          image ◀─────┤
```

The upload path bypasses Vercel's 4.5 MB function body limit because the bytes go *directly browser ⇄ R2*. The read path uses a server-proxy so the bucket can stay private (no public R2 domain needed).

## Rules followed

1. **Schemas are the single source of truth.** `schemas/stream.ts` exports the `StreamEntry` type *and* `DISCIPLINE_TAGS` *and* `isDisciplineTag()`. One file feeds the form, the route handler, and the public render. ("schema-as-code" — NEARSTREAM.md §05.)

2. **Store is an interface, not a database.** `lib/store.ts` picks `InMemoryStore` or `R2Store` at module load from `R2_*` env vars. The rest of the app doesn't know.

3. **Auth is one file, no SDK.** `lib/auth.ts` contains the entire auth surface: HMAC sign/verify, magic-link token, session cookie, allowlist. Web Crypto only — no `jose`, no `next-auth`. The Resend client in `lib/email.ts` is `fetch` against `api.resend.com`.

4. **Optimistic check + real check.** `proxy.ts` does a cheap cookie-presence check on every `/studio/*` request (no HMAC, no DB — runs on prefetches). `getSession()` in the page / route does the real HMAC verify. Standard Next 16 pattern.

5. **Public render is a server component.** `app/page.tsx` reads the store directly at request time. No client-side fetching, no API call from the browser. `/api/stream` exists for posting and for future readers / RSS.

## Design system (Nearstream chrome layer) + site templates

`app/_components/` is the **Nearstream chrome** layer — the platform identity that every Nearstream instance carries. NEARSTREAM.md §02 distinguishes the *reader* (Nearstream's territory) from the *site* (the user's territory). These components belong to the Nearstream side.

**Site-template components** live in `app/_components/site/` — currently Alessandro's only (the `HumanCircle` port of his moving.points sketch). When Phase 3 introduces multi-tenancy, per-user templates can move into per-user directories or a registry. Site components inherit the global palette tokens so they compose with chrome without color clashes.

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

- **The home page is a *site template*, not a feed.** `/` reads as a personal homepage from before social media: animated Human Circle + name, then a dated/signed Letter, then four quiet sections (Stream / Pictures / Essays / Elsewhere) with at most 4–6 items each. Each section label is a `<Link>` to the full archive (`/stream`, `/library/inventory`, `/library`). The home cannot doom-scroll — it ends. The full Stream timeline moved to `/stream`. This layout shape is the result of converging on "what would I want my site to feel like" through ~12 prototypes against three tests: not Twitter (Mixed-feed failed Gosia's "can't stay more than 1 min"), not Squarespace (snap-paginated codex failed because polish + control reads as marketing), and not naveen.com purity (text-only loses the photographer-as-host first impression). The result: text-shaped lists with photos *available* (via small thumbnail rows) but not *displayed* on the home.
- **The Letter is the highest-leverage editorial slot.** A dated, signed prose block at the top of the home. Editable from `/studio` (first form, before Stream/Essay/Inventory) because it changes most often — when Alessandro's focus changes, he edits the Letter. Single-record store (`site/letter.json`) — there is only ever one current letter. The `updatedAt` is set by the store; the displayed date is a free-form string the host can write expressively ("today", "midsummer", or a real date). The home renders nothing for an unset Letter — graceful empty state.
- **Site templates live in `app/_components/site/`.** Distinct from `app/_components/` (Nearstream chrome). `HumanCircle` is the only one so far — Alessandro's port of his moving.points sketch. Phase 3 multi-tenancy may move per-user templates into per-user directories. For now, single-user, single template, lives next to chrome but logically separate.
- **No Sanity.** Studio is built into the app (NEARSTREAM.md §05: *"friends will not learn a second tool with a second login."*).
- **No Vercel-specific APIs.** Standard Next features only — `revalidatePath`, route handlers, server components, Proxy. Same code will run on Fly.io / Hetzner.
- **Delete is signed-in-only, inline on the public list/detail pages, via tiny POST forms.** No "manage" dashboard, no API DELETE method (HTML forms can't issue it). `DeleteButton` is a 20-line client component that wraps a `<form action method="POST">` and adds `confirm()` so an accidental click doesn't nuke an entry. Server routes (`/api/stream/[id]/delete`, `/api/essays/[slug]/delete`, `/api/inventory/[slug]/delete`) all check `getSession()`, run the store's delete method, call `revalidatePath` on the affected routes, then redirect back to the parent list. Inventory delete cascades: the store fetches the metadata first, deletes the original image + thumbnail via `mediaStore.deleteImage()`, then deletes the metadata JSON. Cascade failures are logged but don't block metadata delete — better an orphaned image in R2 than an undeletable item in the UI.
- **R2 via `aws4fetch`, wrapped in `R2Client`.** `lib/r2-client.ts` wraps `AwsClient` with **retry-once on transient TLS errors** (`ERR_SSL_SSLV3_ALERT_HANDSHAKE_FAILURE` + a few related signals). Vercel functions go cold between requests; Node's HTTPS occasionally hits a handshake hiccup on the first call to R2 from a warming function. Without the wrapper, that cold-start hiccup surfaces as a 500 to the user. With it, the second attempt almost always succeeds and the user sees nothing. All four R2-using stores (Stream, Essay, Inventory, Media) construct `R2Client` instead of bare `AwsClient`, so the retry is centralized. AWS SDK is ~1.6 MB of features we don't need.
- **Auth via raw HMAC, not `jose` / `next-auth` / Lucia.** Same ethos. ~30 lines of Web Crypto. Standard auth libraries assume a multi-provider, refresh-token, RBAC world Nearstream will never have.
- **Allowlist in env var.** Adding a friend = redeploy. Friction by design.
- **Magic-link login leaks nothing.** The login page always shows "if that email is on the allowlist, a link is on its way" — same response either way. No allowlist enumeration.
- **Resend via `fetch`, not the SDK.** Dev mode (no `RESEND_API_KEY` / `RESEND_FROM`) prints the link to console — same fallback shape as the R2 picker in slice 2.
- **Form posts, not client JS.** Login + studio both work with JS off.
- **`force-dynamic` on `/` and `/rss.xml`.** Prevents Next from caching the timeline or feed at build. Caching is still an open question (see below).
- **RSS via raw template string, no library.** Same ethos as auth and R2: a few well-escaped lines of XML beat a dependency. `escapeXml` covers attribute + text contexts; `<description>` uses `<![CDATA[…]]>` with a `]]>` splitter so content is passed through verbatim. Stream item title is derived from the first line of `text` (≤80 chars); Essay item title is the essay's title verbatim.
- **One combined feed, not separate Stream and Library feeds.** `/rss.xml` returns both primitives merged by `publishedAt`. A friend subscribing to your domain expects "everything Alessandro posts" in their reader — one feed matches that mental model. If a feed reader wants only essays it can filter on `<category>Essay</category>`. Splitting into `/rss.xml` + `/library/rss.xml` would force friends to subscribe twice; revisit only if a real reader demands it.
- **Essay body shipped as rendered HTML in CDATA, not raw markdown.** Feed readers render HTML; almost none render markdown. `marked.parse(body)` runs server-side at request time. Same `escapeCdata` `]]>` splitter as Stream items so the closing token can't appear inside the body.
- **`<guid isPermaLink="true">` for essays + inventory, `isPermaLink="false"` for stream entries.** Essays and inventory items have stable URLs (`/library/{slug}` / `/library/inventory/{slug}`); the guid is that URL. Stream entries have no per-entry permalink (only the `#entry-{id}` anchor on `/`), so we use the bare UUID with `isPermaLink="false"` — the RSS spec for guids without a fetchable resource.
- **Stream → Library bridge via optional `link` field on `StreamEntry`.** The schema gains `link?: { type: 'essay' | 'inventory', slug: string }`. Only the type + slug are stored — the linked entry's title is resolved at render time by looking it up against `essayStore.list()` / `inventoryStore.list()` (both already fetched on the home page and in `/rss.xml`). Render-time lookup means deleting the linked entry just silently removes the arrow — no broken links, no orphaned cached titles. Form submission encodes the link as a single dropdown value `type::slug` (`essay::my-essay-slug`); the API parses either that form-encoded string or a structured JSON object. The studio dropdown lists all current essays + inventory items (with `<optgroup>` for each type) so the user picks from existing content. Empty selection = no link.
- **Inventory items in RSS ship as `<enclosure>` (image binary) + `<description>` (HTML body).** Per RSS spec, `<enclosure>` is the proper way to attach a media file to an item (originally for podcasts, broadly supported). The full image gets the enclosure with its byte length + content type. The `<description>` CDATA contains an `<img>` tag (so readers that ignore enclosures still render the image inline), the markdown description rendered via `marked` (if present), and a small `<dl>` of any filled metadata (dimensions / materials / edition / status / price). We use the full image — not the thumbnail — because feed polls are infrequent and readers display at varying sizes; better to give them the full quality once than serve a fuzzy thumb.
- **Item links are anchors on `/`, not per-entry permalink pages.** Entries render with `id={`entry-${entry.id}`}` on the timeline; the feed's `<link>` is `${SITE_URL}/#entry-${entry.id}`. Real per-entry routes belong to a later slice (Phase 2 library primitives will introduce per-entry URLs).
- **Two stores, not one generic store with a discriminator.** `lib/store.ts` (Stream) and `lib/essay-store.ts` (Essay) are sibling files, each owning their own interface + InMemory + R2 implementations + picker. They share the same R2 bucket but different prefixes (`entries/` vs `library/essays/`). Reasons: (1) primitives have different shapes — Essay has slug + body + getBySlug, Stream has tag + force-permalink-less. A generic `Store<T>` would either lose type-precision or grow ugly. (2) Each primitive's store can evolve independently (Essay may add `getBySlug` cache, Stream may add filtering by tag). (3) Mirrors the manifesto's "typed primitive" model — each primitive is its own thing with its own rendering, schema, and persistence.
- **Markdown via `marked`, not MDX or `remark` + plugins.** Single package, no deps, no React-in-content complexity. `marked.parse(body, { async: true })` returns HTML, injected via `dangerouslySetInnerHTML` into a `.prose-essay` block with minimal styles in `globals.css`. Sanitization deferred — the only author is the allowlist user themselves, so XSS through self-authored content is irrelevant. If Phase 3 multi-tenant introduces friend-authored essays read by *you*, revisit (DOMPurify on server or `marked`'s sanitize hook).
- **Slugs derived from title at write time, collision rejected.** `slugify(title)` strips diacritics, lowercases, kebab-cases, caps at 80 chars. If the resulting slug already exists in R2 the POST returns 409 and the user re-titles. No silent suffixing — the title is the URL is the identity. Renaming an entry would change the slug + URL; the workaround is delete + republish (delete shipped in slice 9 follow-up).
- **`force-dynamic` on `/library` + `/library/[slug]`.** Same as `/` and `/rss.xml` — pragmatic for slice 7 volumes. Caching is the same open question.
- **Images upload direct from the browser to R2 via presigned URLs, NOT via Vercel function body.** Vercel functions cap incoming request bodies at 4.5 MB — too small for full-quality phone photos. Instead, the studio runs a three-step flow: (1) browser POSTs to `/api/inventory/upload-url` asking for a temporary signed URL; (2) Vercel function uses aws4fetch's `signQuery: true` mode to generate a 5-minute presigned PUT URL bound to a specific `content-type` and key, returns it; (3) browser PUTs the file *directly to R2* via the signed URL — Vercel never sees the bytes. After the PUT succeeds, the browser POSTs metadata to `/api/inventory` with the image key. Result: **no upload size limit short of R2's 5 GB per-object cap**, no paid services, identical code on Fly / Hetzner (where there's no body-cap quirk at all). Same pattern Dropbox / Notion / Figma use for the same reason.
- **Read images via server-proxy at `/api/media/{key}`, NOT a public R2 bucket.** Keeps the R2 bucket private (one set of credentials, one configuration). Browser fetches `/api/media/abc.jpg`; the Vercel function GETs from R2 and streams the body back with `Cache-Control: public, max-age=31536000, immutable` so browsers cache aggressively (R2 keys never change — UUIDs). Bandwidth flows through Vercel (100 GB/mo Hobby tier). For a personal site visited by ~10 close friends, that's ~33,000 image views/month before approaching the cap — not a constraint at Nearstream scale. Migration to a public R2 custom domain is a ~30-min change later if it ever matters.
- **Thumbnails are generated in the browser at upload time, not on the server.** The studio uses `createImageBitmap` + `OffscreenCanvas` (with a regular-canvas fallback for older Safari) to make a 600 px max-dimension JPEG (~80 KB for a 14 MB original) before the upload step. `/api/inventory/upload-url` returns **two** presigned R2 PUT URLs (original + thumbnail), the browser uploads both in parallel, and `InventoryImage.thumbKey` carries the thumbnail's R2 key alongside `image.key`. Archive grid (`/library/inventory`, `/library` hub) uses `thumbKey`; detail page (`/library/inventory/[slug]`) uses the full `key`. Result: an archive of 30 inventory items loads ~2.4 MB total (30 × 80 KB thumbs) instead of ~400 MB (30 × ~14 MB originals). **No server-side image library** (no `sharp`, no Vercel image optimizer, no Cloudflare Images, no paid service, no Vercel lock-in). The cost is one extra browser-side step (~1–2 s on a 14 MB photo). The fallback if `thumbKey` is missing (older items, decode failures) is to use the full `key` — graceful degradation. `image.width` and `image.height` are also captured during thumbnail generation and stored in metadata so detail pages can declare intrinsic dimensions on `<img>` and avoid layout shift.
- **`InventoryUploadForm` is a client component — the one place studio breaks "no client JS".** Three-step upload (get URL → PUT → POST metadata) plus upload progress + cellular-data warning + file picker can't be done without JS. Studio's other forms (Stream, Essay) remain plain server-rendered forms that submit without JS. The trade is acceptable because: (a) public reading paths are still server-rendered (the JS exception is gated behind auth), (b) file uploads have always been a JS-era thing, and (c) the alternative (multipart through Vercel) means the 4 MB cap for everyone.
- **CORS on the R2 bucket is required.** The browser is making cross-origin PUT requests to `*.r2.cloudflarestorage.com`. Without CORS configured on the bucket, the PUT preflight fails. Config is one-time per bucket via Cloudflare dashboard — see the Deploy section below.
- **Slug uniqueness is per-primitive, not global.** An essay can have slug `garden` (URL `/library/garden`); an inventory item can also have slug `garden` (URL `/library/inventory/garden`). Different URLs, no collision. The one edge case: an essay titled "Inventory" would slug to `inventory` and shadow the inventory archive at `/library/inventory`. Next.js prefers static routes over dynamic ones, so the inventory archive wins; the essay would 404 at its expected URL. We accept this as theoretical (extremely unlikely essay title) until either (a) someone hits it or (b) a future slice moves essays to `/library/essays/[slug]`. Tracked in open questions.
- **Inventory metadata fields are mostly optional.** Title + image required; description / dimensions / materials / edition / status / price all optional. Lets the same primitive serve casual photo posting (just title + image) and structured object inventory (everything filled). The detail page renders only the fields that have values — empty fields don't show as "Dimensions: —".
- **Allowed image types: jpeg, png, webp, gif.** No HEIC (iPhone's default — browsers can't display it; would need server-side conversion via `libheif` or similar). iPhones export JPEG when sharing through most apps, so this is rarely a problem in practice. Listed allowlist gated at both the presign step and the metadata-save step (defense in depth — a malicious client could request a different content type at PUT time, but the metadata save would reject it).
- **Reader sources live in R2, not env vars.** Unlike the `ALLOWED_EMAILS` allowlist (env var, redeploy to change — friction by design for the authentication boundary), the *reader friend list* changes more often and is *yours, not the system's*. It's the phone book of who you read. Per NEARSTREAM.md §05 ("friend graph is local, like a phone book"), each Source is a row in *your* reader. R2 prefix `reader/sources/{id}.json` keeps it next to the other primitives — same `R2Client`, same retry-once TLS wrapper, same picker pattern. The store interface (`SourceStore`) intentionally mirrors `EssayStore` so the next reader primitives (`FeedEntry` in slice 16) can be copy-shaped from the existing template.
- **Studio is the place to manage sources, for now.** The host's only authenticated UI today is `/studio`. Adding a dedicated reader-settings page (e.g. `/reader/sources`) would be more correct long-term — the reader is its own surface — but until the reader page itself exists (slice 18), bolting source management onto `/studio` keeps the slice footprint small and gives one consistent "you sign in here" surface. When `/reader` lands, source management can move under it; the API routes stay where they are.
- **`fast-xml-parser`, not `rss-parser`.** Same lightweight-dep ethos as the rest of the codebase (auth via raw HMAC, R2 via aws4fetch, Resend via fetch). `rss-parser` would have meant accepting an opinionated normalized shape over which we have no control; `fast-xml-parser` returns a JSON tree and we do the per-format mapping in ~150 lines of `lib/feed-parser.ts`. The tradeoff is that we own the edge cases (Atom 1.0, malformed feeds, CDATA, media:content, multiple link rels). For a reader that's going to see ~10 friend feeds total, this is the right side of the buy-vs-build line.
- **Stable `FeedEntry.id` = SHA-256 of `sourceId + guid`, truncated.** Each refetch needs to land on the same R2 key for the same logical entry so we don't accumulate duplicates over time. RSS `<guid>` (or Atom `<id>`, or the entry URL as fallback) gives us identity *within* a feed; prefixing the sourceId makes it unique across feeds. Hash is purely to keep keys filename-safe and bounded — guids in the wild are sometimes 200-char URLs with reserved characters.
- **Conditional GET (`If-None-Match` / `If-Modified-Since`), not polling-naive.** On every refresh we send the last `etag` and `last-modified` we saw. A friend's feed that hasn't changed returns 304 with no body — costs them ~0 work, costs us no parse + no R2 write. This is the polite-reader contract that makes RSS sustainable at scale.
- **Refresh state lives on the `Source`, not in a separate table.** `lastFetchedAt`, `etag`, `lastModified`, `lastError` are optional fields on the Source row itself. One R2 PUT after a refresh updates everything atomically. The alternative (a separate `reader/source-state/{id}.json` row) would mean two reads on the studio sources list and two writes per refresh, for no gain — refresh state has the same lifecycle as the Source.
- **Source delete cascades to entries; cascade failure does not block the delete.** `feedEntryStore.deleteBySource(id)` runs before `sourceStore.delete(id)`. If the entry cleanup throws, we log and proceed with the Source delete anyway. Same rationale as inventory image cleanup (slice 9 follow-up): an orphan R2 row is cheap; an undeletable Source row is the worse UX.
- **Refresh-all is sequential, not parallel.** Friend feeds are unlikely to live behind CDNs sized for our burst, and 5 simultaneous TLS handshakes on a cold function eats wall time without buying much. Slice 19's scheduled refresh can revisit if N becomes large enough that latency matters.
- **`User-Agent: Nearstream/0.1 (+https://nearstream.app)`.** Identifies us to friends running access logs. The URL is informational only — the protocol is the spec, not the URL. Update when we have a real homepage; the format itself is the polite-reader convention.
- **`<nearstream:type>` is a tiny RSS extension, not a new feed format.** The Nearstream protocol is RSS 2.0 (per NEARSTREAM.md §09) — the typed-primitive metadata rides on the same feed any reader can already consume. The extension namespace is `https://nearstream.app/ns/v1`. Vocabulary: `note` (Stream entry), `essay`, `picture` (Inventory item). Any reader that doesn't speak the extension still gets the RSS body and `<enclosure>` / `<description>` as before — degradation is graceful. Bumping to `/ns/v2` would happen only if the type vocabulary expands beyond what slice 18's reader chrome can render at fidelity (the same rule NEARSTREAM.md §03 puts on adding new primitives).
- **Type detection has three levels: explicit → category → heuristic.** Explicit `<nearstream:type>` wins because it's the protocol's intent. `<category>Stream\|Essay\|Inventory</category>` is the legacy bridge so older Nearstream feeds (pre-slice-17) and any non-extension-aware emitter (a hand-written feed using the right category names) still classifies correctly. Heuristic is the friend-with-a-Substack case: enclosure → picture; titled + ≥320 chars of stripped body → essay; everything else → note. The bias toward note matters: a misclassified note in the reader feels honest; a misclassified essay would render a tiny one-liner inside an essay-shaped card.
- **`/reader` shows note / essay / picture in three distinct shapes.** Mirrors the manifesto's typed-primitive philosophy (NEARSTREAM.md §03): rendering is type-shaped, not generic. Notes are flat text — the quietest type. Essays show a 22-px title behind a thin left-border with a small muted preview — feels like a publication. Pictures lead with the image (4:3 frame, bordered) and a small caption underneath — image dominates. The author + time stamp at the top is the same across types so the eye can track *who said this when* before deciding to engage with the body.
- **Reader chrome carries the Nearstream lockup; the public site doesn't.** Per the slice 14 split (Nearstream chrome vs. user site), `/reader` is Nearstream's own UI (the shared room), so its `leftNav` shows the lockup just like `/studio` and `/login`. Public pages (`/`, `/library`, `/stream`, library detail pages) remain lockup-free — they're the user's site, not the platform's.
- **Author + entry links open in a new tab.** A reader is the room you live in. Bouncing out to a friend's site (or to their referenced URL) should be a side-trip, not a navigation away from your reading session. `target="_blank" rel="noopener noreferrer"` everywhere — same UX as opening a quoted tweet without losing the timeline.
- **The reader is auth-gated.** Listed under `proxy.ts` matcher alongside `/studio`. Optimistic cookie-presence check on prefetches; real `getSession()` HMAC verify on render. The reader is *yours, locally* — there's no public reader page, by design. Sharing the reader means sharing one of the friend's *sites* (their domain is the phone number); the reader itself is not a destination one links to.
- **No Reader link in the public nav.** Adding `/reader` to public-site navigation would trip mobile's 2-item ceiling and would also imply the reader is a public destination. Reader discovery for the signed-in host happens via the `Open reader →` link in studio's Sources section header. That's enough: anyone with a Nearstream account already knows the URL, and visitors don't need to see it.

## What's next per slice

| Slice | Adds | Touches |
|---|---|---|
| 1 | skeleton end-to-end loop | `app/`, `lib/store.ts`, `schemas/stream.ts` |
| 2 | Cloudflare R2 storage backend | `lib/r2-store.ts`, `.env.example`, store picker |
| 3 | Resend magic-link auth, gate `/studio` | `lib/auth.ts`, `lib/email.ts`, `app/login/`, `app/auth/`, `proxy.ts` |
| 4 | Nearstream identity + chrome design system | `app/_components/`, `app/design/`, `globals.css`, all three pages refactored |
| 5 | RSS feed at `/rss.xml` | new `app/rss.xml/route.ts`, `layout.tsx` (alternates + metadataBase), `page.tsx` (entry anchors), `.env.example` (`NEARSTREAM_SITE_URL`) |
| 6 | Production deploy on Vercel | NEARSTREAM.md §05 + §10 updates, ARCHITECTURE.md deploy section, Vercel project + env vars + GitHub auto-deploy |
| 7 | **Phase 2 begins.** Essay primitive end-to-end | new `schemas/essay.ts` + `lib/essay-store.ts` + `app/api/essays/route.ts` + `app/library/page.tsx` + `app/library/[slug]/page.tsx`, `app/studio/page.tsx` extended with second form, `globals.css` `.prose-essay`, home + studio nav now links Library, `marked` dep |
| 8 | Essays in RSS | `app/rss.xml/route.ts` pulls both stores in parallel, merges by `publishedAt`, renders Essay items with markdown→HTML body in CDATA, `<category>Stream\|Essay</category>` discriminator |
| 9 | Inventory primitive + image upload | new `schemas/inventory.ts`, `lib/inventory-store.ts`, `lib/media-store.ts` (presigned R2 PUT URLs + server-proxy read), `lib/slug.ts` (extracted from essay schema for reuse), `app/api/inventory/route.ts` + `app/api/inventory/upload-url/route.ts` + `app/api/media/[key]/route.ts`, `app/library/inventory/` + `[slug]/page.tsx`, `app/library/page.tsx` becomes mixed hub, `app/_components/inventory-upload-form.tsx` (client), `app/studio/page.tsx` extended with third form. Follow-up commits: `lib/r2-client.ts` (retry-once on transient TLS errors), browser-side thumbnail generation, delete for all three primitives. **Requires R2 CORS config** (see Deploy section). |
| 10 | Inventory in RSS | `app/rss.xml/route.ts` pulls all three stores in parallel, renders inventory items with `<enclosure>` (full image) + `<description>` containing `<img>` tag, markdown description, and a `<dl>` of optional metadata fields |
| 11 | Stream → Library bridge | `schemas/stream.ts` gains `LibraryLink` + `linkHref()` helper, `StreamEntry.link?` optional. `lib/store.ts` + `lib/r2-store.ts` spread `input.link` on add. `app/api/stream/route.ts` accepts + validates `link` (form `type::slug` or JSON object). `app/studio/page.tsx` fetches essays + inventory, renders an optgroup dropdown. `app/page.tsx` builds slug→title maps from all three stores, renders ` → Title` arrow inline at the end of an entry's text. `app/rss.xml/route.ts` appends `→ Title: URL` to the stream item description CDATA. |
| 14 | Notebook home + Letter primitive (first site template) | new `schemas/letter.ts` + `lib/letter-store.ts` (single-record, `site/letter.json`) + `app/api/letter/route.ts`. `app/_components/site/human-circle.tsx` — Alessandro's moving.points port, inline Perlin 3D noise, client component. `app/page.tsx` rewritten as the **Notebook**: Human Circle masthead + Letter + Stream/Pictures/Essays/Elsewhere sections. `app/stream/page.tsx` — the full stream timeline lives here now (was at `/`). `app/studio/page.tsx` extended with a Letter form at the top (highest-leverage editorial slot). |
| 15 | **Phase 3 begins. Reader Source primitive — the local friend graph.** | new `schemas/source.ts` + `lib/source-store.ts` (R2 prefix `reader/sources/`) + `app/api/sources/route.ts` + `app/api/sources/[id]/delete/route.ts`. `app/studio/page.tsx` extended with a "Reader sources" section (add by name + feed URL + optional site URL; remove inline). No fetching yet — slice 16 wires the parser. |
| 16 | Feed fetcher + parser (RSS 2.0 + Atom 1.0) | new `schemas/feed-entry.ts` + `lib/feed-parser.ts` (built on `fast-xml-parser`, pure) + `lib/feed-fetcher.ts` (conditional GET + Source state mutation) + `lib/feed-entry-store.ts` (R2 prefix `reader/feed/{sourceId}/`, stable IDs via SHA-256 of `sourceId+guid`). New routes `POST /api/sources/[id]/refresh` and `POST /api/sources/refresh`. Source delete now cascades to its entries. Studio source list shows last-fetched time / last error and exposes per-source Refresh + Refresh-all buttons. `type` on every entry is still `"unknown"` — slice 17 detects it. |
| 17 | Type detection + Nearstream RSS extension | `app/rss.xml/route.ts` declares `xmlns:nearstream="https://nearstream.app/ns/v1"` on the root and emits `<nearstream:type>note\|essay\|picture</nearstream:type>` per item. `lib/feed-parser.ts` reads it (RSS + Atom), falls back to `<category>Stream\|Essay\|Inventory</category>` for older Nearstream feeds, and finally to a heuristic for non-Nearstream feeds (image → picture, title + ≥320-char body → essay, else note). Smoke-tested via `scratch/test-type-detection.ts` (gitignored). |
| 18 (this) | Reader home (`/reader`) | new `app/reader/page.tsx` — gated, joins `sourceStore.list()` with `feedEntryStore.list()`, renders entries chronologically with type-shaped bodies (note / essay / picture, matching the Gosia-tested prototype). `proxy.ts` matcher extended to `/reader/:path*` so prefetches redirect to login like `/studio`. `app/studio/page.tsx` Reader-sources section heading gains an inline `Open reader →` link. Empty states bridge to studio for source-add and to refresh-all for first-time fetch. |

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

**R2 CORS (required since slice 9).** The browser PUTs images directly to R2 via presigned URLs. Without CORS configured, the preflight `OPTIONS` request fails and the upload never happens. Configure once per bucket via Cloudflare → R2 → bucket → **Settings** → **CORS Policy**:

```json
[
  {
    "AllowedOrigins": [
      "https://alessandroborelli.it",
      "https://nearstream-indol.vercel.app",
      "https://*.vercel.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

`AllowedOrigins` should include: your production domain(s), the Vercel auto-subdomain, the `*.vercel.app` wildcard so preview deploys work too, and `localhost:3000` for dev. Adjust to your domains.

---

## Open architectural questions (carry forward)

- **List cost / caching.** `store.list()`, `essayStore.list()`, and now `inventoryStore.list()` each do one `ListObjectsV2` + N parallel GETs every page render. The Library hub `/library` calls two of them in parallel; `/rss.xml` calls two; getBySlug calls list internally on each single page. Fine for slice 1–9 volumes, but unbounded. A later slice should add a cached read path — likely an in-process LRU keyed on the bucket's `LastModified` of each prefix, with the relevant `revalidatePath` calls already wired from the POST routes.
- **R2 layout if entries grow.** Currently flat (`entries/{id}.json`). Tracked as a GitHub issue — likely move to `entries/YYYY/MM/{id}.json`.
- **Tag set.** `Code / Photo / Music / Writing` is the slice 1 set. Adding `Reading`, `Travel`, `Cooking` is one-line in `schemas/stream.ts` — defer until needed.
- **`StreamEntry.id`.** Currently `crypto.randomUUID()`. Slice 5 did not need to change this — the store already sorts by `publishedAt` and the feed `<guid>` is stable per entry regardless of ordering. Revisit when (a) pagination requires cursor IDs, or (b) we want lexicographically sortable R2 keys.
- **`force-dynamic`.** Pragmatic for slice 1. A later slice should swap to `revalidatePath` only (already wired in `POST /api/stream` and `POST /api/essays`) and let `/`, `/rss.xml`, `/library`, and `/library/[slug]` cache between posts.
- **Delete shipped in slice 9 follow-up.** Every primitive (Stream / Essay / Inventory) has a signed-in `delete` affordance on every public list and detail page. POSTs to `/api/{primitive}/{id|slug}/delete`, server checks session, store handles cascade (inventory removes its image + thumbnail from R2 too). Edit is still deferred — same rationale as before (slug rotation breaks URLs; rewriting in place leaves URL/content mismatch). Delete + republish is the workaround when you need to revise.
- **Combined feed only.** Slice 8 ships one `/rss.xml` for both Stream and Library. If a reader wants only-essays or only-stream, that's filtering on the `<category>` tag client-side. A real per-primitive feed (`/library/rss.xml`) waits for a real ask.
- **Magic-link single-use.** Slice 3 tokens are time-bound (15 min) but technically replayable inside that window — verifying single-use would require persisted state (an R2 key with the token's nonce, deleted on use). For a 1–5-person allowlist this is acceptable risk; revisit if the allowlist grows or the threat model changes.
- **CSRF on POST routes.** Right now `POST /api/stream` and `POST /auth/logout` are protected by the session cookie alone. Browsers default-block cross-site cookie sends with `SameSite=Lax`, so this is fine for form-posts initiated from same-origin pages. If a slice adds cross-origin posting (the reader posting back? an iOS shortcut?), revisit with a CSRF token or `SameSite=Strict`.
- **Form idempotency.** The `SubmitButton` client component disables itself on submit, which prevents double-clicks *when JS is on*. With JS off, a fast user could still double-submit and create two entries. A real fix is server-side: hidden idempotency token in the form, server stores submitted tokens (e.g. in an `idempotency/{token}` R2 key) and rejects repeats. Deferred — not worth the plumbing for a 1-user app.
- **Essay slug `inventory` collides with the inventory archive route.** `/library/inventory` is a static route (inventory archive). If someone publishes an essay titled "Inventory", its slug becomes `inventory`, and the essay route `/library/[slug]` would resolve to `/library/inventory` — but Next.js prefers static routes, so the inventory archive wins and the essay 404s. Same issue exists for any future static sub-route at `/library/{name}`. A clean fix: move essays to `/library/essays/[slug]` (with a redirect from the old `/library/{slug}` for back-compat against URLs already in the RSS feed). Deferred until either it bites someone or we ship a third primitive that would force the refactor anyway.
- **Thumbnails landed in slice 9 follow-up — done.** Browser-side `createImageBitmap` + `OffscreenCanvas` at upload time. No server-side `sharp` needed. See the "Why" note above.
- **Direct-to-R2 upload from non-JS clients.** The slice 9 upload path requires JavaScript. If the architecture ever needs to support a `<form enctype="multipart/form-data">` upload — e.g., an iOS Shortcut posting to a URL — we'd need a parallel server-proxy path with the 4 MB Vercel limit, or migrate compute off Vercel. Mark when/if it becomes real.
- **HEIC support.** iPhone's default photo format isn't displayable by browsers. Server-side conversion via `libheif` is heavy. Workaround for now: tell users iPhone Photos converts to JPEG when sharing through most apps. Revisit only if a real friend hits this.
- **Image dimensions landed alongside thumbnails — done.** `image.width` and `image.height` are captured during browser-side thumbnail generation (the `ImageBitmap` exposes them) and stored in the inventory metadata. Detail page sets `width`/`height` on `<img>` for layout-shift-free loads.
