import { Code, Hash } from "lucide-react";
import { ITEM_TYPE_ICONS } from "@/lib/constants/item-types";
import { COMMAND_LANGUAGE, languageLabel, snippetFileLabel } from "@/lib/languages";
import { commandCopyText } from "@/lib/public/copy";
import type { PublicItem } from "@/lib/db/public";
import CopyButton from "./copy-button";
import CodeBlock from "./code-block";
import MarkdownBlock from "./markdown-block";
import LinkBlock from "./link-block";
import { FileBlock, ImageBlock, isRenderableImage } from "./media-block";

interface ItemBlockProps {
  item: PublicItem;
  /** 1-based position inside a collection page; drives the #b{n} anchor. */
  position?: number;
  /** The block is the whole page: the title is the h1 and there is no anchor. */
  standalone?: boolean;
  /** Overrides the title's heading level where the block sits inside another page's outline. */
  headingLevel?: "h1" | "h2" | "h3" | "h4";
}

function copyTextFor(item: PublicItem): string | null {
  switch (item.itemType.name) {
    case "command":
      return commandCopyText(item.content);
    case "link":
      return item.url;
    case "image":
      return item.fileUrl;
    case "file":
      return null;
    default:
      return item.content ?? "";
  }
}

function labelFor(item: PublicItem): string | null {
  switch (item.itemType.name) {
    case "snippet":
      return snippetFileLabel(item.language, item.content);
    case "command":
      return "Terminal";
    default:
      return null;
  }
}

function BlockBody({ item, anchor }: { item: PublicItem; anchor: string | null }) {
  switch (item.itemType.name) {
    case "snippet":
      return <CodeBlock code={item.content ?? ""} language={item.language} />;
    case "command":
      return <CodeBlock code={item.content ?? ""} language={COMMAND_LANGUAGE} />;
    case "link":
      return item.url ? <LinkBlock title={item.title} url={item.url} /> : null;
    case "image":
      return isRenderableImage(item) ? <ImageBlock item={item} /> : <FileBlock item={item} />;
    case "file":
      return <FileBlock item={item} />;
    default:
      return item.content ? (
        <MarkdownBlock content={item.content} headingIdPrefix={anchor ? `${anchor}-` : ""} />
      ) : null;
  }
}

export default function ItemBlock({ item, position, standalone = false, headingLevel }: ItemBlockProps) {
  const anchor = !standalone && position !== undefined ? `b${position}` : null;
  const Heading = headingLevel ?? (standalone ? "h1" : "h2");
  const IconComponent = ITEM_TYPE_ICONS[item.itemType.icon] ?? Code;
  const copyText = copyTextFor(item);
  const label = labelFor(item);

  return (
    <section
      id={anchor ?? undefined}
      className="group scroll-mt-6 overflow-hidden rounded-lg border border-border bg-card"
    >
      <header className="flex items-center gap-3 border-b border-border px-4 py-2">
        <IconComponent className="h-4 w-4 shrink-0" style={{ color: item.itemType.color }} />
        <Heading
          className={`min-w-0 flex-1 truncate font-mono font-medium text-foreground ${standalone ? "text-base" : "text-sm"}`}
        >
          {item.title}
        </Heading>
        {label && (
          <span
            className="hidden shrink-0 font-mono text-xs text-muted-foreground sm:inline"
            title={item.itemType.name === "snippet" ? languageLabel(item.language) : undefined}
          >
            {item.itemType.name === "snippet" ? (
              <>
                <span aria-hidden="true">{label}</span>
                <span className="sr-only">{languageLabel(item.language)}</span>
              </>
            ) : (
              label
            )}
          </span>
        )}
        {anchor && (
          <a
            href={`#${anchor}`}
            className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus:opacity-100"
            aria-label={`Link to ${item.title}`}
            title="Link to this block"
          >
            <Hash className="h-4 w-4" />
          </a>
        )}
        {copyText !== null && <CopyButton text={copyText} />}
      </header>
      {item.description && (
        <p className="px-4 pt-3 text-sm text-muted-foreground">{item.description}</p>
      )}
      <BlockBody item={item} anchor={anchor} />
    </section>
  );
}
