import { OG_MAX_LINE_CHARS } from './constants';

export interface PreviewLines {
  lines: string[];
  truncated: boolean;
}

/** The first lines of a text body as the image shows them: tabs widened, long lines cut, one trailing blank dropped. */
export function previewLines(content: string | null | undefined, maxLines: number): PreviewLines {
  const all = (content ?? '').replace(/\r/g, '').split('\n');
  if (all.length > 0 && all[all.length - 1] === '') {
    all.pop();
  }

  const lines = all
    .slice(0, maxLines)
    .map((line) => line.replace(/\t/g, '  ').slice(0, OG_MAX_LINE_CHARS));

  return { lines, truncated: all.length > maxLines };
}
