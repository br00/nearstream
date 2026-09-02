// The long-edge cap applied to every generated thumbnail.
//
// Lives here rather than in `app/_components/upload-helpers.ts` because that
// module is `"use client"` — it touches canvas — and both the RSS route and
// the server-rendered home need this number. Importing it from the client
// module would drag a browser-only file across the server boundary for the
// sake of one integer.
export const THUMB_MAX_DIM = 600;
