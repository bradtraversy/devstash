"use client";

import type { ReactNode } from "react";
import { useItemDrawer } from "@/components/items/item-drawer-provider";
import VisibilityPill from "@/components/items/visibility-pill";
import { CopyContentButton, ShareItemButton } from "@/components/items/item-actions";
import { CardPreview, ItemMarks, TypeIconTile, itemKindLabel } from "@/components/items/item-row-parts";
import ShortLinkText from "@/components/items/short-link-text";
import { formatRelativeDate } from "@/lib/utils/date";
import type { ItemWithType } from "@/lib/db/items";
import type { ItemDetailLine } from "@/components/items/item-row";
import type { HighlightedToken } from "@/lib/public/highlight";

interface ItemCodeCardProps {
  item: ItemWithType;
  preview?: HighlightedToken[][];
  trailing?: ReactNode;
  detail?: ItemDetailLine;
}

export default function ItemCodeCard({ item, preview, trailing, detail = "description" }: ItemCodeCardProps) {
  const { openDrawer } = useItemDrawer();

  return (
    <article className="group flex min-w-0 flex-col rounded-lg border border-border bg-card transition-colors hover:border-muted-foreground/50">
      <button
        type="button"
        onClick={() => openDrawer(item.id)}
        className="flex w-full min-w-0 items-center gap-2.5 px-3 pb-2 pt-3 text-left"
      >
        <TypeIconTile item={item} />
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{item.title}</span>
        <ItemMarks item={item} className="flex shrink-0 items-center gap-1" />
      </button>
      {detail === "link" && (
        <ShortLinkText
          shortId={item.shortId}
          className="-mt-1 block truncate px-3 pb-2 font-mono text-xs text-blue-300"
        />
      )}
      {/* The header button is the keyboard path; the preview is a larger mouse target for the same action. */}
      <div
        onClick={() => openDrawer(item.id)}
        className="mx-3 h-36 cursor-pointer overflow-hidden rounded-md border border-border bg-background px-3 py-2 [mask-image:linear-gradient(to_bottom,#000_70%,transparent)]"
      >
        <CardPreview item={item} preview={preview} />
      </div>
      <div className="flex items-center gap-1.5 px-3 pb-3 pt-2 text-xs text-muted-foreground">
        <span className="min-w-0 flex-1 truncate">
          {itemKindLabel(item)}
          <span className="ml-2">{formatRelativeDate(item.updatedAt)}</span>
        </span>
        <VisibilityPill visibility={item.visibility} sharedVia={item.sharedVia} compact />
        <CopyContentButton item={item} />
        <ShareItemButton item={item} compact />
        {trailing}
      </div>
    </article>
  );
}
