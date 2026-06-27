import type { Visibility } from "@/schemas/visibility";

export { slugify, isValidSlug } from "@/lib/slug";

export const INVENTORY_STATUSES = [
  "available",
  "sold",
  "archived",
] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

export function isInventoryStatus(value: unknown): value is InventoryStatus {
  return (
    typeof value === "string" &&
    (INVENTORY_STATUSES as readonly string[]).includes(value)
  );
}

export type InventoryImage = {
  key: string;
  contentType: string;
  sizeBytes: number;
  thumbKey?: string;
  width?: number;
  height?: number;
};

export type InventoryItem = {
  id: string;
  slug: string;
  title: string;
  /** Legacy single-image field. Items created before slice 33 carry this
   *  and have an empty `images`. New items always populate `images` and
   *  mirror `images[0]` into `image` for one release so any reader still
   *  reading the old field doesn't break. Use `imagesOf()` on the read
   *  side — never read `image` or `images` directly. */
  image?: InventoryImage;
  /** Ordered list of images. `images[0]` is the cover (used by the reader
   *  card and as the RSS `nearstream:thumbnail`). May be empty for legacy
   *  items; callers should fall through to `image` via `imagesOf()`. */
  images?: InventoryImage[];
  description?: string;
  dimensions?: string;
  materials?: string;
  edition?: string;
  status?: InventoryStatus;
  price?: string;
  publishedAt: string;
  visibility?: Visibility;
};

/** Read-side helper: returns the canonical image list whether the item was
 *  created before slice 33 (one `image`) or after (an `images` array).
 *  Always returns at least one entry for a valid stored item. */
export function imagesOf(item: InventoryItem): InventoryImage[] {
  if (item.images && item.images.length > 0) return item.images;
  if (item.image) return [item.image];
  return [];
}

export type NewInventoryItem = Omit<InventoryItem, "id" | "slug" | "publishedAt">;
