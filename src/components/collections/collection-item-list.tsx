"use client";

import ItemList from "@/components/items/item-list";
import CollectionMoveButtons from "@/components/collections/collection-move-buttons";
import type { ItemWithType } from "@/lib/db/items";
import type { CodePreviews } from "@/lib/item-previews";
import type { ListLayout } from "@/lib/list-layout";

interface CollectionItemListProps {
  items: ItemWithType[];
  collectionId: string;
  layout: ListLayout;
  previews?: CodePreviews;
  currentPage: number;
  totalPages: number;
}

export default function CollectionItemList({
  items,
  collectionId,
  layout,
  previews,
  currentPage,
  totalPages,
}: CollectionItemListProps) {
  return (
    <ItemList
      items={items}
      layout={layout}
      previews={previews}
      trailing={(item, index) => (
        <CollectionMoveButtons
          itemId={item.id}
          collectionId={collectionId}
          isFirst={currentPage === 1 && index === 0}
          isLast={currentPage >= totalPages && index === items.length - 1}
        />
      )}
    />
  );
}
