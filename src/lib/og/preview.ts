import { COMMAND_LANGUAGE } from '@/lib/languages';
import { highlightLines, type HighlightedToken } from '@/lib/public/highlight';
import { IMAGE_MAX_CHARS, IMAGE_MAX_LINE_CHARS, IMAGE_MAX_LINES, OG_PREVIEW_LINES } from './constants';
import { linesWithinBudget, previewLines } from './lines';

/** What the renderers need from an item, satisfied by PublicSharedItem and ItemDetail alike. */
export interface TextSource {
  content: string | null;
  language: string | null;
  itemType: { name: string };
}

export interface ItemPreview {
  lines: HighlightedToken[][];
  truncated: boolean;
}

export interface ItemImage {
  lines: HighlightedToken[][];
  /** Lines past the cap that the image does not show. */
  hidden: number;
}

const NO_PREVIEW: ItemPreview = { lines: [], truncated: false };
const NO_IMAGE: ItemImage = { lines: [], hidden: 0 };

/** Grammar for the text body by type, or null for types whose card shows no text body. */
function previewLanguage(item: TextSource): string | null {
  switch (item.itemType.name) {
    case 'snippet':
      return item.language ?? 'plaintext';
    case 'command':
      return COMMAND_LANGUAGE;
    case 'note':
    case 'prompt':
      return 'markdown';
    default:
      return null;
  }
}

/** Highlighted tokens for the first lines of a text item; only those lines go through the highlighter. */
export async function itemPreview(item: TextSource): Promise<ItemPreview> {
  const language = previewLanguage(item);
  if (language === null) return NO_PREVIEW;

  const { lines, truncated } = previewLines(item.content, OG_PREVIEW_LINES);
  if (lines.length === 0) return NO_PREVIEW;

  return { lines: await highlightLines(lines.join('\n'), language), truncated };
}

/** Highlighted tokens for the whole text item up to the image caps, with the count left out. */
export async function itemImage(item: TextSource): Promise<ItemImage> {
  const language = previewLanguage(item);
  if (language === null) return NO_IMAGE;

  const { lines, total } = previewLines(item.content, IMAGE_MAX_LINES, IMAGE_MAX_LINE_CHARS);
  const kept = lines.slice(0, linesWithinBudget(lines, IMAGE_MAX_CHARS));
  if (kept.length === 0) return NO_IMAGE;

  return { lines: await highlightLines(kept.join('\n'), language), hidden: total - kept.length };
}
