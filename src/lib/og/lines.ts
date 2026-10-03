import { OG_MAX_LINE_CHARS } from './constants';

export interface PreviewLines {
  lines: string[];
  truncated: boolean;
  /** Line count before the cap, so callers can say how many were left out. */
  total: number;
}

// CJK, Hangul, fullwidth forms, and emoji render about twice as wide as a Geist Mono cell.
const WIDE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Extended_Pictographic}　-〿！-｠￠-￦]/u;

/** Monospace cells a string occupies, counting wide characters as two. */
export function columnWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    width += WIDE.test(char) ? 2 : 1;
  }
  return width;
}

/** The longest prefix that fits in the given cells, never splitting a surrogate pair. */
function cutToColumns(text: string, max: number): string {
  let width = 0;
  let end = 0;
  for (const char of text) {
    width += WIDE.test(char) ? 2 : 1;
    if (width > max) break;
    end += char.length;
  }
  return text.slice(0, end);
}

/** The first lines of a text body as an image shows them: tabs widened, long lines cut, one trailing blank dropped. */
export function previewLines(
  content: string | null | undefined,
  maxLines: number,
  maxChars: number = OG_MAX_LINE_CHARS
): PreviewLines {
  const all = (content ?? '').replace(/\r/g, '').split('\n');
  if (all.length > 0 && all[all.length - 1] === '') {
    all.pop();
  }

  const lines = all
    .slice(0, maxLines)
    .map((line) => cutToColumns(line.replace(/\t/g, '  '), maxChars));

  return { lines, truncated: all.length > maxLines, total: all.length };
}

/** How many leading lines fit in a budget of visible cells; whitespace is free because it costs the PNG almost nothing. */
export function linesWithinBudget(lines: string[], budget: number): number {
  let used = 0;
  for (let index = 0; index < lines.length; index++) {
    used += columnWidth(lines[index].replace(/\s/g, ''));
    if (used > budget) return index;
  }
  return lines.length;
}
