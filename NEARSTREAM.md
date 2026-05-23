# Nearstream

A shared journal between close friends.

> **Status:** v0.3 — building
> **Updated:** 2026-05-23
> **Predecessors:** v0.2 (2026-04-27) · technical sketch v0.1 (April 2026)

This document is the single source of truth for terms, decisions, and reasoning behind Nearstream. Update it as we decide things. The Decisions log (§05) is the most important section — code can be re-read, but the *reasons* behind picks rot fastest.

---

## 00 — Concept

A small group of close friends each own a personal site. Each site is their stream — daily life, work, ideas, photos. A shared reader pulls everyone's stream together. No algorithm. No public. No likes. It just accumulates quietly over time, like a shared journal you can all write in.

The problem with existing social networks: they bundled personal publishing and content aggregation together, and optimised for platform growth — not for the person. Nearstream unbundles these two layers and returns ownership to the individual.

The closest existing movement is **IndieWeb** (indieweb.org) — a community building exactly this since 2011. The reason it never reached normal people: too technical to set up, built by developers for developers. The cost structure of building tooling has shifted, which is why this is approachable now.

Nearstream is not trying to be the next anything. It's trying to be the next *nothing* — the platform that doesn't try to grow into your life. Start small. Stay small per instance. Spread by codebase, not by user count.

---

## 01 — Lexicon

The load-bearing terms. If we use a word here, it's defined here.

- **Reader** — the shared room. The app that pulls all friends' feeds together and renders them. Same shape for everyone in the network. *Nearstream's territory.*
- **Site** — a person's home. Their domain. Where their content lives. *The user's territory.*
- **Stream** — short, ephemeral posts. Microblog. Timestamped. No deep page. *What you'd say to a friend at coffee.*
- **Library** — permanent typed entries. Each has its own page. *What you'd hand a friend.*
- **Library entry** — a single piece in the Library. *Inventory item, Release, Essay, Photo essay, Journal* — each with its own typed primitives.
- **Typed surface** — a Library entry rendered with its structured fields visible (Tracklist, Spec table, Plate sequence, Credits, etc.). The opposite of a generic blog post.
- **Typed primitive** — a structured component used inside Library entries. Examples: *Plate sequence, Tracklist, Inventory row, Credits, Process timeline, Specimen block.*
- **Discipline tag** — typed metadata on a Stream entry (`Code` / `Photo` / `Music` / `Writing` / …). Cuts across disciplines without giving each its own top-level room.
- **Partition** — when a multi-discipline person organizes their Library by discipline. *Lives inside Library, not as top-level nav.*
- **Lens** — what the Reader user controls: *density, filter, order*. The freedom on the consume side.
- **Edition** — typed acquire metadata for physical/limited works (e.g., "Edition of 3," "1 of 50 cassettes"). Belongs to primitives like Inventory row or Release.
- **Friend graph** — *local to your reader.* The set of domains you've added to your friends list, with optional local nicknames. Like contacts on a phone — public domain, private label. There is no shared graph.
- **Domain** — a person's public address. The "phone number." Anyone with the domain can subscribe to its RSS feed. Sharing your domain is a real-world act (text, email, in person, QR code).
- **Friends list / OPML** — your local list of domains, stored in *your* reader. Nicknamed however you want. You and another reader of the same friend can call them different things.
- **Instance** — a deployment of the Nearstream codebase that hosts one or more sites. Could be solo (just you) or multi-tenant (you hosting your friends). Anyone can run an instance.
- **Studio** — the built-in posting interface. Inside the same app as your site, not a separate tool. The door friends walk through to post.

---

## 02 — Architecture

Three valid framings. They are not in conflict — they describe different cuts.

### Technical stack

```
[friend_a.com]   →   RSS / ActivityPub   →   [your reader]   →   [your screen]
[friend_b.com]                                     ↑
[you.com]                                          |
                                              feed-protocol layer
```

1. **Personal Site** — each person owns a domain. Static gen, RSS feed, Library entries as deep pages.
2. **Feed Protocol** — RSS for v1, ActivityPub for v2. The plumbing.
3. **Reader / Container** — pulls feeds together, renders them in your chosen lens.

### Freedom layers (what users actually control)

```
                                   USER FREEDOM
  Reader         (the shared room)     →   LOW      lens / density / filter
  Site           (your home)           →   MEDIUM   template / palette / type pair
  Library entry  (a single piece)      →   HIGH     compose with typed primitives
```

1. **Reader — low freedom, on purpose.** Same chrome for everyone in the network. Users vary *what they see* (lenses), not *how it's rendered.*
2. **Site — medium freedom.** Pick from a curated set of templates (photo-led / text-led / object-led / mixed / …), a curated palette pair, a curated type pair, a masthead style. *No free-form CSS, no hex picker, no font marketplace.*
3. **Library entry — high freedom, within the site's language.** Compose with typed primitives. Type the surface, not the visual.

**The discipline that makes this work:** the reader is Nearstream's territory, the site is the user's territory, neither invades the other.

### Two tracks + one protocol

Nearstream is not a single product. It's two tracks bound by one protocol.

```
                Nearstream codebase  (open-source, MIT/AGPL)
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
  Multi-tenant       A photo group's   Luca's solo install
  instance you       co-op instance    on his own infra
  run for friends    (run by them)     (just him)

  hosts: you,        hosts: that       hosts: just Luca
  Mario, Paolo       group
        │                 │                 │
        └─────────────────┴─────────────────┘
                          │
                          ▼
              All speak the same RSS +
              typed-primitive protocol.
              Any reader can read any site.
```

- **Track 1: Hosted (Mario-friendly).** A multi-tenant instance someone operates (initially you). Friends sign up to *that instance*. They never touch GitHub, Vercel, or any infra. One sign-up, one UI, one URL.
- **Track 2: Self-host (Luca-friendly).** Clone the codebase, deploy anywhere, write your own UI if you want. Site publishes RSS in the Nearstream format. Appears in any reader.
- **The protocol** is the only load-bearing contract: **RSS 2.0 + typed-primitive metadata** (microformats2 / JSON-LD). The reader doesn't care which track produced the feed.

This is how Nearstream addresses three concerns at once:
- **Adoption (Mario)** — Track 1 has zero infra friction.
- **Vendor concentration (Vercel etc.)** — codebase is portable; instances run anywhere.
- **Longevity** — open-source code + portable content + custom domains mean ownership-through-exit. Even if every Nearstream instance disappeared, sites and feeds remain.

---

## 03 — Content model

### Stream vs Library

| | Stream | Library |
|---|---|---|
| Shape | Short text + timestamp + discipline tag | Typed surface |
| Structure | None beyond the tag | Typed primitives (Tracklist, Spec, Plates, Credits, …) |
| URL | None — lives only in the timeline | Each entry has its own deep page |
| Sort | Strictly chronological | Partitioned by discipline, recent within |
| Mental model | What you'd say at coffee | What you'd hand a friend |

**Stream is the process. Library is the artifact.** Stream announces, Library archives. Both exist because hiding the process makes the artifact look like it appeared from nowhere (Squarespace), and hiding the artifact leaves nothing to point to (Twitter).

The bridge between them: a Stream post can announce a Library entry. *"Soft Iron is out →"* with a link. The substance lives in the Library; the Stream just says *this happened.*

### Typed primitives (current menu)

Each Library entry uses one or more of these:

- **Inventory row** — image, dimensions, materials, edition, status, price. *Ceramics, prints, hardware, anything physical.*
- **Release** — cover art, tracklist, duration, credits, editions, listen links. *Music releases.*
- **Essay / Article** — title, body, sections, footnotes, word count, read time.
- **Photo essay** — sequence of plates with captions, plate count, photographer's note.
- **Journal** — sequence of dated entries.
- **List** — annotated (books read, projects, tools).
- **Process timeline** — used *inside* other primitives. Dated notes capturing the making.

**Rule for adding a new primitive:** only when an existing one would force the wrong shape. Each new primitive is a commitment the reader has to render at fidelity.

### Partitioning

For multi-discipline sites, the Library is partitioned by discipline (e.g., Writing / Photos / Music). Single-discipline sites have a flat Library. **Partitions live inside Library, not as top-level nav.** This keeps single- and multi-discipline sites the same shape.

---

## 04 — Anti-aspirations

What Nearstream is **not**.

- **Not Squarespace.** No drag-and-drop builders, no free-hex pickers, no font marketplace, no "section libraries," no CSS overrides. The constraints are the product.
- **Not Instagram.** No likes, no views, no metrics, no algorithm, no public.
- **Not Substack.** Not a newsletter. Not optimized for "audience."
- **Not Twitter / Threads.** Not stream-only — the Library matters as much as the Stream.
- **Not Mastodon-shaped.** Not federated-Twitter. It's *personal sites + a reader*, not microblog instances.
- **Not retro cosplay.** Modern structure, analog texture. No fake CRT chrome, no pixel fonts everywhere.

---

## 05 — Decisions log

Terse list. Each entry: the decision, the reason, when.

- **Library is the parent of disciplines, not their sibling.** All sites use `Stream / Library / About` as nav. Multi-discipline sites partition *inside* Library. *Why: keeps single- and multi-discipline sites the same shape; "Library" stays a stable network-wide term.* (2026-04-27)
- **Library entries each get their own URL.** Set by the lidded-jar entry. Home pages are gateways; deep entries are destinations. *Why: typed surfaces only travel if they have addresses.* (2026-04-27)
- **Home page = Stream + Featured + Library gateway.** Library is its own page. Library entries are deep pages. *Why: home as gateway, library as archive, entry as destination — three distinct intents, three pages.* (2026-04-27)
- **Reader chrome is fixed.** Users get lenses (density / filter / order), not visual customization. *Why: the reader is the shared room; if everyone redesigns it, the network feels fragmented.* (prior)
- **Site templates are curated, not free-form.** ~5 templates, curated palette pairs, curated type pairs. *Why: constraint is the product; coherence across sites is what makes the reader feel like a room.* (prior)
- **Squarespace is the explicit anti-aspiration.** *Why: the kitchen-sink builder is the wrong shape for friend-network publishing.* (2026-04-27)
- **Mono is metadata, sans is body.** Geist Mono for timestamps/labels/tags, Geist Sans (or the site's chosen sans) for body. Mono is Nearstream's accent across all sites. *Why: shared visual cue across the network.* (prior)
- **Friend graph is local, like a phone book.** Domain = phone number (public). Friends list = your contacts (private). No follow requests, no central registry, no platform-mediated discovery. *Why: matches the real shape of friendship — you share your URL like a number, the other side decides if and how to save it.* (2026-04-28)
- **Two tracks + one protocol.** Nearstream is a hosted multi-tenant codebase AND a self-hostable template, bound by an open RSS + typed-primitive format. *Why: solves adoption (Track 1), sovereignty (Track 2), and longevity (the protocol outlives any instance).* (2026-04-28)
- **No third-party CMS. The studio is built into Nearstream.** Typed primitives are TypeScript schemas — single source of truth for forms + display + RSS + reader cards. *Why: friends will not learn a second tool with a second login. Schema-as-code lets typing flow through the whole pipeline.* (2026-04-28)
- **Vercel is a deployment target, not a dependency.** Compute on Fly.io or self-hosted VPS for v1. Storage on Cloudflare R2 (S3-compatible). No Vercel-specific APIs in the codebase. *Why: avoid concentrating power in any single vendor; the codebase must remain portable.* (2026-04-28)
- **Open source from day one.** MIT or AGPL. Code, schemas, and manifesto public from v1. *Why: longevity through forkability; trust through transparency; attracts technical adopters (the Lucas).* (2026-04-28)
- **Ownership through exit, not infrastructure.** Each user owns their domain. Content is exportable at all times (MDX + media + OPML archive). Identity is the domain, not the instance. *Why: lets us run a hosted instance for adoption without compromising sovereignty — anyone can leave at any time and keep everything.* (2026-04-28)
- **Scale by instance count, not user count per instance.** Nearstream scales like email: many small instances, all interoperating via the protocol. Each instance stays small (~10–80 friends). *Why: the friend-graph mechanic only works at small scale; the right unit of growth is the circle, not the user.* (2026-04-28)
- **Alessandro's instance is for his close friends.** Growth is incidental, not a goal. Future hand-off (paid tier / co-op / non-profit) is a *future* decision, not a v1 commitment. *Why: locks the v1 scope to "small but durable," prevents premature SaaSification.* (2026-04-28)
- **R2 keys are flat: `entries/{id}.json`.** No date prefix in v1. *Why: simplest layout that works; entry volume is small for a long time. Date partitioning is filed as a follow-up issue — revisit when list cost or pagination becomes real, not before.* (2026-05-12)
- **R2 client is `aws4fetch`, not `@aws-sdk/client-s3`.** Single-file SigV4 signer over `fetch`. *Why: AWS SDK is ~1.6 MB / ~120 packages, mostly features we don't need. `aws4fetch` is edge-runtime compatible and aligns with §05 "Vercel is a deployment target, not a dependency" — same code will run on Fly.io.* (2026-05-12)
- **Auth is HMAC over Web Crypto, not a JWT library.** Both magic-link tokens and session cookies are `base64url(payload).base64url(HMAC-SHA256(secret, payload))`. No `jose`, no `next-auth`, no Lucia. *Why: same reasoning as `aws4fetch` — this is auth for a handful of people, not enterprise. The whole signer is ~30 lines, has zero dependencies, and rotating `AUTH_SECRET` invalidates every session + magic link in one step. Standard auth libraries are designed for the multi-provider, refresh-token, RBAC case Nearstream will never have.* (2026-05-15)
- **Allowlist is an env var, not a database.** `ALLOWED_EMAILS` is a comma-separated list in `.env`. Adding a friend = redeploy. *Why: friction by design (§04 anti-Squarespace). The login page never reveals whether an address is on the list — same response either way. A self-serve "invite" UI is the exact kind of feature this project shouldn't have.* (2026-05-15)
- **Magic-link UX always shows the same response.** Whether the email is on the allowlist or not, the user sees "if that email is on the allowlist, a link is on its way." *Why: prevents the login page from being a free allowlist-enumeration oracle. Costs nothing.* (2026-05-15)
- **Optimistic check in `proxy.ts`, real check at the route boundary.** Next 16 renamed Middleware → Proxy. The proxy only checks for the presence of the session cookie (no signature verification — that's an HMAC cost on every prefetch). `getSession()` in the page/route does the real verification. *Why: matches the Next 16 auth guide and keeps prefetches cheap. Defense-in-depth: even a stolen-but-tampered cookie passes the proxy but fails the route.* (2026-05-15)
- **Resend over fetch, not the Resend SDK.** Same `aws4fetch` ethos. If `RESEND_API_KEY` or `RESEND_FROM` is missing, the magic link prints to the server console instead of being emailed — mirrors the R2 fallback in slice 2. *Why: lets the whole flow be tested without burning Resend quota or a real inbox round-trip, and keeps the dependency surface tiny.* (2026-05-15)
- **Two-layer design system: Nearstream chrome vs user site.** Components in `app/_components/` are **Nearstream chrome** — the platform identity, same on every instance. Pages like `/login`, `/studio`, `/design` consume them. The user's site (their `/`) currently uses the same chrome as a stand-in, but Phase 2 will introduce **site templates** with their own palettes and components. *Why: matches §02's reader-vs-site distinction. Keeps the platform recognizable across instances while letting users own the look of their personal stream. Avoids the design-system trap of one global theme that has to please both.* (2026-05-23)
- **Nearstream chrome palette is pure mono, no accent.** `#000` bg, `#e4e4e7` foreground, two greys (`#a1a1aa` muted + `#71717a` muted-soft), `#27272a` border. No light mode. Ported from the deployed landing site. *Why: the chrome should feel like a shared room — austerity makes it a backdrop, not a brand fighting for attention. The user's site (Phase 2) gets color. Earlier amber + multi-discipline-color experiments in slice 4 were undone because they were the chrome trying to be a site.* (2026-05-23)
- **`/design` is the chrome spec, not a marketing page.** Lives in the app at `/design`, not linked from nav. Shows tokens, type scale, brand mark, every component in every state. *Why: single source of truth so the design doesn't drift across pages. Treating it as a build artifact (not docs in a separate repo) means it can never get out of sync with the code.* (2026-05-23)

---

## 06 — Open questions

Unresolved. Move to Decisions when we pick.

- **Stream cadence** — should there be a daily limit? Should the reader collapse stream entries from the same friend on the same day?
- **Search** — when do we add it, and across what scope (site / library / reader)?
- **Drafts** — exist as unpublished entries with a flag, or in a separate `drafts/` namespace?
- **Reader-level interactions** — comments? webmentions? read receipts? When do these violate "no metrics"?
- **Edition supply visibility** — do you show "1 of 50 remaining" to friends, or only to yourself? Friends-only? Public?
- **Cross-discipline reader rendering** — when a Stream post and a Library entry sit next to each other in the reader, how does the chrome differentiate them at a glance?
- **Image upload pipeline** — direct R2 upload from studio, or via the app server? Image transforms — on-demand or pre-generated?
- **Custom domain handoff** — manual at first (Alessandro flips a Vercel/Fly DNS toggle for the friend), or self-serve via a settings page?
- **Edit history / revisions** — store every save as a new version, or just the latest? Friends-visible or private?
- **License of the codebase** — MIT (permissive, easier adoption) or AGPL (network-copyleft, protects against closed forks)?

---

## 07 — Build phases

Each phase is intentionally small. **Build in order. Don't jump ahead.**

0. **Phase 0 (~1 day) — Define the protocol.**
   Lock the TypeScript schemas for v1 typed primitives (StreamEntry first; then Inventory + Release as the proof set). This is the contract that flows through forms, storage, RSS, and reader cards. Document the RSS extension format (microformats2 / JSON-LD) for typed metadata.

1. **Phase 1 (~1 week) — Solo end-to-end loop, just for you.**
   New Next.js app with built-in studio. Magic-link auth. Cloudflare R2 storage. Single user (you). One typed primitive (StreamEntry). Public site renders your stream. RSS feed at `/rss.xml`. Custom domain optional. **At end of Phase 1: you are the first Nearstream user, posting from your phone, served from your own infra.**

2. **Phase 2 (~1 week) — Library primitives.**
   Add Inventory, Release, Photo essay, Essay, Journal as typed schemas + studio forms + site rendering. Library archive page. Library entries each get their own URL.

3. **Phase 3 (~1 weekend) — Multi-tenant + minimal reader.**
   Make the app multi-tenant (one deployment serves multiple users at `paolo.nearstream.app` etc.). Build the reader inside the same app. Hardcoded `friends.json` per user for v1. Magic-link auth gates studio + reader.

4. **Phase 4 (~1 day) — Onboard the first friend.**
   Custom domain wiring. Friend signs up, posts, you read each other in the reader. Watch their posting behaviour.

5. **Phase 5 (ongoing) — Iterate on reader + expand library.**
   Photo-heavy layouts, density modes, filter by person, unread indicators, grouping by day. New typed primitives only when an existing one would force the wrong shape.

6. **Phase 6 (v2) — Richer interactions.**
   WebMention, ActivityPub bridge, POSSE to Instagram. Public open-source release with onboarding docs for instance-runners.

---

## 08 — Hard problems (honest)

Unsolved. These are the bets.

- **Friend adoption.** Even with a template, most people won't use a CMS. The posting UX needs to feel like Stories — instant, from phone. Phase 2+ should explore mobile-first studio or a PWA posting interface.
- **No dopamine loop.** Instagram works because of likes and views. Nearstream has none. The bet is that a small audience of people you actually care about is more rewarding than a large anonymous one. *Unproven for most people.*
- **Maintenance.** You become admin for your friends' sites. When something breaks, they message you. Design for zero-maintenance from day one — no databases to manage, static generation where possible.
- **Posting drift to other platforms.** Friends will keep using Instagram. POSSE is the answer — post on your site first, syndicate to Instagram. Adds technical complexity. v2.

---

## 09 — Protocols

| Protocol | What it does | When |
|---|---|---|
| **RSS / Atom** | XML feed of updates. Reverse chronological. Backbone of the open web. | v1 |
| **OPML** | Standard for importing/exporting feed lists. How you share a "friends list." | v1 |
| **ActivityPub** | Federated social protocol (Mastodon). Cross-site follow, post, reply. W3C since 2018. | v2 |
| **WebMention** | Cross-site notifications. Enables comments/likes between independent sites. W3C. | v2 |
| **Microformats2** | Small structured HTML classes (h-entry, h-card). Makes content machine-readable. | v2 |
| **IndieAuth** | Use your domain as identity / login. | optional |

---

## 10 — Stack (v1)

The whole stack is one Next.js app, deployed to a host of your choosing, with portable storage. **Vercel-free, Sanity-free.**

- **Application:** single Next.js app (the *site* + *studio* + *reader* live together; routes are gated by auth where private). Open-source from day one.
- **Compute:** **Fly.io** (or self-hosted Docker on a VPS — Hetzner ~$5/mo). Portable container, no vendor lock-in.
- **Storage:** **Cloudflare R2** (S3-compatible object storage). Per-user prefix. MDX/JSON for content, blob for media. ~free at our scale.
- **Auth:** email magic link via **Resend** (or similar). No passwords.
- **Schemas:** TypeScript types — single source of truth for studio forms + site rendering + RSS export + reader cards.
- **Feed:** RSS 2.0 with typed-primitive extensions (microformats2 in HTML, JSON-LD in `<script>` tag, or a custom XML namespace).
- **Feed parsing (reader side):** `rss-parser` (npm).
- **License:** MIT or AGPL (open question).

A simplified core reader loop:

```ts
// hardcoded friends list — Phase 2
const friends = [
  { name: "Marco", feed: "https://marco.xyz/rss.xml" },
  { name: "Sofia", feed: "https://sofia.site/feed" },
  { name: "you",   feed: "https://yoursite.com/rss" },
]

const allPosts = await Promise.all(friends.map(f => parser.parseURL(f.feed)))
const stream = allPosts.flat().sort((a, b) => +new Date(b.pubDate) - +new Date(a.pubDate))
// render however — your design, your rules
```

---

## 11 — Connection to Nearbox

Same philosophy, different medium.

- **Nearbox** — physical device, always-on, small trusted network, short messages. *The physical layer of intimacy.*
- **Nearstream** — personal web, owned infrastructure, small trusted network, stream of life and work. *The digital layer of intimacy.*

Both reject the same thing: platforms that extract value from your attention and relationships. Both bet that a small, known audience is more meaningful than a large, unknown one. Nearbox is the physical object on the shelf; Nearstream is the web presence behind it.

---

## 12 — How Nearstream scales

Nearstream does not scale like a social platform. The wrong question is *"how does Nearstream get to 10M users on one instance?"* The right question is **"how do many small circles of friends find their way to running this thing for themselves?"**

It scales like email — through ubiquity of the *protocol*, not size of any one *server*.

```
Year 0:  1 instance.  Alessandro + ~8 friends.                          ~10
Year 1:  ~5 instances.  Friends-of-friends spin up their own.           ~100
Year 3:  ~100 instances.  Photographers, ceramicists, families,
         small towns, college groups — each ~20–80 people.            ~3,000
Year 5:  ~1,000 instances.  Some run by individuals, some by tiny
         co-ops, a couple by small companies offering hosting.       ~30,000
```

Five levers that make this trajectory possible:

1. **Open-source the codebase, ruthlessly well-documented.** `git clone && docker compose up && open localhost` is the entire setup story. Anything harder loses the long-tail of operators.
2. **The protocol is the spec.** RSS + typed-primitive format is the contract. Anyone can write their own publisher (Luca-style) or reader without coordinating with us.
3. **Run a flagship instance modestly.** Alessandro hosts one for his own circle. ~$15/month. Not "the company." If it grows beyond what's comfortable, three options exist: cap it, add a small paid tier, or hand to a co-op.
4. **Encourage instance-runners.** Small groups, hobbyist sysadmins, communities. Make running an instance for ~30 friends feel like running a Discord server.
5. **Identity is portable.** Custom domains + first-class export = zero-cost migration between instances. Mario can switch instances without losing followers (OPML), content (MDX archive), or identity (his domain).

**Economic shape:**
- Maintainer cost: ~$15/month + a few hours/month
- Revenue: zero, modest donations, or eventually a small paid hosted tier
- Growth: word of mouth, demos, friends-tell-friends
- Outcome: something that quietly persists for 10+ years, used by thousands of small groups who love it deeply

This is the shape of Pinboard, Are.na, Glitch, micro.blog, Pixelfed. None of those are Twitter. All have outlasted half the unicorns of their decade.

**Alessandro's intent (locked in):** start small, primarily for himself + close friends. Growth is incidental. Future scaling questions (paid tier? hand-off to a co-op?) are *future* decisions.

---

## 13 — References & prior art

| Project | What it is |
|---|---|
| **indieweb.org** | The movement this is built on. Wiki of protocols, principles, tools. Since 2011. |
| **micro.blog** | Closest existing product. Hosted personal microblogs with ActivityPub. Too generic, too public — but right direction technically. |
| **Mastodon** | Decentralized via ActivityPub. Proves the protocol works at scale. Too Twitter-shaped for this use. |
| **Miniflux** | Open-source self-hosted RSS reader. Clean, minimal. Could be a fork target instead of building from scratch. |
| **POSSE** | "Publish on Own Site, Syndicate Elsewhere." IndieWeb pattern. Migration strategy for friends still on Instagram. |
| **Bridgy** | IndieWeb tool that bridges your site to social networks. |

---

## 14 — Prototypes in this repo

What's currently visualized (not implemented):

- `/preview/sites` — four site templates side-by-side: photo-led (Lina), text-led (Wren), object-led (Tomás), mixed (Alessandro)
- `/preview/sites/photo-led|text-led|object-led|mixed` — individual templates
- `/preview/sites/mixed/library` — the partitioned Library archive (multi-discipline)
- `/preview/library/lidded-jar` — Inventory typed surface (Tomás's ceramic jar) ← deep entry precedent
- `/preview/library/soft-iron` — Release typed surface (Alessandro's EP) ← second deep entry, structurally mirrors lidded-jar
- `/preview/reader` — mock reader rendering three typed cards (Inventory, Essay, Photo essay) under one chrome

Snapshots:

- `v1/` — original static-HTML prototype (frozen)
- `reader/snapshots/landing-v1/` — Next.js landing pages (frozen reference copy)

---

*Status: v0.3. Editable. Update as decisions land. The decisions log is the most important section.*
