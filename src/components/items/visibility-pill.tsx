import { Globe, Link2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getVisibilityOption, type CollectionVisibility } from "@/lib/constants/visibility";

const ICONS = { PRIVATE: Lock, UNLISTED: Link2, PUBLIC: Globe } as const;

interface VisibilityPillProps {
  visibility: CollectionVisibility;
  /** Icon only at every width, for tight spaces such as card footers. */
  compact?: boolean;
}

export default function VisibilityPill({ visibility, compact = false }: VisibilityPillProps) {
  const option = getVisibilityOption(visibility);
  const Icon = ICONS[visibility];
  const shared = visibility !== "PRIVATE";

  return (
    <span
      title={`${option.label}: ${option.description}`}
      className={cn(
        "inline-flex h-6 w-7 shrink-0 items-center justify-center gap-1 rounded-full text-xs",
        !compact && "sm:w-24",
        shared ? "bg-blue-500/15 text-blue-300" : "text-muted-foreground"
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span className={compact ? "sr-only" : "sr-only sm:not-sr-only"}>{option.label}</span>
    </span>
  );
}
