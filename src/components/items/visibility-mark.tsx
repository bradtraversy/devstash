import { Globe, Link2 } from "lucide-react";
import type { CollectionVisibility } from "@/lib/constants/visibility";

interface VisibilityMarkProps {
  visibility: CollectionVisibility;
  className?: string;
}

/** A small icon on cards and rows for anything that is not private; renders nothing for private. */
export default function VisibilityMark({
  visibility,
  className = "h-4 w-4 text-muted-foreground",
}: VisibilityMarkProps) {
  if (visibility === "PRIVATE") return null;

  const isPublic = visibility === "PUBLIC";
  const Icon = isPublic ? Globe : Link2;
  const title = isPublic ? "Public" : "Unlisted, anyone with the link can view";

  return (
    <span className="inline-flex shrink-0" role="img" title={title} aria-label={title}>
      <Icon className={className} />
    </span>
  );
}
