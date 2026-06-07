import { revalidatePath } from "next/cache";
import { inventoryStore } from "@/lib/inventory-store";
import { slugify, isInventoryStatus } from "@/schemas/inventory";
import type { InventoryImage, NewInventoryItem } from "@/schemas/inventory";
import { isAllowedContentType } from "@/lib/media-store";
import { getSession } from "@/lib/auth";

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
    description,
    dimensions,
    materials,
    edition,
    status,
    price,
  } = body as Record<string, unknown>;

  if (typeof title !== "string" || title.trim().length === 0) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }
  if (title.length > TITLE_MAX) {
    return Response.json(
      { error: `title must be ${TITLE_MAX} characters or fewer` },
      { status: 400 },
    );
  }

  const validatedImage = validateImage(image);
  if (typeof validatedImage === "string") {
    return Response.json({ error: validatedImage }, { status: 400 });
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
    image: validatedImage,
    description: fields.description,
    dimensions: fields.dimensions,
    materials: fields.materials,
    edition: fields.edition,
    status: validatedStatus,
    price: fields.price,
  });

  revalidatePath("/library/inventory");
  revalidatePath(`/library/inventory/${item.slug}`);
  revalidatePath("/library");

  return Response.json({ item }, { status: 201 });
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
