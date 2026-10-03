import { highlightLines, type HighlightedToken } from '@/lib/public/highlight';
import { previewLines } from '@/lib/og/lines';
import { COMMAND_LANGUAGE } from '@/lib/languages';
import type { ItemWithType } from '@/lib/db/items';

export const CARD_PREVIEW_LINES = 7;
export const CARD_PREVIEW_LINE_CHARS = 120;

const CODE_PREVIEW_TYPES = ['snippet', 'command'];

export type CodePreviews = Record<string, HighlightedToken[][]>;

type PreviewSource = Pick<ItemWithType, 'id' | 'content' | 'language' | 'itemType'>;

/** Highlighted first lines of each snippet and command, for the code card layout only. */
export async function getCodePreviews(items: PreviewSource[]): Promise<CodePreviews> {
  const entries = await Promise.all(
    items
      .filter((item) => CODE_PREVIEW_TYPES.includes(item.itemType.name) && item.content?.trim())
      .map(async (item) => {
        const { lines } = previewLines(item.content, CARD_PREVIEW_LINES, CARD_PREVIEW_LINE_CHARS);
        // Commands are stored without a language; the public pages highlight them as shell, so cards do too.
        const language = item.itemType.name === 'command' ? COMMAND_LANGUAGE : item.language;
        return [item.id, await highlightLines(lines.join('\n'), language)] as const;
      })
  );
  return Object.fromEntries(entries);
}
