"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import NewItemDialog, { type ItemTypeName } from "./new-item-dialog";
import { isProEnabled } from "@/lib/plans";
import ListLayoutSwitch from "./list-layout-switch";
import type { ListLayout } from "@/lib/list-layout";

interface ItemsPageHeaderProps {
  typeName: string;
  displayName: string;
  itemCount: number;
  isPro?: boolean;
  /** Shows the Rows and Code cards switch when set. */
  layout?: ListLayout;
}

export default function ItemsPageHeader({
  typeName,
  displayName,
  itemCount,
  isPro,
  layout,
}: ItemsPageHeaderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  // While Pro is off, existing file and image items stay readable but no new ones are made.
  const canCreate = isProEnabled() || (typeName !== "file" && typeName !== "image");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
          <p className="text-muted-foreground">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {layout && <ListLayoutSwitch layout={layout} />}
          {canCreate && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New {typeName.charAt(0).toUpperCase() + typeName.slice(1)}
            </Button>
          )}
        </div>
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
