"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Code } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { moveCollectionItem } from "@/actions/collections";
import { ITEM_TYPE_ICONS } from "@/lib/constants/item-types";
import { formatRelativeDate } from "@/lib/utils/date";
import { useItemDrawer } from "@/components/items/item-drawer-provider";
import type { ItemWithType } from "@/lib/db/items";
import type { MoveDirection } from "@/lib/db/collections";

interface CollectionItemRowProps {
  item: ItemWithType;
  collectionId: string;
  isFirst: boolean;
  isLast: boolean;
}

export default function CollectionItemRow({
  item,
  collectionId,
  isFirst,
  isLast,
}: CollectionItemRowProps) {
  const router = useRouter();
  const { openDrawer } = useItemDrawer();
  const [isPending, startTransition] = useTransition();
  const [isMoving, setIsMoving] = useState(false);
  const IconComponent = ITEM_TYPE_ICONS[item.itemType.icon] ?? Code;
  const iconColor = item.itemType.color;
  const busy = isMoving || isPending;

  const move = async (direction: MoveDirection) => {
    setIsMoving(true);
    const result = await moveCollectionItem({ collectionId, itemId: item.id, direction });
    setIsMoving(false);

    if (result.success) {
      startTransition(() => {
        router.refresh();
      });
    } else {
      toast.error(result.error || "Failed to move item");
    }
  };

  return (
    <div className="group flex items-center gap-1 rounded-sm transition-colors hover:bg-muted/50">
      <button
        type="button"
        onClick={() => openDrawer(item.id)}
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left"
      >
        <IconComponent className="h-4 w-4 shrink-0" style={{ color: iconColor }} />
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
          {item.title}
        </span>
        <Badge
          variant="outline"
          className="shrink-0 font-mono text-xs capitalize"
          style={{ borderColor: iconColor, color: iconColor }}
        >
          {item.itemType.name}
        </Badge>
        <span className="hidden shrink-0 font-mono text-xs text-muted-foreground sm:inline">
          {formatRelativeDate(item.updatedAt)}
        </span>
      </button>
      <div className="flex shrink-0 items-center pr-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={isFirst || busy}
          onClick={() => move("up")}
          title="Move up"
          aria-label="Move up"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={isLast || busy}
          onClick={() => move("down")}
          title="Move down"
          aria-label="Move down"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
