import Link from "next/link";
import { CardPreview, TypeIconTile } from "@/components/items/item-row-parts";
import { languageLabel } from "@/lib/languages";
import { publicShortPath } from "@/lib/public/paths";
import type { PublicProfileItem } from "@/lib/db/public";
import type { HighlightedToken } from "@/lib/public/highlight";
import { typeLabel } from "./public-item-view";

interface PublicItemCardProps {
  item: PublicProfileItem;
  preview?: HighlightedToken[][];
}

const FILE_TYPES = ["file", "image"];

export default function PublicItemCard({ item, preview }: PublicItemCardProps) {
  const label = typeLabel(item);

  return (
    <Link
      href={publicShortPath(item.shortId)}
      className="group flex min-w-0 flex-col rounded-lg border border-border bg-card transition-colors hover:border-muted-foreground/50"
    >
      <span className="flex min-w-0 items-center gap-2.5 px-3 pb-2 pt-3">
        <TypeIconTile item={item} />
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{item.title}</span>
      </span>
      <div className="mx-3 h-36 overflow-hidden rounded-md border border-border bg-background px-3 py-2 [mask-image:linear-gradient(to_bottom,#000_70%,transparent)]">
        {FILE_TYPES.includes(item.itemType.name) ? (
          <div className="space-y-2 text-sm">
            <p className="truncate font-mono text-xs text-muted-foreground">{item.fileName}</p>
            {item.description && <p className="text-muted-foreground">{item.description}</p>}
          </div>
        ) : (
          <CardPreview item={item} preview={preview} />
        )}
      </div>
      <span className="truncate px-3 pb-3 pt-2 text-xs text-muted-foreground">
        {item.itemType.name === "snippet" ? (
          <span title={languageLabel(item.language)}>
            <span aria-hidden="true">{label}</span>
            <span className="sr-only">{languageLabel(item.language)}</span>
          </span>
        ) : (
          label
        )}
      </span>
    </Link>
  );
}
