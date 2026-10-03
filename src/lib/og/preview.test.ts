import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PublicSharedItem } from '@/lib/db/public';

vi.mock('@/lib/public/highlight', () => ({
  highlightLines: vi.fn(async (code: string) =>
    code.split('\n').map((line) => [{ content: line, color: '#d4d4d4' }])
  ),
}));

import { highlightLines } from '@/lib/public/highlight';
import { IMAGE_MAX_CHARS, IMAGE_MAX_LINE_CHARS, IMAGE_MAX_LINES, OG_PREVIEW_LINES } from './constants';
import { itemImage, itemPreview } from './preview';

const mockHighlightLines = vi.mocked(highlightLines);

function item(overrides: Partial<PublicSharedItem> = {}): PublicSharedItem {
  return {
    id: 'item-1',
    title: 'useAuth Hook',
    description: null,
    content: 'line 1\nline 2',
    url: null,
    language: 'typescript',
    fileUrl: null,
    fileName: null,
    fileSize: null,
    itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
    shortId: 'k3j9x2ab',
    visibility: 'PUBLIC',
    publishedAt: null,
    updatedAt: new Date('2026-10-01T12:00:00Z'),
    handle: 'brad',
    ...overrides,
  };
}

describe('itemPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('highlights a snippet in its own language', async () => {
    const preview = await itemPreview(item());

    expect(mockHighlightLines).toHaveBeenCalledWith('line 1\nline 2', 'typescript');
    expect(preview.lines).toHaveLength(2);
    expect(preview.truncated).toBe(false);
  });

  it('falls back to plain text for a snippet without a language', async () => {
    await itemPreview(item({ language: null }));
    expect(mockHighlightLines).toHaveBeenCalledWith('line 1\nline 2', 'plaintext');
  });

  it('uses the bash grammar for commands and markdown for notes and prompts', async () => {
    await itemPreview(item({ itemType: { name: 'command', icon: 'Terminal', color: '#f97316' } }));
    await itemPreview(item({ itemType: { name: 'note', icon: 'StickyNote', color: '#fde047' } }));
    await itemPreview(item({ itemType: { name: 'prompt', icon: 'Sparkles', color: '#8b5cf6' } }));

    expect(mockHighlightLines.mock.calls.map((call) => call[1])).toEqual(['bash', 'markdown', 'markdown']);
  });

  it('passes only the first preview lines and reports the cut', async () => {
    const content = Array.from({ length: OG_PREVIEW_LINES + 5 }, (_, i) => `line ${i + 1}`).join('\n');

    const preview = await itemPreview(item({ content }));

    const passed = mockHighlightLines.mock.calls[0][0].split('\n');
    expect(passed).toHaveLength(OG_PREVIEW_LINES);
    expect(preview.truncated).toBe(true);
  });

  it('skips the highlighter for links, files, images, and empty content', async () => {
    const link = await itemPreview(item({ itemType: { name: 'link', icon: 'Link', color: '#10b981' }, url: 'https://x.y' }));
    const file = await itemPreview(item({ itemType: { name: 'file', icon: 'File', color: '#6b7280' } }));
    const image = await itemPreview(item({ itemType: { name: 'image', icon: 'Image', color: '#ec4899' } }));
    const empty = await itemPreview(item({ content: '' }));

    for (const preview of [link, file, image, empty]) {
      expect(preview).toEqual({ lines: [], truncated: false });
    }
    expect(mockHighlightLines).not.toHaveBeenCalled();
  });
});

describe('itemImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('highlights every line in the item language and reports nothing hidden', async () => {
    const image = await itemImage(item({ content: 'line 1\nline 2\nline 3' }));

    expect(mockHighlightLines).toHaveBeenCalledWith('line 1\nline 2\nline 3', 'typescript');
    expect(image.lines).toHaveLength(3);
    expect(image.hidden).toBe(0);
  });

  it('uses the same grammar rule by type as the card', async () => {
    await itemImage(item({ language: null }));
    await itemImage(item({ itemType: { name: 'command', icon: 'Terminal', color: '#f97316' } }));
    await itemImage(item({ itemType: { name: 'prompt', icon: 'Sparkles', color: '#8b5cf6' } }));

    expect(mockHighlightLines.mock.calls.map((call) => call[1])).toEqual(['plaintext', 'bash', 'markdown']);
  });

  it('caps the lines at the image limit and counts the rest as hidden', async () => {
    const content = Array.from({ length: IMAGE_MAX_LINES + 25 }, (_, i) => `line ${i + 1}`).join('\n');

    const image = await itemImage(item({ content }));

    expect(mockHighlightLines.mock.calls[0][0].split('\n')).toHaveLength(IMAGE_MAX_LINES);
    expect(image.hidden).toBe(25);
  });

  it('stops at the character budget before the line cap for dense content', async () => {
    const dense = 'x'.repeat(IMAGE_MAX_LINE_CHARS);
    const fit = Math.floor(IMAGE_MAX_CHARS / IMAGE_MAX_LINE_CHARS);
    const content = Array.from({ length: fit + 10 }, () => dense).join('\n');

    const image = await itemImage(item({ content }));

    expect(image.lines).toHaveLength(fit);
    expect(image.hidden).toBe(10);
  });

  it('cuts long lines at the image width, wider than the card', async () => {
    await itemImage(item({ content: 'x'.repeat(300) }));

    expect(mockHighlightLines.mock.calls[0][0]).toHaveLength(IMAGE_MAX_LINE_CHARS);
  });

  it('renders nothing for non-text types and empty content', async () => {
    const link = await itemImage(item({ itemType: { name: 'link', icon: 'Link', color: '#10b981' }, url: 'https://x.y' }));
    const empty = await itemImage(item({ content: '' }));

    expect(link).toEqual({ lines: [], hidden: 0 });
    expect(empty).toEqual({ lines: [], hidden: 0 });
    expect(mockHighlightLines).not.toHaveBeenCalled();
  });
});
