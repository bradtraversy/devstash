"use client";

import type { ReactNode } from "react";
import { useItemDrawer } from "@/components/items/item-drawer-provider";
import VisibilityPill from "@/components/items/visibility-pill";
import { CopyContentButton, ShareItemButton } from "@/components/items/item-actions";
import { FileChip, ItemMarks, TypeIconTile } from "@/components/items/item-row-parts";
import ShortLinkText from "@/components/items/short-link-text";
import { cn } from "@/lib/utils";
import type { ItemWithType } from "@/lib/db/items";

export type ItemDetailLine = "description" | "link";

interface ItemRowProps {
  item: ItemWithType;
  trailing?: ReactNode;
  /** What follows the title: the description, or the readable share link. */
  detail?: ItemDetailLine;
}

export default function ItemRow({ item, trailing, detail = "description" }: ItemRowProps) {
  const { openDrawer } = useItemDrawer();
  const isLink = detail === "link";

  return (
    <li className="group flex items-center gap-1 pr-2 transition-colors hover:bg-muted/50">
      <button
        type="button"
        onClick={() => openDrawer(item.id)}
        className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 text-left"
      >
        <TypeIconTile item={item} />
        <span className="flex min-w-0 flex-1 items-baseline gap-2.5 overflow-hidden">
          <span
            className={cn(
              "truncate font-medium text-foreground",
              !isLink && "xl:max-w-[60%] xl:shrink-0"
            )}
          >
            {item.title}
          </span>
          {isLink ? (
            <ShortLinkText
              shortId={item.shortId}
              className="hidden shrink-0 font-mono text-xs text-blue-300 md:inline"
            />
          ) : (
            item.description && (
              <span className="hidden truncate text-sm text-muted-foreground xl:inline">
                {item.description}
              </span>
            )
          )}
        </span>
        <ItemMarks item={item} className="hidden shrink-0 items-center gap-1 sm:flex" />
        <span className="hidden w-[5.5rem] shrink-0 justify-end lg:flex">
          <FileChip item={item} />
        </span>
        <VisibilityPill visibility={item.visibility} sharedVia={item.sharedVia} />
      </button>
      <div className="flex shrink-0 items-center gap-1">
        <CopyContentButton item={item} className="hidden sm:inline-flex" />
        <ShareItemButton item={item} />
        {trailing}
      </div>
    </li>
  );
}
