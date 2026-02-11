"use client";

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FavoriteCollectionRow from "@/components/favorites/favorite-collection-row";
import type { FavoriteCollection } from "@/lib/db/collections";

type SortOption = "name-asc" | "name-desc" | "date-desc" | "date-asc";

interface FavoritesCollectionListProps {
  collections: FavoriteCollection[];
}

function sortCollections(
  collections: FavoriteCollection[],
  sort: SortOption
): FavoriteCollection[] {
  return [...collections].sort((a, b) => {
    switch (sort) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "date-desc":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case "date-asc":
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      default:
        return 0;
    }
  });
}

export default function FavoritesCollectionList({
  collections,
}: FavoritesCollectionListProps) {
  const [sort, setSort] = useState<SortOption>("date-desc");
  const sorted = useMemo(
    () => sortCollections(collections, sort),
    [collections, sort]
  );

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Collections ({collections.length})
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
          </SelectContent>
        </Select>
      </div>
      <div className="border border-border rounded-md divide-y divide-border bg-card">
        {sorted.map((collection) => (
          <FavoriteCollectionRow key={collection.id} collection={collection} />
        ))}
      </div>
    </section>
  );
}
