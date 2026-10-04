"use client";

import type { ReactNode } from "react";
import { useItemDrawer } from "@/components/items/item-drawer-provider";
import VisibilityPill from "@/components/items/visibility-pill";
import { CopyContentButton, ShareItemButton } from "@/components/items/item-actions";
import { ItemMarks, TypeIconTile, itemKindLabel } from "@/components/items/item-row-parts";
import { formatRelativeDate } from "@/lib/utils/date";
import type { ItemWithType } from "@/lib/db/items";

interface ItemRowProps {
  item: ItemWithType;
  trailing?: ReactNode;
}

export default function ItemRow({ item, trailing }: ItemRowProps) {
  const { openDrawer } = useItemDrawer();

  return (
    <li className="group flex items-center gap-1 pr-2 transition-colors hover:bg-muted/50">
      <button
        type="button"
        onClick={() => openDrawer(item.id)}
        className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 text-left"
      >
        <TypeIconTile item={item} />
        <span className="flex min-w-0 flex-1 items-baseline gap-2.5 overflow-hidden">
          <span className="truncate font-medium text-foreground xl:max-w-[60%] xl:shrink-0">
            {item.title}
          </span>
          {item.description && (
            <span className="hidden truncate text-sm text-muted-foreground xl:inline">
              {item.description}
            </span>
          )}
        </span>
        <ItemMarks item={item} className="hidden shrink-0 items-center gap-1 sm:flex" />
        <span className="hidden w-24 shrink-0 truncate text-right text-xs text-muted-foreground xl:inline">
          {itemKindLabel(item)}
        </span>
        <VisibilityPill visibility={item.visibility} />
        <span className="hidden w-20 shrink-0 text-right text-xs text-muted-foreground lg:inline">
          {formatRelativeDate(item.updatedAt)}
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        <CopyContentButton item={item} className="hidden sm:inline-flex" />
        <ShareItemButton item={item} />
        {trailing}
      </div>
    </li>
  );
}
