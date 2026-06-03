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
  image: InventoryImage;
  description?: string;
  dimensions?: string;
  materials?: string;
  edition?: string;
  status?: InventoryStatus;
  price?: string;
  publishedAt: string;
};

export type NewInventoryItem = Omit<InventoryItem, "id" | "slug" | "publishedAt">;
