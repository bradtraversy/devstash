import { Code, Pin, Star } from "lucide-react";
import { ITEM_TYPE_ICONS } from "@/lib/constants/item-types";
import { languageLabel } from "@/lib/languages";
import type { ItemWithType } from "@/lib/db/items";

const CODE_TYPES = ["snippet", "command"];

export function TypeIconTile({ item }: { item: ItemWithType }) {
  const Icon = ITEM_TYPE_ICONS[item.itemType.icon] ?? Code;
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
      style={{ backgroundColor: `${item.itemType.color}1f`, color: item.itemType.color }}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

export function ItemMarks({ item, className }: { item: ItemWithType; className?: string }) {
  if (!item.isPinned && !item.isFavorite) return null;
  return (
    <span className={className}>
      {item.isPinned && <Pin className="h-3.5 w-3.5 text-muted-foreground" aria-label="Pinned" />}
      {item.isFavorite && <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" aria-label="Favorite" />}
    </span>
  );
}

/** The language for code, the type name for everything else. */
export function itemKindLabel(item: ItemWithType): string {
  if (CODE_TYPES.includes(item.itemType.name) && item.language) return languageLabel(item.language);
  return item.itemType.name.charAt(0).toUpperCase() + item.itemType.name.slice(1);
}
