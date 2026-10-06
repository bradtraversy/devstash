import { FolderOpen, Globe, Link2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  describeSharedVia,
  getVisibilityOption,
  type CollectionVisibility,
  type SharedViaCollection,
} from "@/lib/constants/visibility";

const ICONS = { PRIVATE: Lock, UNLISTED: Link2, PUBLIC: Globe } as const;

interface VisibilityPillProps {
  visibility: CollectionVisibility;
  /** Shared collections the item sits in; a private item in one reads as shared via it. */
  sharedVia?: SharedViaCollection[];
  /** Icon only at every width, for tight spaces such as card footers. */
  compact?: boolean;
}

export default function VisibilityPill({ visibility, sharedVia = [], compact = false }: VisibilityPillProps) {
  const option = getVisibilityOption(visibility);
  const viaCollection = visibility === "PRIVATE" ? describeSharedVia(sharedVia) : null;
  const Icon = viaCollection ? FolderOpen : ICONS[visibility];
  const shared = visibility !== "PRIVATE" || viaCollection !== null;

  return (
    <span
      title={viaCollection ?? `${option.label}: ${option.description}`}
      className={cn(
        "inline-flex h-6 w-7 shrink-0 items-center justify-center gap-1 rounded-full text-xs",
        !compact && "sm:w-24",
        shared ? "bg-blue-500/15 text-blue-300" : "text-muted-foreground"
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {viaCollection ? (
        <>
          <span aria-hidden="true" className={compact ? "hidden" : "hidden sm:inline"}>
            Via collection
          </span>
          <span className="sr-only">{viaCollection}</span>
        </>
      ) : (
        // Private reads as a quiet lock so the shared pills stand out down a list.
        <span className={compact || !shared ? "sr-only" : "sr-only sm:not-sr-only"}>{option.label}</span>
      )}
    </span>
  );
}
