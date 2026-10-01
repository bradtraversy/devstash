"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

interface UseClipboardReturn {
  copied: boolean;
  copy: (text: string, message?: string) => Promise<void>;
}

/**
 * Hook for copying text to clipboard with success/error feedback
 * @returns { copied, copy } - copied state and copy function
 */
export function useClipboard(): UseClipboardReturn {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string, message = "Copied to clipboard") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(message);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, []);

  return { copied, copy };
}
