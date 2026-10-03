import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/public/highlight', () => ({
  highlightLines: vi.fn(async (code: string) =>
    code.split('\n').map((line) => [{ content: line, color: '#fff' }])
  ),
}));

import { highlightLines } from '@/lib/public/highlight';
import { CARD_PREVIEW_LINES, CARD_PREVIEW_LINE_CHARS, getCodePreviews } from './item-previews';

const item = (id: string, type: string, content: string | null, language: string | null = null) => ({
  id,
  content,
  language,
  itemType: { name: type, icon: 'Code', color: '#3b82f6' },
});

describe('getCodePreviews', () => {
  beforeEach(() => {
    vi.mocked(highlightLines).mockClear();
  });

  it('highlights only snippets and commands', async () => {
    const previews = await getCodePreviews([
      item('s', 'snippet', 'const a = 1;', 'typescript'),
      item('c', 'command', 'git status', null),
      item('p', 'prompt', 'Review this diff'),
      item('n', 'note', 'Release checklist'),
      item('l', 'link', null),
    ]);

    expect(Object.keys(previews).sort()).toEqual(['c', 's']);
    expect(highlightLines).toHaveBeenCalledWith('const a = 1;', 'typescript');
    expect(highlightLines).toHaveBeenCalledWith('git status', 'bash');
  });

  it('highlights commands as shell whatever language they store', async () => {
    await getCodePreviews([item('c', 'command', 'ls -la', 'python')]);

    expect(highlightLines).toHaveBeenCalledWith('ls -la', 'bash');
  });

  it('skips code items with no content', async () => {
    const previews = await getCodePreviews([item('a', 'snippet', null), item('b', 'snippet', '  \n ')]);

    expect(previews).toEqual({});
    expect(highlightLines).not.toHaveBeenCalled();
  });

  it('caps the preview at the card line count and width', async () => {
    const long = Array.from({ length: 20 }, (_, n) => `line ${n} ${'x'.repeat(200)}`).join('\n');
    const previews = await getCodePreviews([item('s', 'snippet', long, null)]);

    expect(previews.s).toHaveLength(CARD_PREVIEW_LINES);
    expect(previews.s[0][0].content.length).toBe(CARD_PREVIEW_LINE_CHARS);
    expect(highlightLines).toHaveBeenCalledWith(expect.any(String), null);
  });
});
