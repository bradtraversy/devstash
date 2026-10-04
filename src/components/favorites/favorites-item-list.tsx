"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import SortableSection from "@/components/shared/sortable-section";
import ItemList from "@/components/items/item-list";
import ListLayoutSwitch from "@/components/items/list-layout-switch";
import type { ItemWithType } from "@/lib/db/items";
import type { CodePreviews } from "@/lib/item-previews";
import type { ListLayout } from "@/lib/list-layout";
import {
  FAVORITE_SORT_OPTIONS,
  favoritesPath,
  parseFavoriteSort,
  type FavoriteItemSort,
} from "@/lib/favorites-sort";

interface FavoritesItemListProps {
  items: ItemWithType[];
  totalCount: number;
  sort: FavoriteItemSort;
  layout: ListLayout;
  previews?: CodePreviews;
}

/** Sorting runs on the server so it covers every page, not only the one on screen. */
export default function FavoritesItemList({ items, totalCount, sort, layout, previews }: FavoritesItemListProps) {
  const router = useRouter();
  const [shownSort, setShownSort] = useOptimistic(sort);
  const [, startTransition] = useTransition();

  return (
    <SortableSection
      title="Items"
      count={totalCount}
      sort={shownSort}
      onSortChange={(value) => {
        const next = parseFavoriteSort(value);
        startTransition(() => {
          setShownSort(next);
          router.push(favoritesPath(next));
        });
      }}
      options={FAVORITE_SORT_OPTIONS}
      actions={<ListLayoutSwitch layout={layout} />}
      unframed
    >
      <ItemList items={items} layout={layout} previews={previews} />
    </SortableSection>
  );
}
