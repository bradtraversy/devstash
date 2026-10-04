"use client";

import ItemList from "@/components/items/item-list";
import StopSharingButton from "@/components/sharing/stop-sharing-button";
import type { ItemWithType } from "@/lib/db/items";
import type { CodePreviews } from "@/lib/item-previews";
import type { ListLayout } from "@/lib/list-layout";

interface SharedItemListProps {
  items: ItemWithType[];
  layout: ListLayout;
  previews?: CodePreviews;
}

export default function SharedItemList({ items, layout, previews }: SharedItemListProps) {
  return (
    <ItemList
      items={items}
      layout={layout}
      previews={previews}
      detail="link"
      trailing={(item) => <StopSharingButton kind="item" id={item.id} />}
    />
  );
}
