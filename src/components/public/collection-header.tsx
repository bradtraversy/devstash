import { FileText } from "lucide-react";
import { publicMarkdownPath } from "@/lib/public/paths";
import { formatLongDate } from "@/lib/utils/date";
import type { PublicCollection } from "@/lib/db/public";
import CopyButton from "./copy-button";
import HandleLink from "./handle-link";
import SaveButton from "./save-button";

interface CollectionHeaderProps {
  collection: PublicCollection;
  markdown: string;
}

export default function CollectionHeader({ collection, markdown }: CollectionHeaderProps) {
  const noun = collection.itemCount === 1 ? "item" : "items";

  return (
    <header className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{collection.name}</h1>
        <div className="flex shrink-0 items-center gap-1 pt-1">
          <SaveButton
            target={{ kind: "collection", handle: collection.handle, slug: collection.slug }}
            compact
          />
          <CopyButton text={markdown} label="Copy as markdown" />
          <a
            href={publicMarkdownPath(collection.handle, collection.slug)}
            className="flex items-center gap-1.5 px-2 text-sm text-muted-foreground hover:text-foreground"
            title="View as markdown"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Markdown</span>
          </a>
        </div>
      </div>
      {collection.description && (
        <p className="text-base text-muted-foreground">{collection.description}</p>
      )}
      <p className="flex flex-wrap gap-x-2 font-mono text-xs text-muted-foreground">
        <HandleLink handle={collection.handle} visibility={collection.visibility} />
        <span aria-hidden="true">·</span>
        <span>
          {collection.itemCount} {noun}
        </span>
        <span aria-hidden="true">·</span>
        <span>Updated {formatLongDate(collection.updatedAt)}</span>
      </p>
    </header>
  );
}
