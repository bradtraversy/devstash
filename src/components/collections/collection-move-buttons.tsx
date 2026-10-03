"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { moveCollectionItem } from "@/actions/collections";
import type { MoveDirection } from "@/lib/db/collections";

interface CollectionMoveButtonsProps {
  itemId: string;
  collectionId: string;
  isFirst: boolean;
  isLast: boolean;
}

export default function CollectionMoveButtons({
  itemId,
  collectionId,
  isFirst,
  isLast,
}: CollectionMoveButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isMoving, setIsMoving] = useState(false);
  const busy = isMoving || isPending;

  const move = async (direction: MoveDirection) => {
    setIsMoving(true);
    const result = await moveCollectionItem({ collectionId, itemId, direction });
    setIsMoving(false);

    if (result.success) {
      startTransition(() => {
        router.refresh();
      });
    } else {
      toast.error(result.error || "Failed to move item");
    }
  };

  return (
    <div className="flex shrink-0 items-center">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={isFirst || busy}
        onClick={() => move("up")}
        title="Move up"
        aria-label="Move up"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={isLast || busy}
        onClick={() => move("down")}
        title="Move down"
        aria-label="Move down"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
