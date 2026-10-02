import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';
import type { PublicSharedItem } from '@/lib/db/public';

vi.mock('@/lib/db/public', () => ({ getPublicItem: vi.fn() }));
vi.mock('@/lib/og/render', () => ({
  renderOgImage: vi.fn(async () => new Response('png', { headers: { 'content-type': 'image/png' } })),
}));
vi.mock('@/lib/og/preview', () => ({
  itemPreview: vi.fn(async () => ({ lines: [[{ content: 'const a = 1;', color: '#d4d4d4' }]], truncated: true })),
}));

import { getPublicItem } from '@/lib/db/public';
import { renderOgImage } from '@/lib/og/render';
import { ItemCard } from '@/lib/og/cards';
import { GET, dynamic, generateStaticParams } from './route';

const mockGetPublicItem = vi.mocked(getPublicItem);
const mockRenderOgImage = vi.mocked(renderOgImage);

function get(shortId: string) {
  return GET(new Request(`https://devstash.io/s/${shortId}/og`), {
    params: Promise.resolve({ shortId }),
  });
}

const item: PublicSharedItem = {
  id: 'item-1',
  title: 'useAuth Hook',
  description: null,
  content: 'const a = 1;',
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

describe('GET /s/[shortId]/og', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is cached by path with no params known at build time', async () => {
    expect(dynamic).toBe('force-static');
    expect(await generateStaticParams()).toEqual([]);
  });

  it('renders not found for a malformed or uppercase id without querying', async () => {
    await expect(get('not-a-short-id')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    await expect(get('ABC12345')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(mockGetPublicItem).not.toHaveBeenCalled();
    expect(mockRenderOgImage).not.toHaveBeenCalled();
  });

  it('renders not found when the item is unknown or private', async () => {
    mockGetPublicItem.mockResolvedValue(null);

    await expect(get('abc12345')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(mockGetPublicItem).toHaveBeenCalledWith('abc12345');
    expect(mockRenderOgImage).not.toHaveBeenCalled();
  });

  it('renders the item card with its preview lines', async () => {
    mockGetPublicItem.mockResolvedValue(item);

    const res = await get('abc12345');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');

    const element = mockRenderOgImage.mock.calls[0][0] as ReactElement<{
      item: PublicSharedItem;
      lines: unknown[];
      truncated: boolean;
    }>;
    expect(element.type).toBe(ItemCard);
    expect(element.props.item).toBe(item);
    expect(element.props.lines).toHaveLength(1);
    expect(element.props.truncated).toBe(true);
  });
});
