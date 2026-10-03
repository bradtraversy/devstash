import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

// Mock the auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock the db module
vi.mock('@/lib/db/items', () => ({
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  createItem: vi.fn(),
  toggleItemFavorite: vi.fn(),
  toggleItemPin: vi.fn(),
  setItemVisibility: vi.fn(),
  VALID_ITEM_TYPES: ['snippet', 'prompt', 'command', 'note', 'file', 'image', 'link'] as const,
  isFileType: (name: string) => name === 'file' || name === 'image',
  UnknownCollectionError: class UnknownCollectionError extends Error {},
}));

// Mock the usage module
vi.mock('@/lib/usage', () => ({
  canCreateItem: vi.fn(),
}));

vi.mock('@/lib/db/public', () => ({
  publicPathsForItem: vi.fn(async () => []),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { updateItem, deleteItem, createItem, toggleItemFavorite, toggleItemPin, setItemVisibility } from './items';
import { auth } from '@/auth';
import { updateItem as updateItemQuery, deleteItem as deleteItemQuery, createItem as createItemQuery, toggleItemFavorite as toggleItemFavoriteQuery, toggleItemPin as toggleItemPinQuery, setItemVisibility as setItemVisibilityQuery, UnknownCollectionError } from '@/lib/db/items';
import { canCreateItem } from '@/lib/usage';
import { publicPathsForItem } from '@/lib/db/public';
import { revalidatePath } from 'next/cache';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const mockUpdateItemQuery = vi.mocked(updateItemQuery);
const mockDeleteItemQuery = vi.mocked(deleteItemQuery);
const mockCreateItemQuery = vi.mocked(createItemQuery);
const mockToggleItemFavoriteQuery = vi.mocked(toggleItemFavoriteQuery);
const mockToggleItemPinQuery = vi.mocked(toggleItemPinQuery);
const mockSetItemVisibilityQuery = vi.mocked(setItemVisibilityQuery);
const mockCanCreateItem = vi.mocked(canCreateItem);
const mockPublicPathsForItem = vi.mocked(publicPathsForItem);
const mockRevalidatePath = vi.mocked(revalidatePath);
const revalidated = () => mockRevalidatePath.mock.calls.map((call) => call[0]);

// These tests cover Pro gating, so the switch is on unless a test turns it off.
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_PRO_ENABLED', 'true');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('updateItem server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await updateItem('item-123', {
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns validation error for empty title', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await updateItem('item-123', {
      title: '   ',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
    expect(result.fieldErrors?.title).toBeDefined();
  });

  it('returns validation error for invalid URL', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await updateItem('item-123', {
      title: 'Test',
      description: null,
      content: null,
      url: 'not-a-url',
      language: null,
      tags: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
    expect(result.fieldErrors?.url).toBeDefined();
  });

  it('returns error when item not found', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockUpdateItemQuery.mockResolvedValue(null);

    const result = await updateItem('item-123', {
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Item not found or access denied');
  });

  it('returns updated item on success', async () => {
    const mockItem = {
      id: 'item-123',
      title: 'Updated Title',
      description: 'Updated description',
      content: 'const x = 1;',
      url: null,
      language: 'javascript',
      contentType: 'TEXT',
      fileUrl: null,
      fileName: null,
      fileSize: null,
      isFavorite: false,
      isPinned: false,
      visibility: 'PRIVATE' as const,
      shortId: 'abc12345',
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
      tags: ['react', 'hooks'],
      collections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockUpdateItemQuery.mockResolvedValue(mockItem);

    const result = await updateItem('item-123', {
      title: 'Updated Title',
      description: 'Updated description',
      content: 'const x = 1;',
      url: null,
      language: 'javascript',
      tags: ['react', 'hooks'],
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockItem);
    expect(mockUpdateItemQuery).toHaveBeenCalledWith('user-123', 'item-123', {
      title: 'Updated Title',
      description: 'Updated description',
      content: 'const x = 1;',
      url: null,
      language: 'javascript',
      tags: ['react', 'hooks'],
    });
  });

  it('filters empty tags', async () => {
    const mockItem = {
      id: 'item-123',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      contentType: 'TEXT',
      fileUrl: null,
      fileName: null,
      fileSize: null,
      isFavorite: false,
      isPinned: false,
      visibility: 'PRIVATE' as const,
      shortId: 'abc12345',
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
      tags: ['valid'],
      collections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockUpdateItemQuery.mockResolvedValue(mockItem);

    await updateItem('item-123', {
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: ['valid', '', '  ', 'another'],
    });

    expect(mockUpdateItemQuery).toHaveBeenCalledWith('user-123', 'item-123', {
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: ['valid', 'another'],
    });
  });

  it('passes collectionIds when provided', async () => {
    const mockItem = {
      id: 'item-123',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      contentType: 'TEXT',
      fileUrl: null,
      fileName: null,
      fileSize: null,
      isFavorite: false,
      isPinned: false,
      visibility: 'PRIVATE' as const,
      shortId: 'abc12345',
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
      tags: [],
      collections: [{ id: 'coll-1', name: 'React', visibility: 'PRIVATE' as const }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockUpdateItemQuery.mockResolvedValue(mockItem);

    await updateItem('item-123', {
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      collectionIds: ['coll-1', 'coll-2'],
    });

    expect(mockUpdateItemQuery).toHaveBeenCalledWith('user-123', 'item-123', {
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      collectionIds: ['coll-1', 'coll-2'],
    });
  });
});

describe('deleteItem server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await deleteItem('item-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns error for empty item ID', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await deleteItem('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid item ID');
  });

  it('returns error when item not found', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockDeleteItemQuery.mockResolvedValue(false);

    const result = await deleteItem('item-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Item not found or access denied');
  });

  it('returns success when item deleted', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockDeleteItemQuery.mockResolvedValue(true);

    const result = await deleteItem('item-123');

    expect(result.success).toBe(true);
    expect(mockDeleteItemQuery).toHaveBeenCalledWith('user-123', 'item-123');
  });
});

describe('createItem server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: allow item creation
    mockCanCreateItem.mockResolvedValue(true);
  });

  it('passes the visibility through to the query', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockCreateItemQuery.mockResolvedValue({ id: 'item-123' } as never);

    await createItem({
      typeName: 'snippet',
      title: 'Shared',
      description: null,
      content: 'const x = 1;',
      url: null,
      language: null,
      tags: [],
      fileUrl: null,
      fileName: null,
      fileSize: null,
      visibility: 'UNLISTED',
    });

    expect(mockCreateItemQuery).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({ visibility: 'UNLISTED' })
    );
  });

  it('rejects an unknown visibility', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await createItem({
      typeName: 'snippet',
      title: 'Shared',
      description: null,
      content: 'const x = 1;',
      url: null,
      language: null,
      tags: [],
      fileUrl: null,
      fileName: null,
      fileSize: null,
      visibility: 'EVERYONE' as never,
    });

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.visibility).toBeDefined();
    expect(mockCreateItemQuery).not.toHaveBeenCalled();
  });

  describe('file references', () => {
    const PUBLIC = 'https://pub-test.r2.dev';
    const createdFile = {
      id: 'item-file',
      title: 'Notes',
      description: null,
      content: null,
      url: null,
      language: null,
      contentType: 'FILE',
      fileUrl: `${PUBLIC}/user-123/1700000000-notes.pdf`,
      fileName: 'notes.pdf',
      fileSize: 1024,
      isFavorite: false,
      isPinned: false,
      visibility: 'PRIVATE' as const,
      shortId: 'abc12345',
      itemType: { name: 'file', icon: 'File', color: '#6b7280' },
      tags: [],
      collections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      vi.stubEnv('R2_PUBLIC_URL', PUBLIC);
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', isPro: true },
        expires: new Date().toISOString(),
      });
      mockCreateItemQuery.mockResolvedValue(createdFile);
    });

    it('rejects a file URL outside the caller upload namespace', async () => {
      const result = await createItem({
        typeName: 'file',
        title: 'Notes',
        description: null,
        content: null,
        url: null,
        language: null,
        tags: [],
        fileUrl: `${PUBLIC}/user-victim/1700000000-secret.pdf`,
        fileName: 'secret.pdf',
        fileSize: 1024,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid file reference');
      expect(result.fieldErrors?.fileUrl).toBeDefined();
      expect(mockCreateItemQuery).not.toHaveBeenCalled();
    });

    it('rejects a file URL on a foreign host', async () => {
      const result = await createItem({
        typeName: 'image',
        title: 'Meta',
        description: null,
        content: null,
        url: null,
        language: null,
        tags: [],
        fileUrl: 'http://169.254.169.254/latest/meta-data/',
        fileName: 'meta.png',
        fileSize: 1,
      });

      expect(result.success).toBe(false);
      expect(mockCreateItemQuery).not.toHaveBeenCalled();
    });

    it('accepts a file URL inside the caller upload namespace', async () => {
      const result = await createItem({
        typeName: 'file',
        title: 'Notes',
        description: null,
        content: null,
        url: null,
        language: null,
        tags: [],
        fileUrl: `${PUBLIC}/user-123/1700000000-notes.pdf`,
        fileName: 'notes.pdf',
        fileSize: 1024,
      });

      expect(result.success).toBe(true);
      expect(mockCreateItemQuery).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ fileUrl: `${PUBLIC}/user-123/1700000000-notes.pdf` })
      );
    });

    it('drops file fields on non-file item types', async () => {
      await createItem({
        typeName: 'snippet',
        title: 'Code',
        description: null,
        content: 'console.log(1)',
        url: null,
        language: 'javascript',
        tags: [],
        fileUrl: 'https://evil.example/anything.pdf',
        fileName: 'anything.pdf',
        fileSize: 5,
      });

      expect(mockCreateItemQuery).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ fileUrl: null, fileName: null, fileSize: null })
      );
    });
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await createItem({
      typeName: 'snippet',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns validation error for empty title', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await createItem({
      typeName: 'snippet',
      title: '   ',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
    expect(result.fieldErrors?.title).toBeDefined();
  });

  it('returns validation error for invalid URL', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await createItem({
      typeName: 'link',
      title: 'Test Link',
      description: null,
      content: null,
      url: 'not-a-url',
      language: null,
      tags: [],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
    expect(result.fieldErrors?.url).toBeDefined();
  });

  it('returns error when file type and not Pro', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await createItem({
      typeName: 'file',
      title: 'Test File',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      fileUrl: 'https://example.com/file.pdf',
      fileName: 'file.pdf',
      fileSize: 1024,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('File and image uploads require a Pro subscription');
  });

  it('returns error when image type and not Pro', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await createItem({
      typeName: 'image',
      title: 'Test Image',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      fileUrl: 'https://example.com/image.png',
      fileName: 'image.png',
      fileSize: 2048,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('File and image uploads require a Pro subscription');
  });

  it('refuses file items even for a Pro user while Pro is off', async () => {
    vi.stubEnv('NEXT_PUBLIC_PRO_ENABLED', '');
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    });

    const result = await createItem({
      typeName: 'image',
      title: 'Test Image',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      fileUrl: 'https://example.com/image.png',
      fileName: 'image.png',
      fileSize: 1024,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('File and image items are not available right now');
  });

  it('reports the ceiling without upgrade wording when the limit is hit while Pro is off', async () => {
    vi.stubEnv('NEXT_PUBLIC_PRO_ENABLED', '');
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockCanCreateItem.mockResolvedValue(false);

    const result = await createItem({
      typeName: 'snippet',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('You have reached the limit of 1,000 items. Delete some to add more.');
  });

  it('returns error when item limit reached', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockCanCreateItem.mockResolvedValue(false);

    const result = await createItem({
      typeName: 'snippet',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('free tier limit of 50 items');
  });

  it('returns error when URL is required for link but not provided', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await createItem({
      typeName: 'link',
      title: 'Test Link',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('URL is required for links');
    expect(result.fieldErrors?.url).toContain('URL is required');
  });

  it('returns error when creation fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockCreateItemQuery.mockResolvedValue(null);

    const result = await createItem({
      typeName: 'snippet',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to create item');
  });

  it('returns created item on success', async () => {
    const mockItem = {
      id: 'item-123',
      title: 'New Snippet',
      description: 'A test snippet',
      content: 'const x = 1;',
      url: null,
      language: 'javascript',
      contentType: 'TEXT',
      fileUrl: null,
      fileName: null,
      fileSize: null,
      isFavorite: false,
      isPinned: false,
      visibility: 'PRIVATE' as const,
      shortId: 'abc12345',
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
      tags: ['react'],
      collections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockCreateItemQuery.mockResolvedValue(mockItem);

    const result = await createItem({
      typeName: 'snippet',
      title: 'New Snippet',
      description: 'A test snippet',
      content: 'const x = 1;',
      url: null,
      language: 'javascript',
      tags: ['react'],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockItem);
    expect(mockCreateItemQuery).toHaveBeenCalledWith('user-123', {
      typeName: 'snippet',
      title: 'New Snippet',
      description: 'A test snippet',
      content: 'const x = 1;',
      url: null,
      language: 'javascript',
      tags: ['react'],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });
  });

  it('filters empty tags', async () => {
    const mockItem = {
      id: 'item-123',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      contentType: 'TEXT',
      fileUrl: null,
      fileName: null,
      fileSize: null,
      isFavorite: false,
      isPinned: false,
      visibility: 'PRIVATE' as const,
      shortId: 'abc12345',
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
      tags: ['valid', 'another'],
      collections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockCreateItemQuery.mockResolvedValue(mockItem);

    await createItem({
      typeName: 'snippet',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: ['valid', '', '  ', 'another'],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(mockCreateItemQuery).toHaveBeenCalledWith('user-123', {
      typeName: 'snippet',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: ['valid', 'another'],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });
  });

  it('passes collectionIds when provided', async () => {
    const mockItem = {
      id: 'item-123',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      contentType: 'TEXT',
      fileUrl: null,
      fileName: null,
      fileSize: null,
      isFavorite: false,
      isPinned: false,
      visibility: 'PRIVATE' as const,
      shortId: 'abc12345',
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
      tags: [],
      collections: [{ id: 'coll-1', name: 'React', visibility: 'PRIVATE' as const }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockCreateItemQuery.mockResolvedValue(mockItem);

    await createItem({
      typeName: 'snippet',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      collectionIds: ['coll-1', 'coll-2'],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(mockCreateItemQuery).toHaveBeenCalledWith('user-123', {
      typeName: 'snippet',
      title: 'Test',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      collectionIds: ['coll-1', 'coll-2'],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });
  });
});

describe('toggleItemFavorite server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await toggleItemFavorite('item-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns error for empty item ID', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await toggleItemFavorite('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid item ID');
  });

  it('returns error when item not found', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockToggleItemFavoriteQuery.mockResolvedValue(null);

    const result = await toggleItemFavorite('item-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Item not found or access denied');
  });

  it('returns new favorite state when toggled on', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockToggleItemFavoriteQuery.mockResolvedValue(true);

    const result = await toggleItemFavorite('item-123');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ isFavorite: true });
    expect(mockToggleItemFavoriteQuery).toHaveBeenCalledWith('user-123', 'item-123');
  });

  it('returns new favorite state when toggled off', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockToggleItemFavoriteQuery.mockResolvedValue(false);

    const result = await toggleItemFavorite('item-123');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ isFavorite: false });
  });
});

describe('toggleItemPin server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await toggleItemPin('item-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns error for empty item ID', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await toggleItemPin('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid item ID');
  });

  it('returns error when item not found', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockToggleItemPinQuery.mockResolvedValue(null);

    const result = await toggleItemPin('item-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Item not found or access denied');
  });

  it('returns new pinned state when toggled on', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockToggleItemPinQuery.mockResolvedValue(true);

    const result = await toggleItemPin('item-123');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ isPinned: true });
    expect(mockToggleItemPinQuery).toHaveBeenCalledWith('user-123', 'item-123');
  });

  it('returns new pinned state when toggled off', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockToggleItemPinQuery.mockResolvedValue(false);

    const result = await toggleItemPin('item-123');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ isPinned: false });
  });
});

describe('item action error mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
  });

  const payload = {
    title: 'Test',
    description: null,
    content: null,
    url: null,
    language: null,
    tags: [],
  };

  it('reports a stale or foreign collection id as a field error', async () => {
    const error = new UnknownCollectionError();
    error.message = 'One of the selected collections no longer exists';
    mockUpdateItemQuery.mockRejectedValue(error);

    const result = await updateItem('item-123', { ...payload, collectionIds: ['deleted-collection'] });

    expect(result.success).toBe(false);
    expect(result.error).toBe('One of the selected collections no longer exists');
    expect(result.fieldErrors?.collectionIds).toBeDefined();
  });

  it('returns a failure result instead of throwing on unexpected database errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdateItemQuery.mockRejectedValue(new Error('connection reset'));

    const result = await updateItem('item-123', payload);

    expect(result).toEqual({ success: false, error: 'Failed to update item' });
  });

  it('maps create failures the same way', async () => {
    mockCanCreateItem.mockResolvedValue(true);
    const error = new UnknownCollectionError();
    error.message = 'One of the selected collections no longer exists';
    mockCreateItemQuery.mockRejectedValue(error);

    const result = await createItem({
      typeName: 'snippet',
      ...payload,
      collectionIds: ['deleted-collection'],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.collectionIds).toBeDefined();
  });
});

describe('public page revalidation from item actions', () => {
  const session = {
    user: { id: 'user-123', isPro: true },
    expires: new Date().toISOString(),
  };

  const detail = {
    id: 'item-123',
    title: 'useAuth',
    description: null,
    content: 'export function useAuth() {}',
    url: null,
    language: 'typescript',
    contentType: 'TEXT',
    fileUrl: null,
    fileName: null,
    fileSize: null,
    isFavorite: false,
    isPinned: false,
    visibility: 'PRIVATE' as const,
    shortId: 'abc12345',
    itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
    tags: [],
    collections: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const input = {
    title: 'useAuth',
    description: null,
    content: 'export function useAuth() {}',
    url: null,
    language: 'typescript',
    tags: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(session);
    mockCanCreateItem.mockResolvedValue(true);
  });

  it('updateItem revalidates the collections the item was in and is now in', async () => {
    mockPublicPathsForItem
      .mockResolvedValueOnce(['/brad/react'])
      .mockResolvedValueOnce(['/brad/node']);
    mockUpdateItemQuery.mockResolvedValue(detail);

    const result = await updateItem('item-123', { ...input, collectionIds: ['col-2'] });

    expect(result.success).toBe(true);
    expect(mockPublicPathsForItem).toHaveBeenCalledTimes(2);
    expect(mockPublicPathsForItem).toHaveBeenCalledWith('item-123');
    expect(revalidated()).toEqual(['/brad/react', '/brad/node']);
  });

  it('updateItem skips revalidation when the item is not found', async () => {
    mockPublicPathsForItem.mockResolvedValueOnce(['/brad/react']);
    mockUpdateItemQuery.mockResolvedValue(null);

    await updateItem('item-123', input);

    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('createItem revalidates the collections the new item joined', async () => {
    mockPublicPathsForItem.mockResolvedValueOnce(['/brad/react']);
    mockCreateItemQuery.mockResolvedValue({ ...detail, id: 'item-new' });

    const result = await createItem({
      typeName: 'snippet',
      ...input,
      fileUrl: null,
      fileName: null,
      fileSize: null,
      collectionIds: ['col-1'],
    });

    expect(result.success).toBe(true);
    expect(mockPublicPathsForItem).toHaveBeenCalledTimes(1);
    expect(mockPublicPathsForItem).toHaveBeenCalledWith('item-new');
    expect(revalidated()).toEqual(['/brad/react']);
  });

  it('deleteItem revalidates the pages the item was on before deleting', async () => {
    mockPublicPathsForItem.mockResolvedValueOnce(['/brad/react']);
    mockDeleteItemQuery.mockResolvedValue(true);

    await deleteItem('item-123');

    expect(mockPublicPathsForItem.mock.invocationCallOrder[0]).toBeLessThan(
      mockDeleteItemQuery.mock.invocationCallOrder[0]
    );
    expect(revalidated()).toEqual(['/brad/react']);
  });

  it('deleteItem skips revalidation when nothing was deleted', async () => {
    mockPublicPathsForItem.mockResolvedValueOnce(['/brad/react']);
    mockDeleteItemQuery.mockResolvedValue(false);

    await deleteItem('item-123');

    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('createItem still succeeds when the path lookup fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockPublicPathsForItem.mockRejectedValueOnce(new Error('db hiccup'));
    mockCreateItemQuery.mockResolvedValue({ ...detail, id: 'item-new' });

    const result = await createItem({
      typeName: 'snippet',
      ...input,
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });

    expect(result.success).toBe(true);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('favorite and pin toggles never revalidate', async () => {
    mockToggleItemFavoriteQuery.mockResolvedValue(true);
    mockToggleItemPinQuery.mockResolvedValue(true);

    await toggleItemFavorite('item-123');
    await toggleItemPin('item-123');

    expect(mockPublicPathsForItem).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

describe('setItemVisibility server action', () => {
  const session = {
    user: { id: 'user-123', isPro: false },
    expires: new Date().toISOString(),
  };
  const update = { visibility: 'UNLISTED' as const, publishedAt: new Date(), handle: 'brad' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(session);
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await setItemVisibility({ id: 'item-123', visibility: 'UNLISTED' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(mockSetItemVisibilityQuery).not.toHaveBeenCalled();
  });

  it('returns validation errors for a missing id or an unknown visibility', async () => {
    const noId = await setItemVisibility({ id: '', visibility: 'UNLISTED' });
    expect(noId.success).toBe(false);
    expect(noId.fieldErrors?.id).toBeDefined();

    const badValue = await setItemVisibility({ id: 'item-123', visibility: 'EVERYONE' as never });
    expect(badValue.success).toBe(false);
    expect(badValue.fieldErrors?.visibility).toBeDefined();

    expect(mockSetItemVisibilityQuery).not.toHaveBeenCalled();
  });

  it('returns error when the item is not found or not owned', async () => {
    mockSetItemVisibilityQuery.mockResolvedValue(null);

    const result = await setItemVisibility({ id: 'item-123', visibility: 'UNLISTED' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Item not found or access denied');
    expect(mockSetItemVisibilityQuery).toHaveBeenCalledWith('item-123', 'user-123', 'UNLISTED');
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('returns the update and revalidates the paths from before and after', async () => {
    mockSetItemVisibilityQuery.mockResolvedValue(update);
    mockPublicPathsForItem.mockResolvedValueOnce([]).mockResolvedValueOnce(['/s/abc12345']);

    const result = await setItemVisibility({ id: 'item-123', visibility: 'UNLISTED' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(update);
    expect(mockPublicPathsForItem).toHaveBeenCalledTimes(2);
    expect(mockPublicPathsForItem).toHaveBeenCalledWith('item-123');
    expect(revalidated()).toEqual(['/s/abc12345']);
  });

  it('clears the old page when an item goes private', async () => {
    mockSetItemVisibilityQuery.mockResolvedValue({ ...update, visibility: 'PRIVATE' });
    mockPublicPathsForItem
      .mockResolvedValueOnce(['/s/abc12345', '/brad/react'])
      .mockResolvedValueOnce(['/brad/react']);

    await setItemVisibility({ id: 'item-123', visibility: 'PRIVATE' });

    expect(revalidated()).toEqual(['/s/abc12345', '/brad/react']);
  });

  it('returns a failure result when the query throws', async () => {
    mockSetItemVisibilityQuery.mockRejectedValue(new Error('boom'));

    const result = await setItemVisibility({ id: 'item-123', visibility: 'PUBLIC' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to update visibility');
  });
});
