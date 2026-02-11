"use client";

import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatRelativeDate } from "@/lib/utils/date";
import type { FavoriteCollection } from "@/lib/db/collections";

interface FavoriteCollectionRowProps {
  collection: FavoriteCollection;
}

export default function FavoriteCollectionRow({
  collection,
}: FavoriteCollectionRowProps) {
  return (
    <Link
      href={`/collections/${collection.id}`}
      className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors rounded-sm group"
    >
      <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 min-w-0 font-mono text-sm text-foreground truncate">
        {collection.name}
      </span>
      <Badge variant="secondary" className="shrink-0 text-xs font-mono">
        {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
      </Badge>
      <span className="shrink-0 text-xs text-muted-foreground font-mono">
        {formatRelativeDate(collection.updatedAt)}
      </span>
    </Link>
  );
}
