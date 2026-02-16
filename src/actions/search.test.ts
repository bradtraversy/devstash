import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

// Mock the auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock the db modules
vi.mock('@/lib/db/items', () => ({
  getSearchableItems: vi.fn(),
}));

vi.mock('@/lib/db/collections', () => ({
  getSearchableCollections: vi.fn(),
}));

import { getSearchData } from './search';
import { auth } from '@/auth';
import { getSearchableItems } from '@/lib/db/items';
import { getSearchableCollections } from '@/lib/db/collections';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const mockGetSearchableItems = vi.mocked(getSearchableItems);
const mockGetSearchableCollections = vi.mocked(getSearchableCollections);

describe('getSearchData server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await getSearchData();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns error when user id is missing', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await getSearchData();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns items and collections on success', async () => {
    const mockItems = [
      {
        id: 'item-1',
        title: 'Test Snippet',
        typeName: 'snippet',
        typeIcon: 'Code',
        typeColor: '#3b82f6',
        contentPreview: 'function test() {}',
      },
      {
        id: 'item-2',
        title: 'Test Note',
        typeName: 'note',
        typeIcon: 'StickyNote',
        typeColor: '#fde047',
        contentPreview: null,
      },
    ];

    const mockCollections = [
      { id: 'coll-1', name: 'React Patterns', itemCount: 5 },
      { id: 'coll-2', name: 'DevOps Scripts', itemCount: 3 },
    ];

    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockGetSearchableItems.mockResolvedValue(mockItems);
    mockGetSearchableCollections.mockResolvedValue(mockCollections);

    const result = await getSearchData();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      items: mockItems,
      collections: mockCollections,
    });
    expect(mockGetSearchableItems).toHaveBeenCalledWith('user-123');
    expect(mockGetSearchableCollections).toHaveBeenCalledWith('user-123');
  });

  it('returns empty arrays when user has no data', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockGetSearchableItems.mockResolvedValue([]);
    mockGetSearchableCollections.mockResolvedValue([]);

    const result = await getSearchData();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      items: [],
      collections: [],
    });
  });

  it('returns error when items query fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockGetSearchableItems.mockRejectedValue(new Error('DB error'));
    mockGetSearchableCollections.mockResolvedValue([]);

    const result = await getSearchData();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to fetch search data');
  });

  it('returns error when collections query fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockGetSearchableItems.mockResolvedValue([]);
    mockGetSearchableCollections.mockRejectedValue(new Error('DB error'));

    const result = await getSearchData();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to fetch search data');
  });

  it('fetches items and collections in parallel', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockGetSearchableItems.mockResolvedValue([]);
    mockGetSearchableCollections.mockResolvedValue([]);

    await getSearchData();

    // Both should be called with the same user id
    expect(mockGetSearchableItems).toHaveBeenCalledWith('user-123');
    expect(mockGetSearchableCollections).toHaveBeenCalledWith('user-123');
  });
});
