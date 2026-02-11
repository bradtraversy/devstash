"use client";

import { Badge } from "@/components/ui/badge";
import { getItemTypeIcon } from "@/lib/constants/item-types";
import { formatRelativeDate } from "@/lib/utils/date";
import { useItemDrawer } from "@/components/items/item-drawer-provider";
import type { ItemWithType } from "@/lib/db/items";

interface FavoriteItemRowProps {
  item: ItemWithType;
}

export default function FavoriteItemRow({ item }: FavoriteItemRowProps) {
  const { openDrawer } = useItemDrawer();
  const IconComponent = getItemTypeIcon(item.itemType.icon);
  const iconColor = item.itemType.color;

  return (
    <button
      type="button"
      onClick={() => openDrawer(item.id)}
      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors rounded-sm group"
    >
      <IconComponent
        className="h-4 w-4 shrink-0"
        style={{ color: iconColor }}
      />
      <span className="flex-1 min-w-0 font-mono text-sm text-foreground truncate">
        {item.title}
      </span>
      <Badge
        variant="outline"
        className="shrink-0 text-xs font-mono capitalize"
        style={{ borderColor: iconColor, color: iconColor }}
      >
        {item.itemType.name}
      </Badge>
      <span className="shrink-0 text-xs text-muted-foreground font-mono">
        {formatRelativeDate(item.updatedAt)}
      </span>
    </button>
  );
}
