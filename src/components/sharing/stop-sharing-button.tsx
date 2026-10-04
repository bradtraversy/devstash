"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setItemVisibility } from "@/actions/items";
import { setCollectionVisibility } from "@/actions/collections";

interface StopSharingButtonProps {
  kind: "item" | "collection";
  id: string;
}

/** Makes an item or collection private; short ids never change, so sharing again restores the same link. */
export default function StopSharingButton({ kind, id }: StopSharingButtonProps) {
  const router = useRouter();
  const [isWriting, setIsWriting] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const busy = isWriting || isRefreshing;

  const stop = async () => {
    setIsWriting(true);
    const write = kind === "item" ? setItemVisibility : setCollectionVisibility;
    const result = await write({ id, visibility: "PRIVATE" })
      .catch(() => ({ success: false as const, error: undefined }))
      .finally(() => setIsWriting(false));

    if (!result.success) {
      toast.error(result.error || "Failed to stop sharing");
      return;
    }
    toast.success("Stopped sharing. Share it again to bring the same link back.");
    startTransition(() => router.refresh());
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
      disabled={busy}
      onClick={stop}
      title="Stop sharing"
      aria-label="Stop sharing"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
    </Button>
  );
}
