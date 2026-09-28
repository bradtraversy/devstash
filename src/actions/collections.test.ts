import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

// Mock the auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock the db module
vi.mock('@/lib/db/collections', () => ({
  createCollection: vi.fn(),
  updateCollection: vi.fn(),
  deleteCollection: vi.fn(),
  getUserCollections: vi.fn(),
  toggleCollectionFavorite: vi.fn(),
  setCollectionVisibility: vi.fn(),
  moveCollectionItem: vi.fn(),
}));

// Mock the usage module
vi.mock('@/lib/usage', () => ({
  canCreateCollection: vi.fn(),
}));

vi.mock('@/lib/db/public', () => ({
  publicPathsForCollections: vi.fn(async () => []),
  publicPathForOwnerSlug: vi.fn(async () => []),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  createCollection,
  updateCollection,
  deleteCollection,
  getUserCollections,
  toggleCollectionFavorite,
  setCollectionVisibility,
  moveCollectionItem,
} from './collections';
import { auth } from '@/auth';
import {
  createCollection as createCollectionQuery,
  updateCollection as updateCollectionQuery,
  deleteCollection as deleteCollectionQuery,
  getUserCollections as getUserCollectionsQuery,
  toggleCollectionFavorite as toggleCollectionFavoriteQuery,
  setCollectionVisibility as setCollectionVisibilityQuery,
  moveCollectionItem as moveCollectionItemQuery,
} from '@/lib/db/collections';
import { canCreateCollection } from '@/lib/usage';
import { publicPathForOwnerSlug, publicPathsForCollections } from '@/lib/db/public';
import { revalidatePath } from 'next/cache';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const mockCreateCollectionQuery = vi.mocked(createCollectionQuery);
const mockUpdateCollectionQuery = vi.mocked(updateCollectionQuery);
const mockDeleteCollectionQuery = vi.mocked(deleteCollectionQuery);
const mockGetUserCollectionsQuery = vi.mocked(getUserCollectionsQuery);
const mockToggleCollectionFavoriteQuery = vi.mocked(toggleCollectionFavoriteQuery);
const mockSetCollectionVisibilityQuery = vi.mocked(setCollectionVisibilityQuery);
const mockMoveCollectionItemQuery = vi.mocked(moveCollectionItemQuery);
const mockCanCreateCollection = vi.mocked(canCreateCollection);
const mockPublicPathsForCollections = vi.mocked(publicPathsForCollections);
const mockPublicPathForOwnerSlug = vi.mocked(publicPathForOwnerSlug);
const mockRevalidatePath = vi.mocked(revalidatePath);
const revalidated = () => mockRevalidatePath.mock.calls.map((call) => call[0]);

describe('createCollection server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: allow collection creation
    mockCanCreateCollection.mockResolvedValue(true);
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await createCollection({
      name: 'Test Collection',
      description: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns validation error for empty name', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await createCollection({
      name: '   ',
      description: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
    expect(result.fieldErrors?.name).toBeDefined();
  });

  it('returns validation error for name exceeding 100 characters', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await createCollection({
      name: 'a'.repeat(101),
      description: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
    expect(result.fieldErrors?.name).toBeDefined();
  });

  it('returns validation error for description exceeding 500 characters', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await createCollection({
      name: 'Test',
      description: 'a'.repeat(501),
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
    expect(result.fieldErrors?.description).toBeDefined();
  });

  it('returns error when database operation fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockCreateCollectionQuery.mockRejectedValue(new Error('DB error'));

    const result = await createCollection({
      name: 'Test Collection',
      description: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to create collection');
  });

  it('returns created collection on success', async () => {
    const mockCollection = {
      id: 'collection-123',
      name: 'Test Collection',
      description: 'A test description',
      slug: 'test-collection',
      isFavorite: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockCreateCollectionQuery.mockResolvedValue(mockCollection);

    const result = await createCollection({
      name: 'Test Collection',
      description: 'A test description',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockCollection);
    expect(mockCreateCollectionQuery).toHaveBeenCalledWith('user-123', {
      name: 'Test Collection',
      description: 'A test description',
    });
  });

  it('transforms empty description to null', async () => {
    const mockCollection = {
      id: 'collection-123',
      name: 'Test Collection',
      description: null,
      slug: 'test-collection',
      isFavorite: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockCreateCollectionQuery.mockResolvedValue(mockCollection);

    await createCollection({
      name: 'Test Collection',
      description: '   ',
    });

    expect(mockCreateCollectionQuery).toHaveBeenCalledWith('user-123', {
      name: 'Test Collection',
      description: null,
    });
  });

  it('returns error when collection limit reached', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockCanCreateCollection.mockResolvedValue(false);

    const result = await createCollection({
      name: 'Test Collection',
      description: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('free tier limit of 3 collections');
  });

  it('trims whitespace from name', async () => {
    const mockCollection = {
      id: 'collection-123',
      name: 'Test Collection',
      description: null,
      slug: 'test-collection',
      isFavorite: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockCreateCollectionQuery.mockResolvedValue(mockCollection);

    await createCollection({
      name: '  Test Collection  ',
      description: null,
    });

    expect(mockCreateCollectionQuery).toHaveBeenCalledWith('user-123', {
      name: 'Test Collection',
      description: null,
    });
  });
});

describe('getUserCollections server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await getUserCollections();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns collections on success', async () => {
    const mockCollections = [
      { id: 'coll-1', name: 'React Patterns' },
      { id: 'coll-2', name: 'Python Scripts' },
    ];

    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockGetUserCollectionsQuery.mockResolvedValue(mockCollections);

    const result = await getUserCollections();

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockCollections);
    expect(mockGetUserCollectionsQuery).toHaveBeenCalledWith('user-123');
  });

  it('returns error when database operation fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockGetUserCollectionsQuery.mockRejectedValue(new Error('DB error'));

    const result = await getUserCollections();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to fetch collections');
  });

  it('returns empty array when user has no collections', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockGetUserCollectionsQuery.mockResolvedValue([]);

    const result = await getUserCollections();

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });
});

describe('updateCollection server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await updateCollection({
      id: 'collection-123',
      name: 'Updated Name',
      description: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns validation error for empty name', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await updateCollection({
      id: 'collection-123',
      name: '   ',
      description: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
    expect(result.fieldErrors?.name).toBeDefined();
  });

  it('returns validation error for missing id', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await updateCollection({
      id: '',
      name: 'Test',
      description: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
  });

  it('returns error when collection not found', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockUpdateCollectionQuery.mockResolvedValue(null);

    const result = await updateCollection({
      id: 'nonexistent',
      name: 'Test',
      description: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Collection not found');
  });

  it('returns updated collection on success', async () => {
    const mockCollection = {
      id: 'collection-123',
      name: 'Updated Name',
      description: 'Updated description',
      slug: 'test-collection',
      isFavorite: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockUpdateCollectionQuery.mockResolvedValue(mockCollection);

    const result = await updateCollection({
      id: 'collection-123',
      name: 'Updated Name',
      description: 'Updated description',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockCollection);
    expect(mockUpdateCollectionQuery).toHaveBeenCalledWith('collection-123', 'user-123', {
      name: 'Updated Name',
      description: 'Updated description',
    });
  });

  it('returns error when database operation fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockUpdateCollectionQuery.mockRejectedValue(new Error('DB error'));

    const result = await updateCollection({
      id: 'collection-123',
      name: 'Test',
      description: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to update collection');
  });
});

describe('deleteCollection server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await deleteCollection({ id: 'collection-123' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns validation error for empty id', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await deleteCollection({ id: '' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid collection ID');
  });

  it('returns error when collection not found', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockDeleteCollectionQuery.mockResolvedValue(false);

    const result = await deleteCollection({ id: 'nonexistent' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Collection not found');
  });

  it('returns success when collection is deleted', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockDeleteCollectionQuery.mockResolvedValue(true);

    const result = await deleteCollection({ id: 'collection-123' });

    expect(result.success).toBe(true);
    expect(mockDeleteCollectionQuery).toHaveBeenCalledWith('collection-123', 'user-123');
  });

  it('returns error when database operation fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockDeleteCollectionQuery.mockRejectedValue(new Error('DB error'));

    const result = await deleteCollection({ id: 'collection-123' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to delete collection');
  });
});

describe('toggleCollectionFavorite server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await toggleCollectionFavorite('collection-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns error for empty collection ID', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await toggleCollectionFavorite('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid collection ID');
  });

  it('returns error when collection not found', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockToggleCollectionFavoriteQuery.mockResolvedValue(null);

    const result = await toggleCollectionFavorite('collection-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Collection not found');
  });

  it('returns new favorite state when toggled on', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockToggleCollectionFavoriteQuery.mockResolvedValue(true);

    const result = await toggleCollectionFavorite('collection-123');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ isFavorite: true });
    expect(mockToggleCollectionFavoriteQuery).toHaveBeenCalledWith('collection-123', 'user-123');
  });

  it('returns new favorite state when toggled off', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockToggleCollectionFavoriteQuery.mockResolvedValue(false);

    const result = await toggleCollectionFavorite('collection-123');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ isFavorite: false });
  });
});

describe('updateCollection slug validation', () => {
  const session = {
    user: { id: 'user-123', isPro: false },
    expires: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(session);
    mockUpdateCollectionQuery.mockResolvedValue({
      id: 'collection-123',
      name: 'Test',
      slug: 'hooks',
      description: null,
      isFavorite: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('rejects a malformed slug with a field error', async () => {
    const result = await updateCollection({ id: 'collection-123', name: 'Test', slug: 'Bad Slug' });

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.slug).toEqual(['Use lowercase letters, numbers, and hyphens']);
    expect(mockUpdateCollectionQuery).not.toHaveBeenCalled();
  });

  it('rejects a reserved slug', async () => {
    const result = await updateCollection({ id: 'collection-123', name: 'Test', slug: 'raw' });

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.slug).toEqual(['That name is reserved']);
  });

  it('passes the normalized slug to the query', async () => {
    const result = await updateCollection({ id: 'collection-123', name: 'Test', slug: '  Hooks ' });

    expect(result.success).toBe(true);
    expect(mockUpdateCollectionQuery).toHaveBeenCalledWith('collection-123', 'user-123', {
      name: 'Test',
      description: null,
      slug: 'hooks',
    });
  });

  it('leaves the slug undefined when it is not sent', async () => {
    await updateCollection({ id: 'collection-123', name: 'Test' });

    expect(mockUpdateCollectionQuery).toHaveBeenCalledWith('collection-123', 'user-123', {
      name: 'Test',
      description: null,
      slug: undefined,
    });
  });

  it('maps a unique violation to a slug field error', async () => {
    mockUpdateCollectionQuery.mockRejectedValue({ code: 'P2002' });

    const result = await updateCollection({ id: 'collection-123', name: 'Test', slug: 'taken' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
    expect(result.fieldErrors?.slug).toEqual(['Another collection already uses this slug']);
  });
});

describe('setCollectionVisibility server action', () => {
  const session = {
    user: { id: 'user-123', isPro: false },
    expires: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(session);
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await setCollectionVisibility({ id: 'collection-123', visibility: 'PUBLIC' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(mockSetCollectionVisibilityQuery).not.toHaveBeenCalled();
  });

  it('rejects an unknown visibility value', async () => {
    const result = await setCollectionVisibility({
      id: 'collection-123',
      visibility: 'FRIENDS' as never,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
    expect(result.fieldErrors?.visibility).toBeDefined();
    expect(mockSetCollectionVisibilityQuery).not.toHaveBeenCalled();
  });

  it('returns not found when the query returns null', async () => {
    mockSetCollectionVisibilityQuery.mockResolvedValue(null);

    const result = await setCollectionVisibility({ id: 'collection-123', visibility: 'UNLISTED' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Collection not found');
  });

  it('returns the visibility update on success', async () => {
    const publishedAt = new Date();
    mockSetCollectionVisibilityQuery.mockResolvedValue({ visibility: 'PUBLIC', publishedAt, handle: 'brad' });

    const result = await setCollectionVisibility({ id: 'collection-123', visibility: 'PUBLIC' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ visibility: 'PUBLIC', publishedAt, handle: 'brad' });
    expect(mockSetCollectionVisibilityQuery).toHaveBeenCalledWith('collection-123', 'user-123', 'PUBLIC');
  });

  it('returns a generic error when the query throws', async () => {
    mockSetCollectionVisibilityQuery.mockRejectedValue(new Error('DB error'));

    const result = await setCollectionVisibility({ id: 'collection-123', visibility: 'PUBLIC' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to update visibility');
  });
});

describe('moveCollectionItem server action', () => {
  const session = {
    user: { id: 'user-123', isPro: false },
    expires: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(session);
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await moveCollectionItem({ collectionId: 'collection-123', itemId: 'item-1', direction: 'up' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(mockMoveCollectionItemQuery).not.toHaveBeenCalled();
  });

  it('rejects an unknown direction', async () => {
    const result = await moveCollectionItem({
      collectionId: 'collection-123',
      itemId: 'item-1',
      direction: 'sideways' as never,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
    expect(result.fieldErrors?.direction).toBeDefined();
    expect(mockMoveCollectionItemQuery).not.toHaveBeenCalled();
  });

  it('returns not found when the query returns false', async () => {
    mockMoveCollectionItemQuery.mockResolvedValue(false);

    const result = await moveCollectionItem({ collectionId: 'collection-123', itemId: 'item-1', direction: 'down' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Item not found in this collection');
  });

  it('moves the item with the session user as owner', async () => {
    mockMoveCollectionItemQuery.mockResolvedValue(true);

    const result = await moveCollectionItem({ collectionId: 'collection-123', itemId: 'item-1', direction: 'down' });

    expect(result.success).toBe(true);
    expect(mockMoveCollectionItemQuery).toHaveBeenCalledWith('collection-123', 'user-123', 'item-1', 'down');
  });

  it('returns a generic error when the query throws', async () => {
    mockMoveCollectionItemQuery.mockRejectedValue(new Error('DB error'));

    const result = await moveCollectionItem({ collectionId: 'collection-123', itemId: 'item-1', direction: 'up' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to move item');
  });
});

describe('public page revalidation from collection actions', () => {
  const session = {
    user: { id: 'user-123', isPro: true },
    expires: new Date().toISOString(),
  };

  const created = {
    id: 'collection-123',
    name: 'React',
    description: null,
    slug: 'react',
    isFavorite: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(session);
  });

  it('setCollectionVisibility revalidates the paths before and after the change', async () => {
    mockPublicPathsForCollections
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(['/brad/react']);
    mockSetCollectionVisibilityQuery.mockResolvedValue({
      visibility: 'PUBLIC',
      publishedAt: new Date(),
      handle: 'brad',
    });

    const result = await setCollectionVisibility({ id: 'collection-123', visibility: 'PUBLIC' });

    expect(result.success).toBe(true);
    expect(mockPublicPathsForCollections).toHaveBeenCalledTimes(2);
    expect(mockPublicPathsForCollections).toHaveBeenCalledWith(['collection-123']);
    expect(revalidated()).toEqual(['/brad/react']);
    expect(mockRevalidatePath.mock.invocationCallOrder[0]).toBeGreaterThan(
      mockSetCollectionVisibilityQuery.mock.invocationCallOrder[0]
    );
  });

  it('setCollectionVisibility clears the old page when a collection goes private', async () => {
    mockPublicPathsForCollections
      .mockResolvedValueOnce(['/brad/react'])
      .mockResolvedValueOnce([]);
    mockSetCollectionVisibilityQuery.mockResolvedValue({
      visibility: 'PRIVATE',
      publishedAt: new Date(),
      handle: 'brad',
    });

    await setCollectionVisibility({ id: 'collection-123', visibility: 'PRIVATE' });

    expect(revalidated()).toEqual(['/brad/react']);
  });

  it('setCollectionVisibility skips revalidation when the collection is not found', async () => {
    mockSetCollectionVisibilityQuery.mockResolvedValue(null);

    await setCollectionVisibility({ id: 'collection-123', visibility: 'PUBLIC' });

    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('updateCollection revalidates the old and new slug paths', async () => {
    mockPublicPathsForCollections
      .mockResolvedValueOnce(['/brad/react'])
      .mockResolvedValueOnce(['/brad/react-hooks']);
    mockUpdateCollectionQuery.mockResolvedValue({ ...created, slug: 'react-hooks' });

    const result = await updateCollection({
      id: 'collection-123',
      name: 'React',
      description: null,
      slug: 'react-hooks',
    });

    expect(result.success).toBe(true);
    expect(revalidated()).toEqual(['/brad/react', '/brad/react-hooks']);
  });

  it('updateCollection also clears the path of a reclaimed slug when the collection is private', async () => {
    mockPublicPathsForCollections.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockPublicPathForOwnerSlug.mockResolvedValueOnce(['/brad/react']);
    mockUpdateCollectionQuery.mockResolvedValue(created);

    await updateCollection({ id: 'collection-123', name: 'React', description: null, slug: 'react' });

    expect(mockPublicPathForOwnerSlug).toHaveBeenCalledWith('user-123', 'react');
    expect(revalidated()).toEqual(['/brad/react']);
  });

  it('updateCollection without a slug does not look up the owner slug path', async () => {
    mockUpdateCollectionQuery.mockResolvedValue(created);

    await updateCollection({ id: 'collection-123', name: 'React', description: null });

    expect(mockPublicPathForOwnerSlug).not.toHaveBeenCalled();
  });

  it('createCollection clears a cached redirect for the slug it takes', async () => {
    mockCanCreateCollection.mockResolvedValue(true);
    mockCreateCollectionQuery.mockResolvedValue(created);
    mockPublicPathForOwnerSlug.mockResolvedValueOnce(['/brad/react']);

    const result = await createCollection({ name: 'React', description: null });

    expect(result.success).toBe(true);
    expect(mockPublicPathForOwnerSlug).toHaveBeenCalledWith('user-123', 'react');
    expect(revalidated()).toEqual(['/brad/react']);
  });

  it('updateCollection skips revalidation when the query fails', async () => {
    mockUpdateCollectionQuery.mockRejectedValue(new Error('db down'));

    const result = await updateCollection({ id: 'collection-123', name: 'React', description: null });

    expect(result.success).toBe(false);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('moveCollectionItem revalidates the collection page after the move', async () => {
    mockPublicPathsForCollections.mockResolvedValueOnce(['/brad/react']);
    mockMoveCollectionItemQuery.mockResolvedValue(true);

    await moveCollectionItem({ collectionId: 'collection-123', itemId: 'item-1', direction: 'up' });

    expect(mockPublicPathsForCollections).toHaveBeenCalledTimes(1);
    expect(revalidated()).toEqual(['/brad/react']);
  });

  it('moveCollectionItem skips revalidation when the item is not in the collection', async () => {
    mockMoveCollectionItemQuery.mockResolvedValue(false);

    await moveCollectionItem({ collectionId: 'collection-123', itemId: 'item-1', direction: 'up' });

    expect(mockPublicPathsForCollections).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('a failing path lookup after the write is logged and the result still succeeds', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockPublicPathsForCollections
      .mockResolvedValueOnce(['/brad/react'])
      .mockRejectedValueOnce(new Error('db hiccup'));
    mockSetCollectionVisibilityQuery.mockResolvedValue({
      visibility: 'PRIVATE',
      publishedAt: new Date(),
      handle: 'brad',
    });

    const result = await setCollectionVisibility({ id: 'collection-123', visibility: 'PRIVATE' });

    expect(result.success).toBe(true);
    expect(revalidated()).toEqual(['/brad/react']);
    errorSpy.mockRestore();
  });

  it('a failing path lookup before the write does not block the write', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockPublicPathsForCollections
      .mockRejectedValueOnce(new Error('db hiccup'))
      .mockResolvedValueOnce(['/brad/react']);
    mockUpdateCollectionQuery.mockResolvedValue(created);

    const result = await updateCollection({ id: 'collection-123', name: 'React', description: null });

    expect(result.success).toBe(true);
    expect(mockUpdateCollectionQuery).toHaveBeenCalled();
    expect(revalidated()).toEqual(['/brad/react']);
    errorSpy.mockRestore();
  });

  it('deleteCollection revalidates the page it had before deletion', async () => {
    mockPublicPathsForCollections.mockResolvedValueOnce(['/brad/react']);
    mockDeleteCollectionQuery.mockResolvedValue(true);

    await deleteCollection({ id: 'collection-123' });

    expect(mockPublicPathsForCollections.mock.invocationCallOrder[0]).toBeLessThan(
      mockDeleteCollectionQuery.mock.invocationCallOrder[0]
    );
    expect(revalidated()).toEqual(['/brad/react']);
  });

  it('deleteCollection skips revalidation when nothing was deleted', async () => {
    mockPublicPathsForCollections.mockResolvedValueOnce(['/brad/react']);
    mockDeleteCollectionQuery.mockResolvedValue(false);

    await deleteCollection({ id: 'collection-123' });

    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('toggleCollectionFavorite never revalidates', async () => {
    mockToggleCollectionFavoriteQuery.mockResolvedValue(true);

    await toggleCollectionFavorite('collection-123');

    expect(mockPublicPathsForCollections).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
