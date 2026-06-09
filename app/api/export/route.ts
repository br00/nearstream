// "Ownership through exit" — proof a user can leave with their content.
//
// Returns a ZIP file containing:
//   - nearstream-export.json: profile + Letter + Stream + Essays + Inventory
//     metadata + Reader sources
//   - media/{key}: every inventory image (original + thumbnail) as actual
//     bytes, so the export is self-contained if R2 ever goes away
//
// Auth-gated to the signed-in user — you can only export your own data.

import JSZip from "jszip";
import { getSession } from "@/lib/auth";
import { userStore } from "@/lib/user-store";
import { letterStore } from "@/lib/letter-store";
import { store as streamStore } from "@/lib/store";
import { essayStore } from "@/lib/essay-store";
import { inventoryStore } from "@/lib/inventory-store";
import { sourceStore } from "@/lib/source-store";
import { mediaStore } from "@/lib/media-store";

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

  const exportData = {
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
    // Inventory items keep their image keys; the actual bytes are in the zip
    // under media/{key}.
    inventory,
    readerSources: sources,
  };

  const zip = new JSZip();
  zip.file("nearstream-export.json", JSON.stringify(exportData, null, 2));

  // Bundle every inventory image (original + thumbnail) as actual bytes so the
  // export is portable. Best-effort: a single image fetch failure doesn't
  // block the whole export — the JSON still has the keys, the user can fetch
  // missing files later from the running instance.
  if (mediaStore) {
    const m = mediaStore;
    const keys = new Set<string>();
    for (const item of inventory) {
      if (item.image?.key) keys.add(item.image.key);
      if (item.image?.thumbKey) keys.add(item.image.thumbKey);
    }

    await Promise.all(
      [...keys].map(async (key) => {
        try {
          const res = await m.getImage(key);
          if (!res.ok) return;
          const buf = Buffer.from(await res.arrayBuffer());
          zip.file(`media/${key}`, buf);
        } catch (err) {
          console.warn(`[export] failed to fetch media/${key}`, err);
        }
      }),
    );

    // README inside the zip, so a friend recovering content later knows what's
    // here without having to read code.
    zip.file(
      "README.txt",
      [
        "Nearstream export",
        "==================",
        "",
        `Exported: ${new Date().toISOString()}`,
        `User: ${user.displayName || user.handle} (${user.email})`,
        `Handle: /${user.handle}`,
        "",
        "Files:",
        "  nearstream-export.json — profile + Letter + Stream + Essays + Inventory metadata + Reader sources",
        "  media/                  — image bytes (originals + thumbnails). Filenames match `image.key` and `image.thumbKey` in the JSON.",
        "",
        "Re-importing into another Nearstream instance is a Phase 6 follow-up.",
        "For now this is a complete snapshot of everything you posted — yours forever.",
      ].join("\n"),
    );
  }

  const buf = await zip.generateAsync({ type: "nodebuffer" });
  const filename = `nearstream-${user.handle || "export"}-${new Date()
    .toISOString()
    .slice(0, 10)}.zip`;

  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
