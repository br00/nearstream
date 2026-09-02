// Essay share preview card.
//
// Essays are the primitive most likely to be linked somewhere public, so
// their card is the one that has to carry an argument to a stranger. It
// leads with the title set large — the title is the hook, and a card that
// leads with a site name wastes the only line anyone reads.
//
// Existed as nothing at all until now: the page inherited the tenant card
// (a profile mark and a display name, identical for every essay), and then
// briefly had no image whatsoever, because adding a page-level `openGraph`
// block replaces the parent's entirely — including its images.

import { ImageResponse } from "next/og";
import { userStore } from "@/lib/user-store";
import { essayStore } from "@/lib/essay-store";
import { resolveSitePrivacy } from "@/lib/tenant-visibility";
import { visibilityOf } from "@/schemas/visibility";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = {
  params: Promise<{ handle: string; slug: string }>;
};

/**
 * Titles vary from three words to a full sentence, and a card that clips is
 * worse than one set a little smaller. Step the size down by length rather
 * than trusting a single value to hold both.
 */
function titleSize(title: string): number {
  const n = title.length;
  if (n <= 28) return 92;
  if (n <= 48) return 76;
  if (n <= 72) return 62;
  return 52;
}

export default async function Image({ params }: Props) {
  const { handle, slug } = await params;
  const user = await userStore.getByHandle(handle);
  const displayName = user?.displayName || handle;

  const essay = user ? await essayStore.getBySlug(user.id, slug) : null;

  // A private essay, or one on a non-public tenant, must not leak its title
  // through a share card — the page itself 404s to strangers, and the image
  // route is public. Fall back to the site's own name.
  const exposed =
    essay !== null &&
    user !== null &&
    resolveSitePrivacy(user) === "public" &&
    visibilityOf(essay) === "public";

  const title = exposed ? essay!.title : "Nearstream";
  const kicker = exposed
    ? `${displayName} · Essay`
    : "A shared journal between close friends";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          background: "#08080a",
          color: "#e9e7e2",
          padding: "76px 84px",
        }}
      >
        <div
          style={{
            fontSize: 22,
            textTransform: "uppercase",
            letterSpacing: "6px",
            color: "#7c7a74",
            fontFamily: "monospace",
            whiteSpace: "nowrap",
          }}
        >
          {kicker}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: titleSize(title),
            lineHeight: 1.08,
            letterSpacing: "-2px",
            color: "#e9e7e2",
            // Satori has no line clamp; the size step above is what keeps a
            // long title inside the frame.
            maxWidth: 1000,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 20,
            textTransform: "uppercase",
            letterSpacing: "5px",
            color: "#7c7a74",
            fontFamily: "monospace",
          }}
        >
          {/* A single hairline rule and the wordmark — the card should look
              like the site it opens, which is mostly black and quiet. */}
          <div style={{ display: "flex", width: 56, height: 1, background: "#3a3940" }} />
          Nearstream
        </div>
      </div>
    ),
    size,
  );
}
