import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';
import type { PublicSharedItem } from '@/lib/db/public';

vi.mock('@/lib/db/public', () => ({ getPublicItem: vi.fn() }));
vi.mock('@/lib/og/render', () => ({
  renderOgImage: vi.fn(async () => new Response('png', { headers: { 'content-type': 'image/png' } })),
}));
vi.mock('@/lib/og/preview', () => ({
  itemImage: vi.fn(async () => ({
    lines: [[{ content: 'const a = 1;', color: '#d4d4d4' }], [{ content: 'const b = 2;', color: '#d4d4d4' }]],
    hidden: 3,
  })),
}));

import { getPublicItem } from '@/lib/db/public';
import { renderOgImage } from '@/lib/og/render';
import { SnippetImage, snippetImageSize, type SnippetImageProps } from '@/lib/og/snippet-image';
import { GET, dynamic, generateStaticParams } from './route';

const mockGetPublicItem = vi.mocked(getPublicItem);
const mockRenderOgImage = vi.mocked(renderOgImage);

function get(shortId: string) {
  return GET(new Request(`https://devstash.io/s/${shortId}/image`), {
    params: Promise.resolve({ shortId }),
  });
}

const item: PublicSharedItem = {
  id: 'item-1',
  title: 'useAuth Hook',
  description: null,
  content: 'const a = 1;\nconst b = 2;',
  url: null,
  language: 'typescript',
  fileUrl: null,
  fileName: null,
  fileSize: null,
  itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
  shortId: 'abc12345',
  visibility: 'UNLISTED',
  publishedAt: new Date('2026-10-01T12:00:00Z'),
  updatedAt: new Date('2026-10-01T12:00:00Z'),
  handle: 'brad',
};

describe('GET /s/[shortId]/image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is cached by path with no params known at build time', async () => {
    expect(dynamic).toBe('force-static');
    expect(await generateStaticParams()).toEqual([]);
  });

  it('renders not found for a malformed or uppercase id without querying', async () => {
    await expect(get('nope')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    await expect(get('ABC12345')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(mockGetPublicItem).not.toHaveBeenCalled();
  });

  it('renders not found for unknown, private, and non-text items', async () => {
    mockGetPublicItem.mockResolvedValueOnce(null);
    await expect(get('abc12345')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');

    mockGetPublicItem.mockResolvedValueOnce({ ...item, itemType: { name: 'link', icon: 'Link', color: '#10b981' } });
    await expect(get('abc12345')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');

    expect(mockRenderOgImage).not.toHaveBeenCalled();
  });

  it('renders the whole snippet at its computed size as a shared image', async () => {
    mockGetPublicItem.mockResolvedValue(item);

    const res = await get('abc12345');

    expect(res.status).toBe(200);
    const [element, size] = mockRenderOgImage.mock.calls[0] as [ReactElement<SnippetImageProps>, unknown];
    expect(element.type).toBe(SnippetImage);
    expect(element.props.item).toEqual({
      title: 'useAuth Hook',
      language: 'typescript',
      itemType: item.itemType,
      shortId: 'abc12345',
      handle: 'brad',
      shared: true,
    });
    expect(element.props.lines).toHaveLength(2);
    expect(element.props.hidden).toBe(3);
    expect(size).toEqual(snippetImageSize(element.props.lines, 3));
  });
});
