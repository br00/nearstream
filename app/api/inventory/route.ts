import { revalidatePath } from "next/cache";
import { inventoryStore } from "@/lib/inventory-store";
import { slugify, isInventoryStatus } from "@/schemas/inventory";
import { isVisibility, type Visibility } from "@/schemas/visibility";
import type { InventoryImage, NewInventoryItem } from "@/schemas/inventory";
import { isAllowedContentType } from "@/lib/media-store";
import { getSession } from "@/lib/auth";
import { userStore } from "@/lib/user-store";
import { tenantBase } from "@/lib/tenant-domains";

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 50_000;
const STRING_FIELD_MAX = 200;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const items = await inventoryStore.list(session.userId);
  return Response.json({ items });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const {
    title,
    image,
    images,
    description,
    dimensions,
    materials,
    edition,
    status,
    price,
    visibility: rawVisibility,
  } = body as Record<string, unknown>;

  const visibility: Visibility = isVisibility(rawVisibility)
    ? rawVisibility
    : "public";

  if (typeof title !== "string" || title.trim().length === 0) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }
  if (title.length > TITLE_MAX) {
    return Response.json(
      { error: `title must be ${TITLE_MAX} characters or fewer` },
      { status: 400 },
    );
  }

  // Multi-image is the new shape (slice 33). Single `image` is still
  // accepted from any client that hasn't been updated; we normalize to
  // an array so the store sees one path. images[0] is the cover.
  const validatedImages = validateImages(images, image);
  if (typeof validatedImages === "string") {
    return Response.json({ error: validatedImages }, { status: 400 });
  }

  const trimmedTitle = title.trim();
  const slug = slugify(trimmedTitle);
  if (slug.length === 0) {
    return Response.json(
      { error: "title must contain at least one letter or number" },
      { status: 400 },
    );
  }
  const existing = await inventoryStore.getBySlug(session.userId, slug);
  if (existing) {
    return Response.json(
      {
        error: `an inventory item with the slug "${slug}" already exists — pick a different title`,
      },
      { status: 409 },
    );
  }

  const optionalString = (
    value: unknown,
    field: string,
  ): string | undefined | { error: string } => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value !== "string") {
      return { error: `${field} must be a string` };
    }
    if (field === "description") {
      if (value.length > DESCRIPTION_MAX) {
        return {
          error: `description must be ${DESCRIPTION_MAX} characters or fewer`,
        };
      }
    } else if (value.length > STRING_FIELD_MAX) {
      return {
        error: `${field} must be ${STRING_FIELD_MAX} characters or fewer`,
      };
    }
    return value.trim() || undefined;
  };

  const fields: Record<string, string | undefined> = {};
  for (const [name, raw] of [
    ["description", description],
    ["dimensions", dimensions],
    ["materials", materials],
    ["edition", edition],
    ["price", price],
  ] as const) {
    const out = optionalString(raw, name);
    if (typeof out === "object" && out && "error" in out) {
      return Response.json({ error: out.error }, { status: 400 });
    }
    fields[name] = out;
  }

  let validatedStatus: NewInventoryItem["status"];
  if (status !== undefined && status !== null && status !== "") {
    if (!isInventoryStatus(status)) {
      return Response.json(
        { error: "status must be available, sold, or archived" },
        { status: 400 },
      );
    }
    validatedStatus = status;
  }

  const item = await inventoryStore.add(session.userId, {
    title: trimmedTitle,
    // Mirror images[0] into the legacy `image` field for one release so
    // any older read path that still touches `image` directly keeps
    // working. The read-side `imagesOf()` helper is the canonical path.
    image: validatedImages[0],
    images: validatedImages,
    description: fields.description,
    dimensions: fields.dimensions,
    materials: fields.materials,
    edition: fields.edition,
    status: validatedStatus,
    price: fields.price,
    visibility,
  });

  const user = await userStore.getById(session.userId);
  const handle = user?.handle ?? "";
  revalidatePath(`/${handle}`);
  revalidatePath(`/${handle}/library`);
  revalidatePath(`/${handle}/library/inventory`);
  revalidatePath(`/${handle}/library/inventory/${item.slug}`);
  revalidatePath(`/${handle}/rss.xml`);

  const redirectTo = `${tenantBase(handle)}/library/inventory/${item.slug}`;
  return Response.json({ item, redirectTo }, { status: 201 });
}

// Validate the cover + extras as a single canonical array. Accepts the
// new `images` field (array of image objects) or the legacy `image`
// field (a single object); rejects both being missing. Cap matches the
// upload-url route's MAX_IMAGES so the two limits don't drift.
const MAX_IMAGES = 12;
function validateImages(
  imagesValue: unknown,
  legacyImage: unknown,
): InventoryImage[] | string {
  let raw: unknown[];
  if (Array.isArray(imagesValue) && imagesValue.length > 0) {
    raw = imagesValue;
  } else if (legacyImage && typeof legacyImage === "object") {
    raw = [legacyImage];
  } else {
    return "at least one image is required";
  }
  if (raw.length > MAX_IMAGES) {
    return `too many images (max ${MAX_IMAGES} per item)`;
  }
  const out: InventoryImage[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r = validateImage(raw[i]);
    if (typeof r === "string") return `images[${i}]: ${r.replace(/^image\./, "")}`;
    out.push(r);
  }
  return out;
}

function validateImage(value: unknown): InventoryImage | string {
  if (!value || typeof value !== "object") return "image is required";
  const { key, contentType, sizeBytes, thumbKey, width, height } =
    value as Record<string, unknown>;

  if (
    typeof key !== "string" ||
    key.length === 0 ||
    key.includes("/") ||
    key.includes("..")
  ) {
    return "image.key is invalid";
  }
  if (!isAllowedContentType(contentType)) {
    return "image.contentType is not allowed";
  }
  if (
    typeof sizeBytes !== "number" ||
    sizeBytes <= 0 ||
    !Number.isFinite(sizeBytes)
  ) {
    return "image.sizeBytes is invalid";
  }

  const result: InventoryImage = { key, contentType, sizeBytes };

  if (thumbKey !== undefined && thumbKey !== null) {
    if (
      typeof thumbKey !== "string" ||
      thumbKey.length === 0 ||
      thumbKey.includes("/") ||
      thumbKey.includes("..")
    ) {
      return "image.thumbKey is invalid";
    }
    result.thumbKey = thumbKey;
  }

  if (width !== undefined && width !== null) {
    if (
      typeof width !== "number" ||
      width <= 0 ||
      !Number.isFinite(width)
    ) {
      return "image.width is invalid";
    }
    result.width = Math.round(width);
  }
  if (height !== undefined && height !== null) {
    if (
      typeof height !== "number" ||
      height <= 0 ||
      !Number.isFinite(height)
    ) {
      return "image.height is invalid";
    }
    result.height = Math.round(height);
  }

  return result;
}
