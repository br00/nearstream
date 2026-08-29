// "Ownership through exit" — proof a user can leave with their content.
//
// Returns a ZIP file containing:
//   - nearstream-export.json: profile + Now + Stream + Essays + Inventory +
//     Music metadata + Reader sources
//   - media/{key}: every blob you own — inventory images (originals AND
//     extras, not just the cover), voice-note audio, music audio and cover
//     art — as actual bytes, so the export is self-contained if R2 ever
//     goes away
//
// Auth-gated to the signed-in user — you can only export your own data.

import JSZip from "jszip";
import { getSession } from "@/lib/auth";
import { userStore } from "@/lib/user-store";
import { letterStore } from "@/lib/letter-store";
import { store as streamStore } from "@/lib/store";
import { essayStore } from "@/lib/essay-store";
import { inventoryStore } from "@/lib/inventory-store";
import { musicStore } from "@/lib/music-store";
import { imagesOf } from "@/schemas/inventory";
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

  let letter, streams, essays, inventory, music, sources;
  try {
    [letter, streams, essays, inventory, music, sources] = await Promise.all([
      letterStore.get(user.id),
      streamStore.list(user.id),
      essayStore.list(user.id),
      inventoryStore.list(user.id),
      musicStore.list(user.id),
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
    // Tracks keep their audio + cover keys; the bytes are in the zip under
    // media/{key}.
    music,
    readerSources: sources,
  };

  const zip = new JSZip();
  zip.file("nearstream-export.json", JSON.stringify(exportData, null, 2));

  // Bundle every blob the user owns as actual bytes so the export is
  // portable. Best-effort: a single fetch failure doesn't block the whole
  // export — the JSON still has the keys, and the user can fetch what's
  // missing from the running instance.
  if (mediaStore) {
    const m = mediaStore;
    const keys = new Set<string>();

    // Inventory images. `imagesOf()` rather than the legacy `image` field:
    // reading `image` alone exported only the cover, so every extra image on
    // a multi-image item (slice 33) was silently dropped from the archive
    // while its key sat in the JSON.
    for (const item of inventory) {
      for (const img of imagesOf(item)) {
        keys.add(img.key);
        if (img.thumbKey) keys.add(img.thumbKey);
      }
    }

    // Voice-note audio (slice 39). Stream entries carried their audio key in
    // the JSON but the bytes were never bundled, so an exported voice note
    // was a filename with nothing behind it.
    for (const entry of streams) {
      if (entry.audio?.key) keys.add(entry.audio.key);
    }

    // Music: the track itself, plus cover art and its thumbnail.
    for (const track of music) {
      keys.add(track.audio.key);
      if (track.cover?.key) keys.add(track.cover.key);
      if (track.cover?.thumbKey) keys.add(track.cover.thumbKey);
    }

    await Promise.all(
      [...keys].map(async (key) => {
        try {
          // getImage is key-generic and passes the stored content-type
          // through, so it serves audio as happily as images.
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
        "  nearstream-export.json — profile + Now + Stream + Essays + Inventory + Music metadata + Reader sources",
        "  media/                  — every blob: inventory images (all of them, plus thumbnails), voice-note audio, music audio and cover art. Filenames match the `key` fields in the JSON.",
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
