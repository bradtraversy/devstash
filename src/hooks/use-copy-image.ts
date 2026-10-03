"use client";

import { useCallback } from "react";
import { toast } from "sonner";

/** Copies a PNG at a same-origin URL to the clipboard; the blob promise form is what Safari requires inside the click. */
export function useCopyImage(): { copyImage: (url: string, message?: string) => Promise<void> } {
  const copyImage = useCallback(async (url: string, message = "Image copied") => {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      toast.error("Copying images is not supported in this browser");
      return;
    }
    try {
      const blob = fetch(url).then(async (res) => {
        if (!res.ok) throw new Error(`Image request failed with ${res.status}`);
        return res.blob();
      });
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success(message);
    } catch {
      toast.error("Could not copy the image");
    }
  }, []);

  return { copyImage };
}
