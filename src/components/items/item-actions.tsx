"use client";

import { Check, Copy, Link2, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useClipboard } from "@/hooks/use-clipboard";
import { useItemShare } from "@/hooks/use-item-share";
import type { ItemWithType } from "@/lib/db/items";

export function CopyContentButton({ item, className }: { item: ItemWithType; className?: string }) {
  const { copied, copy } = useClipboard();
  const text = item.content || item.url;
  if (!text) return null;
  const label = item.itemType.name === "link" ? "Copy URL" : "Copy content";

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8 text-muted-foreground", className)}
      onClick={() => copy(text, item.itemType.name === "link" ? "URL copied" : "Copied to clipboard")}
      title={label}
      aria-label={label}
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

interface ShareItemButtonProps {
  item: ItemWithType;
  /** Icon only at every width, for tight spaces such as card footers. */
  compact?: boolean;
}

/** Share on a private item, Copy link on a shared one; files are never shared. */
export function ShareItemButton({ item, compact = false }: ShareItemButtonProps) {
  const { share, pendingId } = useItemShare();
  if (item.itemType.name === "file") return null;

  const shared = item.visibility !== "PRIVATE";
  const pending = pendingId === item.id;
  const Icon = pending ? Loader2 : shared ? Link2 : Share2;
  const label = shared ? "Copy link" : pending ? "Sharing" : "Share";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => share(item)}
      title={shared ? "Copy the share link" : "Share with a link and copy it"}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-border text-sm font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-70",
        !compact && "sm:w-28",
        shared
          ? "hover:bg-accent hover:text-foreground"
          : "group-hover:border-blue-500/50 group-hover:bg-blue-500/10 group-hover:text-blue-300 group-focus-within:border-blue-500/50 group-focus-within:text-blue-300 hover:bg-blue-500/20 hover:text-blue-200"
      )}
    >
      <Icon className={cn("h-4 w-4", pending && "animate-spin")} aria-hidden="true" />
      <span className={compact ? "sr-only" : "sr-only sm:not-sr-only"}>{label}</span>
    </button>
  );
}
