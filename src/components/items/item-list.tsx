"use client";

import type { ReactNode } from "react";
import ItemRow, { type ItemDetailLine } from "@/components/items/item-row";
import ItemCodeCard from "@/components/items/item-code-card";
import type { ItemWithType } from "@/lib/db/items";
import type { CodePreviews } from "@/lib/item-previews";
import type { ListLayout } from "@/lib/list-layout";

interface ItemListProps {
  items: ItemWithType[];
  layout: ListLayout;
  previews?: CodePreviews;
  trailing?: (item: ItemWithType, index: number) => ReactNode;
  detail?: ItemDetailLine;
}

export default function ItemList({ items, layout, previews, trailing, detail }: ItemListProps) {
  if (layout === "cards") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <ItemCodeCard
            key={item.id}
            item={item}
            preview={previews?.[item.id]}
            trailing={trailing?.(item, index)}
            detail={detail}
          />
        ))}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      {items.map((item, index) => (
        <ItemRow key={item.id} item={item} trailing={trailing?.(item, index)} detail={detail} />
      ))}
    </ul>
  );
}
