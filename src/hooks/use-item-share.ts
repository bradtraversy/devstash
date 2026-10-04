"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setItemVisibility } from "@/actions/items";
import { useClipboard } from "@/hooks/use-clipboard";
import { useOrigin } from "@/hooks/use-origin";
import { publicShortPath } from "@/lib/public/paths";
import { copyWhenReady } from "@/lib/clipboard";
import type { ItemWithType } from "@/lib/db/items";

type ShareableItem = Pick<ItemWithType, "id" | "shortId" | "visibility">;

/** Share copies the link of a shared item, or makes a private one unlisted first. */
export function useItemShare() {
  const router = useRouter();
  const origin = useOrigin();
  const { copy } = useClipboard();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const share = useCallback(
    async (item: ShareableItem) => {
      const link = `${origin}${publicShortPath(item.shortId)}`;
      if (item.visibility !== "PRIVATE") {
        await copy(link, "Link copied");
        return;
      }

      setPendingId(item.id);
      const write = setItemVisibility({ id: item.id, visibility: "UNLISTED" })
        .catch(() => ({ success: false as const, error: undefined }));
      const copied = copyWhenReady(
        write.then((result) => {
          if (!result.success) throw new Error("not shared");
          return link;
        })
      );
      copied.catch(() => {});

      const result = await write;
      if (!result.success) {
        setPendingId(null);
        toast.error(result.error || "Failed to share");
        return;
      }

      try {
        await copied;
        toast.success("Shared with a link. Link copied.");
      } catch {
        toast.success("Shared with a link. Copy it from the row.");
      }
      // Pending clears with the refreshed row, so a second click cannot repeat the write.
      startTransition(() => {
        router.refresh();
        setPendingId(null);
      });
    },
    [copy, origin, router]
  );

  return { share, pendingId };
}
