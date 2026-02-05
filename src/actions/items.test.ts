import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock the db module
vi.mock('@/lib/db/items', () => ({
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
}));

import { updateItem, deleteItem } from './items';
import { auth } from '@/auth';
import { updateItem as updateItemQuery, deleteItem as deleteItemQuery } from '@/lib/db/items';

const mockAuth = vi.mocked(auth);
const mockUpdateItemQuery = vi.mocked(updateItemQuery);
const mockDeleteItemQuery = vi.mocked(deleteItemQuery);

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
