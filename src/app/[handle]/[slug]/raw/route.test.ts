import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PublicCollection } from '@/lib/db/public';

vi.mock('@/lib/db/public', () => ({
  getPublicCollection: vi.fn(),
  resolveSlugHistory: vi.fn(),
}));

import { getPublicCollection, resolveSlugHistory } from '@/lib/db/public';
import { collectionToMarkdown } from '@/lib/public/markdown';
import { GET } from './route';

const mockGetPublicCollection = vi.mocked(getPublicCollection);
const mockResolveSlugHistory = vi.mocked(resolveSlugHistory);

const NOW = new Date('2026-09-28T12:00:00Z');

const collection: PublicCollection = {
  id: 'col-1',
  name: 'React Hooks',
  description: null,
  slug: 'react-hooks',
  shortId: 'abc12345',
  visibility: 'PUBLIC',
  publishedAt: NOW,
  updatedAt: NOW,
  handle: 'brad',
  itemCount: 1,
  items: [
    {
      id: 'item-1',
      title: 'useAuth',
      description: null,
      content: 'export function useAuth() {}',
      url: null,
      language: 'typescript',
      fileUrl: null,
      fileName: null,
      fileSize: null,
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
    },
  ],
};

function get(handle: string, slug: string) {
  return GET(new Request(`https://devstash.io/${handle}/${slug}/raw`), {
    params: Promise.resolve({ handle, slug }),
  });
}

describe('GET /[handle]/[slug]/raw', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://devstash.io');
    mockResolveSlugHistory.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders not found for an invalid segment without querying', async () => {
    await expect(get('brad', 'bad slug')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(mockGetPublicCollection).not.toHaveBeenCalled();
  });

  it('renders not found when the collection is unknown or private and no history matches', async () => {
    mockGetPublicCollection.mockResolvedValue(null);

    await expect(get('brad', 'missing')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(mockResolveSlugHistory).toHaveBeenCalledWith('brad', 'missing');
  });

  it('redirects a retired slug to the current raw URL', async () => {
    mockGetPublicCollection.mockResolvedValue(null);
    mockResolveSlugHistory.mockResolvedValue({ handle: 'brad', slug: 'react-hooks' });

    const res = await get('brad', 'old-hooks');

    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://devstash.io/brad/react-hooks/raw');
  });

  it('redirects non-canonical casing to the lowercase raw URL before any lookup', async () => {
    const res = await get('Brad', 'React-Hooks');

    expect(mockGetPublicCollection).not.toHaveBeenCalled();
    expect(mockResolveSlugHistory).not.toHaveBeenCalled();
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://devstash.io/brad/react-hooks/raw');
  });

  it('returns the markdown document with the canonical page URL on the configured origin', async () => {
    mockGetPublicCollection.mockResolvedValue(collection);

    const res = await GET(new Request('https://preview-abc.vercel.app/brad/react-hooks/raw'), {
      params: Promise.resolve({ handle: 'brad', slug: 'react-hooks' }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(await res.text()).toBe(
      collectionToMarkdown(collection, 'https://devstash.io/brad/react-hooks')
    );
  });
});
