"use client";

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FavoriteItemRow from "@/components/favorites/favorite-item-row";
import type { ItemWithType } from "@/lib/db/items";

type SortOption = "name-asc" | "name-desc" | "date-desc" | "date-asc" | "type";

interface FavoritesItemListProps {
  items: ItemWithType[];
}

function sortItems(items: ItemWithType[], sort: SortOption): ItemWithType[] {
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

export default function FavoritesItemList({ items }: FavoritesItemListProps) {
  const [sort, setSort] = useState<SortOption>("date-desc");
  const sorted = useMemo(() => sortItems(items, sort), [items, sort]);

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Items ({items.length})
        </h2>
        <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
          <SelectTrigger size="sm" className="h-7 text-xs font-mono gap-1.5 border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest</SelectItem>
            <SelectItem value="date-asc">Oldest</SelectItem>
            <SelectItem value="name-asc">Name A-Z</SelectItem>
            <SelectItem value="name-desc">Name Z-A</SelectItem>
            <SelectItem value="type">Type</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="border border-border rounded-md divide-y divide-border bg-card">
        {sorted.map((item) => (
          <FavoriteItemRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
