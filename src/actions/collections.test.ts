import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock the db module
vi.mock('@/lib/db/collections', () => ({
  createCollection: vi.fn(),
}));

import { createCollection } from './collections';
import { auth } from '@/auth';
import { createCollection as createCollectionQuery } from '@/lib/db/collections';

const mockAuth = vi.mocked(auth);
const mockCreateCollectionQuery = vi.mocked(createCollectionQuery);

describe('createCollection server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
