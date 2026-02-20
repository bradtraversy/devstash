"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Star, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EditCollectionDialog from "@/components/collections/edit-collection-dialog";
import DeleteCollectionDialog from "@/components/collections/delete-collection-dialog";
import { deleteCollection, toggleCollectionFavorite } from "@/actions/collections";
import { toast } from "sonner";
import { getItemTypeIcon } from "@/lib/constants/item-types";
import type { CollectionItemType } from "@/lib/db/collections";

interface CollectionCardProps {
  collection: {
    id: string;
    name: string;
    description: string | null;
    isFavorite: boolean;
    itemCount: number;
    itemTypes: CollectionItemType[];
    dominantColor: string | null;
  };
}

export default function CollectionCard({ collection }: CollectionCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const borderStyle = collection.dominantColor
    ? { borderLeftColor: collection.dominantColor, borderLeftWidth: "3px" }
    : {};

  const handleCardClick = () => {
    router.push(`/collections/${collection.id}`);
  };

  const handleToggleFavorite = async () => {
    const result = await toggleCollectionFavorite(collection.id);

    if (result.success && result.data) {
      toast.success(result.data.isFavorite ? "Added to favorites" : "Removed from favorites");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update favorite");
    }
  };

  const handleDelete = async () => {
    const result = await deleteCollection({ id: collection.id });

    if (result.success) {
      toast.success("Collection deleted successfully");
      setDeleteOpen(false);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to delete collection");
    }
  };

  return (
    <>
      <Card
        className="group relative bg-card border-border hover:border-muted-foreground/50 transition-colors cursor-pointer py-0"
        style={borderStyle}
        onClick={handleCardClick}
      >
        <CardContent className="px-4 py-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{collection.name}</h3>
              {collection.isFavorite && (
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggleFavorite}>
                  <Star className="h-4 w-4" />
                  {collection.isFavorite ? "Unfavorite" : "Favorite"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
          </p>
          {collection.description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {collection.description}
            </p>
          )}
          {collection.itemTypes.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              {collection.itemTypes.map((itemType) => {
                const IconComponent = getItemTypeIcon(itemType.icon);
                return (
                  <IconComponent
                    key={itemType.name}
                    className="h-4 w-4"
                    style={{ color: itemType.color }}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <EditCollectionDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        collection={collection}
      />

      <DeleteCollectionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        collectionName={collection.name}
        onConfirm={handleDelete}
      />
    </>
  );
}
