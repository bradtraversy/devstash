import Link from "next/link";
import { FileText } from "lucide-react";
import { languageLabel } from "@/lib/languages";
import { publicShortRawPath } from "@/lib/public/paths";
import { formatLongDate } from "@/lib/utils/date";
import type { PublicSharedItem } from "@/lib/db/public";
import ItemBlock from "./item-block";

const TEXT_TYPES = new Set(["snippet", "command", "note", "prompt"]);

interface PublicItemViewProps {
  item: PublicSharedItem;
}

function typeLabel(item: PublicSharedItem): string {
  switch (item.itemType.name) {
    case "snippet":
      return languageLabel(item.language);
    case "command":
      return "Terminal";
    default:
      return item.itemType.name.charAt(0).toUpperCase() + item.itemType.name.slice(1);
  }
}

export default function PublicItemView({ item }: PublicItemViewProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <p className="flex flex-wrap gap-x-2 font-mono text-xs text-muted-foreground">
          <span>@{item.handle}</span>
          <span aria-hidden="true">·</span>
          <span>{typeLabel(item)}</span>
          <span aria-hidden="true">·</span>
          <span>Updated {formatLongDate(item.updatedAt)}</span>
        </p>

        <ItemBlock item={item} standalone />

        {TEXT_TYPES.has(item.itemType.name) && (
          <p className="text-sm">
            <a
              href={publicShortRawPath(item.shortId)}
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              title="View as plain text"
            >
              <FileText className="h-4 w-4" />
              Raw
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
