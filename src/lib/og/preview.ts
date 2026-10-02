import type { PublicSharedItem } from '@/lib/db/public';
import { COMMAND_LANGUAGE } from '@/lib/languages';
import { highlightLines, type HighlightedToken } from '@/lib/public/highlight';
import { OG_PREVIEW_LINES } from './constants';
import { previewLines } from './lines';

export interface ItemPreview {
  lines: HighlightedToken[][];
  truncated: boolean;
}

const NO_PREVIEW: ItemPreview = { lines: [], truncated: false };

/** Grammar for the preview by type, or null for types whose card shows no text body. */
function previewLanguage(item: PublicSharedItem): string | null {
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
export async function itemPreview(item: PublicSharedItem): Promise<ItemPreview> {
  const language = previewLanguage(item);
  if (language === null) return NO_PREVIEW;

  const { lines, truncated } = previewLines(item.content, OG_PREVIEW_LINES);
  if (lines.length === 0) return NO_PREVIEW;

  return { lines: await highlightLines(lines.join('\n'), language), truncated };
}
