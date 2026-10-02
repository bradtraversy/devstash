import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';
import type { PublicCollection } from '@/lib/db/public';

vi.mock('@/lib/db/public', () => ({ getPublicCollection: vi.fn() }));
vi.mock('@/lib/og/render', () => ({
  renderOgImage: vi.fn(async () => new Response('png', { headers: { 'content-type': 'image/png' } })),
}));

import { getPublicCollection } from '@/lib/db/public';
import { renderOgImage } from '@/lib/og/render';
import { CollectionCard } from '@/lib/og/cards';
import { GET, dynamic, generateStaticParams } from './route';

const mockGetPublicCollection = vi.mocked(getPublicCollection);
const mockRenderOgImage = vi.mocked(renderOgImage);

function get(handle: string, slug: string) {
  return GET(new Request(`https://devstash.io/${handle}/${slug}/og`), {
    params: Promise.resolve({ handle, slug }),
  });
}

const collection: PublicCollection = {
  id: 'col-1',
  name: 'React Hooks',
  description: null,
  slug: 'react-hooks',
  shortId: 'abc12345',
  visibility: 'PUBLIC',
  publishedAt: new Date('2026-09-28T12:00:00Z'),
  updatedAt: new Date('2026-09-28T12:00:00Z'),
  contentUpdatedAt: new Date('2026-09-28T12:00:00Z'),
  handle: 'brad',
  itemCount: 0,
  items: [],
};

describe('GET /[handle]/[slug]/og', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is cached by path with no params known at build time', async () => {
    expect(dynamic).toBe('force-static');
    expect(await generateStaticParams()).toEqual([]);
  });

  it('renders not found for an invalid segment or a case variant without querying', async () => {
    await expect(get('brad', 'has space')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    await expect(get('Brad', 'react-hooks')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    await expect(get('brad', 'React-Hooks')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(mockGetPublicCollection).not.toHaveBeenCalled();
  });

  it('renders not found when the collection is unknown or private', async () => {
    mockGetPublicCollection.mockResolvedValue(null);

    await expect(get('brad', 'react-hooks')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(mockGetPublicCollection).toHaveBeenCalledWith('brad', 'react-hooks');
    expect(mockRenderOgImage).not.toHaveBeenCalled();
  });

  it('renders the collection card', async () => {
    mockGetPublicCollection.mockResolvedValue(collection);

    const res = await get('brad', 'react-hooks');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');

    const element = mockRenderOgImage.mock.calls[0][0] as ReactElement<{ collection: PublicCollection }>;
    expect(element.type).toBe(CollectionCard);
    expect(element.props.collection).toBe(collection);
  });
});
