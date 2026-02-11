"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Star } from "lucide-react";
import EditCollectionDialog from "./edit-collection-dialog";
import DeleteCollectionDialog from "./delete-collection-dialog";
import { deleteCollection, toggleCollectionFavorite } from "@/actions/collections";
import { toast } from "sonner";

interface CollectionActionsProps {
  collection: {
    id: string;
    name: string;
    description: string | null;
    isFavorite: boolean;
  };
}

export default function CollectionActions({ collection }: CollectionActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
      router.replace("/collections");
    } else {
      toast.error(result.error || "Failed to delete collection");
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setEditOpen(true)}
          title="Edit collection"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleToggleFavorite}
          title={collection.isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Star
            className={`h-4 w-4 ${
              collection.isFavorite ? "fill-yellow-500 text-yellow-500" : ""
            }`}
          />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setDeleteOpen(true)}
          title="Delete collection"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

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
