// Robots directives. Belt-and-braces on top of the `noindex` meta tags
// already set on tenant pages. Explicit disallows for the authed
// surfaces (nothing useful there for search); tenant pages themselves
// stay technically crawlable so `public` sites can be linked from
// LinkedIn and preview cards work, and rely on the `noindex` meta to
// keep them out of search results.

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: [
          "/api/",
          "/auth/",
          "/login",
          "/onboarding",
          "/reader",
          "/reader/",
          "/studio",
          "/studio/",
          "/settings",
          "/settings/",
          "/design",
          "/design/",
          "/request-access",
        ],
      },
    ],
  };
}
