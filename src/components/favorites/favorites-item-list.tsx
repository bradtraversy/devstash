"use client";

import { useMemo, useState } from "react";
import SortableSection from "@/components/shared/sortable-section";
import ItemList from "@/components/items/item-list";
import ListLayoutSwitch from "@/components/items/list-layout-switch";
import type { ItemWithType } from "@/lib/db/items";
import type { CodePreviews } from "@/lib/item-previews";
import type { ListLayout } from "@/lib/list-layout";

type SortKey = "name-asc" | "name-desc" | "date-desc" | "date-asc" | "type";

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest" },
  { value: "date-asc", label: "Oldest" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
  { value: "type", label: "Type" },
];

interface FavoritesItemListProps {
  items: ItemWithType[];
  layout: ListLayout;
  previews?: CodePreviews;
}

function sortItems(items: ItemWithType[], sort: SortKey): ItemWithType[] {
  return [...items].sort((a, b) => {
    switch (sort) {
      case "name-asc":
        return a.title.localeCompare(b.title);
      case "name-desc":
        return b.title.localeCompare(a.title);
      case "date-desc":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case "date-asc":
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case "type":
        return a.itemType.name.localeCompare(b.itemType.name) || a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });
}

export default function FavoritesItemList({ items, layout, previews }: FavoritesItemListProps) {
  const [sort, setSort] = useState<SortKey>("date-desc");
  const sorted = useMemo(() => sortItems(items, sort), [items, sort]);

  return (
    <SortableSection
      title="Items"
      count={items.length}
      sort={sort}
      onSortChange={(v) => setSort(v as SortKey)}
      options={SORT_OPTIONS}
      actions={<ListLayoutSwitch layout={layout} />}
      unframed
    >
      <ItemList items={sorted} layout={layout} previews={previews} />
    </SortableSection>
  );
}
