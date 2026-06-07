# Morning note — Phase 3, slices 15→18

Shipped overnight. Four PRs, stacked. Merge in this order:

1. **#16** — slice 15: Source primitive (the local friend graph)
2. **#17** — slice 16: RSS/Atom fetcher + parser
3. **#18** — slice 17: Type detection + Nearstream RSS extension
4. **#19** — slice 18: Reader home (`/reader`)

Together they give you a working single-instance reader. Add a friend's
RSS URL in studio → fetch → read them on `/reader` with note / essay /
picture rendered in three distinct shapes (the Gosia-tested prototype,
made real).

## What was tested

- TypeScript clean on every slice
- ESLint clean (zero errors; `<img>` warnings pre-existing per the
  no-Vercel-CDN rule)
- `next build` succeeds on every slice
- Slice 17 has a round-trip smoke test in `scratch/test-type-detection.ts`
  — 6/6 checks pass (3 explicit `<nearstream:type>`, 3 heuristic
  fallback)

## What was NOT tested

End-to-end against real R2 + real friends' feeds. I don't have R2
credentials locally, and refresh hits the public internet. **Worth
running through the test plan in PR #19 against your Vercel preview
before merging — especially the "add a Substack feed" heuristic
check.**

## Phase labelling decision needed

NEARSTREAM.md §07 says Phase 2 = library primitives, Phase 3 = reader.
ARCHITECTURE.md previously labelled slice 14 as "Phase 2 · Slice 14".
I marked slice 15 as **"Phase 3 begins"** because that's what the
manifesto says the reader is. If you'd rather keep Phase 2 open for
site polish and rename this stack as part of a renumbered phase,
trivial edit before merge — change the status banners and the slice
list row.

## Architectural calls I made solo (revisit if any feel wrong)

- **R2 layout** — sources at `reader/sources/{id}.json`, feed entries
  at `reader/feed/{sourceId}/{entryId}.json`. Same shape as existing
  primitives.
- **Stable entry IDs** — SHA-256 of `sourceId + guid`, truncated to
  24 hex chars. Refetches dedupe naturally.
- **Parser dep** — `fast-xml-parser` (only new dep this stack). Did
  NOT use `rss-parser` — manifesto-style thin-dep ethos.
- **`<nearstream:type>` namespace** — `https://nearstream.app/ns/v1`.
  Vocabulary: `note` / `essay` / `picture`. If you'd rather pick a
  different URN or vocabulary word, change it in:
  - `app/rss.xml/route.ts` (emit)
  - `lib/feed-parser.ts` (read)
- **Heuristic essay threshold** — title + ≥320 chars of stripped body
  → essay; else note. Bias toward note because a wrong note feels
  honest, a wrong essay renders a one-liner inside an essay-shaped
  card. Tune in `lib/feed-parser.ts` if a real friend's feed lands in
  the wrong bucket.
- **Reader nav** — `/reader` reachable from `/studio` (the "Open
  reader →" link in the Sources section header). NOT added to the
  public home nav — would trip the 2-item ceiling and would imply
  /reader is a public destination, which it isn't. Reader is yours,
  locally.
- **Author + entry links open in a new tab** — the reader is the
  room you live in. Side-trips shouldn't end the session.
- **Refresh is manual** — no cron yet. Slice 19's territory.

## What's NOT in this stack (deferred slices to schedule)

- **Slice 19** — Scheduled refresh. Vercel cron is the easy path; per
  memory we should avoid Vercel-specific APIs. Compromise option: a
  generic POST endpoint, hit by *any* scheduler (Vercel cron in
  prod, GitHub Actions, or a friend's own cron).
- **Slice 20** — Per-friend page (`/reader/[source]`). One friend at
  a time, like visiting their site through the reader.
- **Slice 21** — Seed your account with a real list of feeds you read.
- **Phase 4** per NEARSTREAM.md §07 — multi-tenant + onboard the first
  friend.

## Cleanup before merge (optional, all small)

- The studio `today's` apostrophe lint error from slice 14 is fixed
  inside slice 16's commit. Note in the commit body.
- `scratch/` is gitignored (added by slice 17). The test-type-detection
  script lives there for re-running.
- Slice 14 has an `/api/circle/daily.png` PR (#14) still open from
  earlier — not part of tonight's work, just visible in `gh pr list`.

## TL;DR for showing Gosia

The prototype she liked tonight is now a real, working route on the
app. Add her feed URL (if she ever spins up a site), add yours, the
reader shows both your feeds in one chronological stream. The shape
she liked is the shape the reader renders. Phase 3 of the manifesto
is technically done at the single-instance level after this stack
lands.
