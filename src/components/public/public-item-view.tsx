import Link from "next/link";
import { Download, FileText, Image as ImageIcon } from "lucide-react";
import { isCopyableType, isTextType } from "@/lib/constants/item-types";
import { languageLabel, snippetFileLabel } from "@/lib/languages";
import { imageFilename } from "@/lib/og/filename";
import { publicShortPngPath, publicShortRawPath } from "@/lib/public/paths";
import { formatLongDate } from "@/lib/utils/date";
import type { PublicSharedItem } from "@/lib/db/public";
import ItemBlock from "./item-block";
import SaveButton from "./save-button";

interface PublicItemViewProps {
  item: PublicSharedItem;
}

function typeLabel(item: PublicSharedItem): string {
  switch (item.itemType.name) {
    case "snippet":
      return snippetFileLabel(item.language, item.content);
    case "command":
      return "Terminal";
    default:
      return item.itemType.name.charAt(0).toUpperCase() + item.itemType.name.slice(1);
  }
}

const LINK_CLASS = "inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground";

export default function PublicItemView({ item }: PublicItemViewProps) {
  const png = publicShortPngPath(item.shortId);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex flex-wrap gap-x-2 font-mono text-xs text-muted-foreground">
            <span>@{item.handle}</span>
            <span aria-hidden="true">·</span>
            {item.itemType.name === "snippet" ? (
              <span title={languageLabel(item.language)}>
                <span aria-hidden="true">{typeLabel(item)}</span>
                <span className="sr-only">{languageLabel(item.language)}</span>
              </span>
            ) : (
              <span>{typeLabel(item)}</span>
            )}
            <span aria-hidden="true">·</span>
            <span>Updated {formatLongDate(item.updatedAt)}</span>
          </p>
          {isCopyableType(item.itemType.name) && (
            <SaveButton target={{ kind: "item", shortId: item.shortId }} />
          )}
        </div>

        <ItemBlock item={item} standalone />

        {isTextType(item.itemType.name) && (
          <p className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <a href={publicShortRawPath(item.shortId)} className={LINK_CLASS} title="View as plain text">
              <FileText className="h-4 w-4" />
              Raw
            </a>
            <a href={png} target="_blank" rel="noreferrer" className={LINK_CLASS} title="View as an image">
              <ImageIcon className="h-4 w-4" />
              Image
            </a>
            <a href={png} download={imageFilename(item.title)} className={LINK_CLASS} title="Download as a PNG">
              <Download className="h-4 w-4" />
              Download
            </a>
          </p>
        )}

        <footer className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Published with{" "}
          <Link href="/" className="text-foreground hover:underline">
            DevStash
          </Link>
          .{" "}
          <Link href="/" className="text-foreground hover:underline">
            Share your own
          </Link>
          .
        </footer>
      </div>
    </main>
  );
}
