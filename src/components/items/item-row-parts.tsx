import { Code, Pin, Star } from "lucide-react";
import { ITEM_TYPE_ICONS } from "@/lib/constants/item-types";
import { languageFileName, languageLabel } from "@/lib/languages";
import type { ItemWithType } from "@/lib/db/items";
import type { HighlightedToken } from "@/lib/public/highlight";

const CODE_TYPES = ["snippet", "command"];

export function TypeIconTile({ item }: { item: Pick<ItemWithType, "itemType"> }) {
  const Icon = ITEM_TYPE_ICONS[item.itemType.icon] ?? Code;
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
      style={{ backgroundColor: `${item.itemType.color}1f`, color: item.itemType.color }}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

export function ItemMarks({ item, className }: { item: ItemWithType; className?: string }) {
  if (!item.isPinned && !item.isFavorite) return null;
  return (
    <span className={className}>
      {item.isPinned && <Pin className="h-3.5 w-3.5 text-muted-foreground" aria-label="Pinned" />}
      {item.isFavorite && <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" aria-label="Favorite" />}
    </span>
  );
}

/** The language for code, the type name for everything else. */
export function itemKindLabel(item: ItemWithType): string {
  if (CODE_TYPES.includes(item.itemType.name) && item.language) return languageLabel(item.language);
  return item.itemType.name.charAt(0).toUpperCase() + item.itemType.name.slice(1);
}

/** Rows mark only a snippet's language, as a file name chip; every other type is told apart by its icon. */
export function snippetFileChip(
  item: Pick<ItemWithType, "itemType" | "language" | "content">
): { fileName: string; label: string } | null {
  if (item.itemType.name !== "snippet" || !item.language) return null;
  const fileName = languageFileName(item.language, item.content);
  return fileName ? { fileName, label: languageLabel(item.language) } : null;
}

export function FileChip({ item }: { item: ItemWithType }) {
  const chip = snippetFileChip(item);
  if (!chip) return null;
  return (
    <span
      title={chip.label}
      className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] leading-none text-muted-foreground"
    >
      <span aria-hidden="true">{chip.fileName}</span>
      <span className="sr-only">{chip.label}</span>
    </span>
  );
}

const PREVIEW_LINES = 7;

type CardPreviewItem = Pick<ItemWithType, "itemType" | "content" | "description" | "url">;

/** The body of a code card: highlighted lines for code, the URL for links, the first lines otherwise. */
export function CardPreview({ item, preview }: { item: CardPreviewItem; preview?: HighlightedToken[][] }) {
  if (preview) {
    return (
      <pre className="font-mono text-xs leading-relaxed text-[#d4d4d4]">
        {preview.map((line, index) => (
          <span key={index} className="block min-h-[1lh] whitespace-pre">
            {line.map((token, tokenIndex) => (
              <span key={tokenIndex} style={{ color: token.color }}>
                {token.content}
              </span>
            ))}
          </span>
        ))}
      </pre>
    );
  }

  if (item.itemType.name === "link") {
    return (
      <div className="space-y-2 text-sm">
        <p className="truncate font-mono text-xs text-blue-300">{item.url}</p>
        {item.description && <p className="text-muted-foreground">{item.description}</p>}
      </div>
    );
  }

  const text = (item.content ?? item.description ?? "").split("\n").slice(0, PREVIEW_LINES).join("\n");
  return <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{text}</p>;
}
