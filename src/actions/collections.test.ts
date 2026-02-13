import { describe, it, expect, vi, beforeEach } from 'vitest';

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
}));

// Mock the usage module
vi.mock('@/lib/usage', () => ({
  canCreateCollection: vi.fn(),
}));

import { createCollection, updateCollection, deleteCollection, getUserCollections, toggleCollectionFavorite } from './collections';
import { auth } from '@/auth';
import {
  createCollection as createCollectionQuery,
  updateCollection as updateCollectionQuery,
  deleteCollection as deleteCollectionQuery,
  getUserCollections as getUserCollectionsQuery,
  toggleCollectionFavorite as toggleCollectionFavoriteQuery,
} from '@/lib/db/collections';
import { canCreateCollection } from '@/lib/usage';

const mockAuth = vi.mocked(auth);
const mockCreateCollectionQuery = vi.mocked(createCollectionQuery);
const mockUpdateCollectionQuery = vi.mocked(updateCollectionQuery);
const mockDeleteCollectionQuery = vi.mocked(deleteCollectionQuery);
const mockGetUserCollectionsQuery = vi.mocked(getUserCollectionsQuery);
const mockToggleCollectionFavoriteQuery = vi.mocked(toggleCollectionFavoriteQuery);
const mockCanCreateCollection = vi.mocked(canCreateCollection);

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
      user: { id: 'user-123' },
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
      user: { id: 'user-123' },
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
      user: { id: 'user-123' },
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
      user: { id: 'user-123' },
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
      isFavorite: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
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
      isFavorite: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
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
      isFavorite: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
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
      user: { id: 'user-123' },
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
      user: { id: 'user-123' },
      expires: new Date().toISOString(),
    });
    mockGetUserCollectionsQuery.mockRejectedValue(new Error('DB error'));

    const result = await getUserCollections();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to fetch collections');
  });

  it('returns empty array when user has no collections', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
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
      user: { id: 'user-123' },
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
      user: { id: 'user-123' },
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
      user: { id: 'user-123' },
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
      isFavorite: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
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
      user: { id: 'user-123' },
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
      user: { id: 'user-123' },
      expires: new Date().toISOString(),
    });

    const result = await deleteCollection({ id: '' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid collection ID');
  });

  it('returns error when collection not found', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
      expires: new Date().toISOString(),
    });
    mockDeleteCollectionQuery.mockResolvedValue(false);

    const result = await deleteCollection({ id: 'nonexistent' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Collection not found');
  });

  it('returns success when collection is deleted', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
      expires: new Date().toISOString(),
    });
    mockDeleteCollectionQuery.mockResolvedValue(true);

    const result = await deleteCollection({ id: 'collection-123' });

    expect(result.success).toBe(true);
    expect(mockDeleteCollectionQuery).toHaveBeenCalledWith('collection-123', 'user-123');
  });

  it('returns error when database operation fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
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
      user: { id: 'user-123' },
      expires: new Date().toISOString(),
    });

    const result = await toggleCollectionFavorite('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid collection ID');
  });

  it('returns error when collection not found', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
      expires: new Date().toISOString(),
    });
    mockToggleCollectionFavoriteQuery.mockResolvedValue(null);

    const result = await toggleCollectionFavorite('collection-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Collection not found');
  });

  it('returns new favorite state when toggled on', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
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
      user: { id: 'user-123' },
      expires: new Date().toISOString(),
    });
    mockToggleCollectionFavoriteQuery.mockResolvedValue(false);

    const result = await toggleCollectionFavorite('collection-123');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ isFavorite: false });
  });
});
