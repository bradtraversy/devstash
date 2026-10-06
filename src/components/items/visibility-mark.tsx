import { FolderOpen, Globe, Link2 } from "lucide-react";
import {
  describeSharedVia,
  type CollectionVisibility,
  type SharedViaCollection,
} from "@/lib/constants/visibility";

interface VisibilityMarkProps {
  visibility: CollectionVisibility;
  /** Shared collections the item sits in; a private item in one gets a folder mark. */
  sharedVia?: SharedViaCollection[];
  className?: string;
}

/** A small icon on cards and rows for anything others can see; renders nothing for private. */
export default function VisibilityMark({
  visibility,
  sharedVia = [],
  className = "h-4 w-4 text-muted-foreground",
}: VisibilityMarkProps) {
  const viaCollection = visibility === "PRIVATE" ? describeSharedVia(sharedVia) : null;
  if (visibility === "PRIVATE" && !viaCollection) return null;

  const isPublic = visibility === "PUBLIC";
  const Icon = viaCollection ? FolderOpen : isPublic ? Globe : Link2;
  const title = viaCollection ?? (isPublic ? "Public" : "Unlisted, anyone with the link can view");

  return (
    <span className="inline-flex shrink-0" role="img" title={title} aria-label={title}>
      <Icon className={className} />
    </span>
  );
}
