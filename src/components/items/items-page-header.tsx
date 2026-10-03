"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import NewItemDialog, { type ItemTypeName } from "./new-item-dialog";
import { isProEnabled } from "@/lib/plans";

interface ItemsPageHeaderProps {
  typeName: string;
  displayName: string;
  itemCount: number;
  isPro?: boolean;
}

export default function ItemsPageHeader({
  typeName,
  displayName,
  itemCount,
  isPro,
}: ItemsPageHeaderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  // While Pro is off, existing file and image items stay readable but no new ones are made.
  const canCreate = isProEnabled() || (typeName !== "file" && typeName !== "image");

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
          <p className="text-muted-foreground">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New {typeName.charAt(0).toUpperCase() + typeName.slice(1)}
          </Button>
        )}
      </div>

      <NewItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultType={typeName as ItemTypeName}
        isPro={isPro}
      />
    </>
  );
}
