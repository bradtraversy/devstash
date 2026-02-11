import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  VALID_ITEM_TYPES: ['snippet', 'prompt', 'command', 'note', 'file', 'image', 'link'] as const,
}));

import { updateItem, deleteItem, createItem, toggleItemFavorite } from './items';
import { auth } from '@/auth';
import { updateItem as updateItemQuery, deleteItem as deleteItemQuery, createItem as createItemQuery, toggleItemFavorite as toggleItemFavoriteQuery } from '@/lib/db/items';

const mockAuth = vi.mocked(auth);
const mockUpdateItemQuery = vi.mocked(updateItemQuery);
const mockDeleteItemQuery = vi.mocked(deleteItemQuery);
const mockCreateItemQuery = vi.mocked(createItemQuery);
const mockToggleItemFavoriteQuery = vi.mocked(toggleItemFavoriteQuery);

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
      user: { id: 'user-123' },
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
      user: { id: 'user-123' },
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
      user: { id: 'user-123' },
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
      isFavorite: false,
      isPinned: false,
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
      tags: ['react', 'hooks'],
      collections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
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
      isFavorite: false,
      isPinned: false,
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
      tags: ['valid'],
      collections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
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
      isFavorite: false,
      isPinned: false,
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
      tags: [],
      collections: [{ id: 'coll-1', name: 'React' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
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
      user: { id: 'user-123' },
      expires: new Date().toISOString(),
    });

    const result = await deleteItem('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid item ID');
  });

  it('returns error when item not found', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
      expires: new Date().toISOString(),
    });
    mockDeleteItemQuery.mockResolvedValue(false);

    const result = await deleteItem('item-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Item not found or access denied');
  });

  it('returns success when item deleted', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
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
      user: { id: 'user-123' },
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
      user: { id: 'user-123' },
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

  it('returns error when URL is required for link but not provided', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
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
      user: { id: 'user-123' },
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
      isFavorite: false,
      isPinned: false,
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
      tags: ['react'],
      collections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
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
      isFavorite: false,
      isPinned: false,
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
      tags: ['valid', 'another'],
      collections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
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
      isFavorite: false,
      isPinned: false,
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
      tags: [],
      collections: [{ id: 'coll-1', name: 'React' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
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
      user: { id: 'user-123' },
      expires: new Date().toISOString(),
    });

    const result = await toggleItemFavorite('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid item ID');
  });

  it('returns error when item not found', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
      expires: new Date().toISOString(),
    });
    mockToggleItemFavoriteQuery.mockResolvedValue(null);

    const result = await toggleItemFavorite('item-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Item not found or access denied');
  });

  it('returns new favorite state when toggled on', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
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
      user: { id: 'user-123' },
      expires: new Date().toISOString(),
    });
    mockToggleItemFavoriteQuery.mockResolvedValue(false);

    const result = await toggleItemFavorite('item-123');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ isFavorite: false });
  });
});
