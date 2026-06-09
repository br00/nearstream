// "Ownership through exit" — the proof a user can leave with their content.
// Returns a single JSON blob with everything in the user's tenant namespace:
// profile + letter + stream entries + essays + inventory items + reader
// sources. Media binaries are not included (URLs are); the user can fetch
// them via /api/media/{key} if they want the actual files.
//
// Auth-gated to the signed-in user — you can only export your own data.

import { getSession } from "@/lib/auth";
import { userStore } from "@/lib/user-store";
import { letterStore } from "@/lib/letter-store";
import { store as streamStore } from "@/lib/store";
import { essayStore } from "@/lib/essay-store";
import { inventoryStore } from "@/lib/inventory-store";
import { sourceStore } from "@/lib/source-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await userStore.getById(session.userId);
  if (!user) {
    return Response.json({ error: "user not found" }, { status: 404 });
  }

  let letter, streams, essays, inventory, sources;
  try {
    [letter, streams, essays, inventory, sources] = await Promise.all([
      letterStore.get(user.id),
      streamStore.list(user.id),
      essayStore.list(user.id),
      inventoryStore.list(user.id),
      sourceStore.list(user.id),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/export] storage failed", err);
    return Response.json(
      { error: `Could not assemble export — ${message}` },
      { status: 502 },
    );
  }

  const export_ = {
    nearstream: {
      version: 1,
      exportedAt: new Date().toISOString(),
      // The format is stable enough that another Nearstream instance could
      // import this verbatim. Future Phase 6 work: an /api/import endpoint
      // and a "move my account" flow.
      format: "https://nearstream.app/ns/v1/export",
    },
    profile: {
      handle: user.handle,
      displayName: user.displayName,
      email: user.email,
      createdAt: user.createdAt,
    },
    letter,
    streams,
    essays,
    // Inventory items keep their image URL (/api/media/{key}); fetch separately
    // if you want the binary.
    inventory,
    readerSources: sources,
  };

  const filename = `nearstream-${user.handle || "export"}-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  return new Response(JSON.stringify(export_, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
