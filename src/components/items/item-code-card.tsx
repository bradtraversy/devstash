"use client";

import type { ReactNode } from "react";
import { useItemDrawer } from "@/components/items/item-drawer-provider";
import VisibilityPill from "@/components/items/visibility-pill";
import { CopyContentButton, ShareItemButton } from "@/components/items/item-actions";
import { ItemMarks, TypeIconTile, itemKindLabel } from "@/components/items/item-row-parts";
import { formatRelativeDate } from "@/lib/utils/date";
import type { ItemWithType } from "@/lib/db/items";
import type { HighlightedToken } from "@/lib/public/highlight";

const PREVIEW_LINES = 7;

interface ItemCodeCardProps {
  item: ItemWithType;
  preview?: HighlightedToken[][];
  trailing?: ReactNode;
}

function Preview({ item, preview }: { item: ItemWithType; preview?: HighlightedToken[][] }) {
  if (preview) {
    return (
      <pre className="font-mono text-xs leading-relaxed text-[#d4d4d4]">
        {preview.map((line, index) => (
          <span key={index} className="block min-h-[1lh] whitespace-pre">
            {line.map((token, tokenIndex) => (
              <span key={tokenIndex} style={{ color: token.color }}>
                {token.content}
              </span>
            ))}
          </span>
        ))}
      </pre>
    );
  }

  if (item.itemType.name === "link") {
    return (
      <div className="space-y-2 text-sm">
        <p className="truncate font-mono text-xs text-blue-300">{item.url}</p>
        {item.description && <p className="text-muted-foreground">{item.description}</p>}
      </div>
    );
  }

  const text = (item.content ?? item.description ?? "").split("\n").slice(0, PREVIEW_LINES).join("\n");
  return <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{text}</p>;
}

export default function ItemCodeCard({ item, preview, trailing }: ItemCodeCardProps) {
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
      {/* The header button is the keyboard path; the preview is a larger mouse target for the same action. */}
      <div
        onClick={() => openDrawer(item.id)}
        className="mx-3 h-36 cursor-pointer overflow-hidden rounded-md border border-border bg-background px-3 py-2 [mask-image:linear-gradient(to_bottom,#000_70%,transparent)]"
      >
        <Preview item={item} preview={preview} />
      </div>
      <div className="flex items-center gap-1.5 px-3 pb-3 pt-2 text-xs text-muted-foreground">
        <span className="min-w-0 flex-1 truncate">
          {itemKindLabel(item)}
          <span className="ml-2">{formatRelativeDate(item.updatedAt)}</span>
        </span>
        <VisibilityPill visibility={item.visibility} compact />
        <CopyContentButton item={item} />
        <ShareItemButton item={item} compact />
        {trailing}
      </div>
    </article>
  );
}
