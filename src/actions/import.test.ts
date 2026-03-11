import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    item: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    collection: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    itemType: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { previewImport, importData } from './import';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;

const validExportJson = JSON.stringify({
  version: 1,
  exportedAt: '2026-03-11T00:00:00.000Z',
  items: [
    {
      title: 'useAuth hook',
      type: 'snippet',
      content: 'export function useAuth() {}',
      language: 'typescript',
      description: 'Custom auth hook',
      tags: ['react', 'auth'],
      collections: ['React Patterns'],
      isFavorite: true,
      isPinned: false,
    },
    {
      title: 'Git reset',
      type: 'command',
      content: 'git reset --hard HEAD~1',
      tags: ['git'],
      collections: [],
      isFavorite: false,
      isPinned: false,
    },
    {
      title: 'My Prompt',
      type: 'prompt',
      content: 'You are a helpful assistant',
      tags: [],
      collections: ['AI Workflows'],
      isFavorite: false,
      isPinned: false,
    },
  ],
  collections: [
    { name: 'React Patterns', description: 'Common patterns', isFavorite: false },
    { name: 'AI Workflows', description: null, isFavorite: true },
  ],
});

describe('previewImport server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await previewImport('{}');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns error for invalid JSON', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await previewImport('not json');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid JSON file');
  });

  it('returns error for invalid export format', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await previewImport(JSON.stringify({ foo: 'bar' }));

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid export format');
  });

  it('returns preview with correct counts', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await previewImport(validExportJson);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      itemCountsByType: { snippet: 1, command: 1, prompt: 1 },
      collectionCount: 2,
      tagCount: 3, // react, auth, git
      totalItems: 3,
    });
  });

  it('returns error for missing version field', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await previewImport(JSON.stringify({
      items: [],
      collections: [],
    }));

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid export format');
  });

  it('returns error for invalid item type', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await previewImport(JSON.stringify({
      version: 1,
      items: [{ title: 'Test', type: 'invalid-type', content: 'hello' }],
      collections: [],
    }));

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid export format');
  });

  it('handles empty export', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await previewImport(JSON.stringify({
      version: 1,
      items: [],
      collections: [],
    }));

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      itemCountsByType: {},
      collectionCount: 0,
      tagCount: 0,
      totalItems: 0,
    });
  });
});

describe('importData server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await importData('{}', true);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns error for invalid JSON', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await importData('not json', true);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid JSON file');
  });

  it('returns error for invalid export format', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await importData(JSON.stringify({ foo: 'bar' }), true);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid export format');
  });

  it('calls transaction with correct data for valid import', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.item.count).mockResolvedValue(0);
    vi.mocked(prisma.collection.count).mockResolvedValue(0);
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([]);
    vi.mocked(prisma.itemType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'snippet', icon: 'Code', color: '#3b82f6', isSystem: true, userId: null },
      { id: 'type-2', name: 'command', icon: 'Terminal', color: '#f97316', isSystem: true, userId: null },
      { id: 'type-3', name: 'prompt', icon: 'Sparkles', color: '#8b5cf6', isSystem: true, userId: null },
    ]);

    // Mock transaction to execute the callback
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const txClient = {
        collection: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: 'new-coll', name: 'Test' }),
        },
        item: {
          create: vi.fn().mockResolvedValue({ id: 'new-item' }),
        },
      };
      return (fn as (tx: typeof txClient) => Promise<void>)(txClient);
    });

    const result = await importData(validExportJson, false);

    expect(result.success).toBe(true);
    expect(result.data?.itemsImported).toBe(3);
    expect(result.data?.collectionsImported).toBe(2);
  });

  it('filters file/image types for free users', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const jsonWithFiles = JSON.stringify({
      version: 1,
      items: [
        { title: 'Snippet', type: 'snippet', content: 'code', tags: [], collections: [] },
        { title: 'Image', type: 'image', content: null, tags: [], collections: [] },
        { title: 'File', type: 'file', content: null, tags: [], collections: [] },
      ],
      collections: [],
    });

    vi.mocked(prisma.item.count).mockResolvedValue(0);
    vi.mocked(prisma.collection.count).mockResolvedValue(0);
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([]);
    vi.mocked(prisma.itemType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'snippet', icon: 'Code', color: '#3b82f6', isSystem: true, userId: null },
    ]);

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const txClient = {
        collection: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: 'new-coll', name: 'Test' }),
        },
        item: {
          create: vi.fn().mockResolvedValue({ id: 'new-item' }),
        },
      };
      return (fn as (tx: typeof txClient) => Promise<void>)(txClient);
    });

    const result = await importData(jsonWithFiles, false);

    expect(result.success).toBe(true);
    // Only the snippet should be imported, file and image filtered out
    expect(result.data?.itemsImported).toBe(1);
  });

  it('enforces free tier item limit', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    // User already has 49 items
    vi.mocked(prisma.item.count).mockResolvedValue(49);
    vi.mocked(prisma.collection.count).mockResolvedValue(0);
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([]);
    vi.mocked(prisma.itemType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'snippet', icon: 'Code', color: '#3b82f6', isSystem: true, userId: null },
      { id: 'type-2', name: 'command', icon: 'Terminal', color: '#f97316', isSystem: true, userId: null },
      { id: 'type-3', name: 'prompt', icon: 'Sparkles', color: '#8b5cf6', isSystem: true, userId: null },
    ]);

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const txClient = {
        collection: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: 'new-coll', name: 'Test' }),
        },
        item: {
          create: vi.fn().mockResolvedValue({ id: 'new-item' }),
        },
      };
      return (fn as (tx: typeof txClient) => Promise<void>)(txClient);
    });

    const result = await importData(validExportJson, false);

    expect(result.success).toBe(true);
    // Only 1 item can fit (50 - 49 = 1)
    expect(result.data?.itemsImported).toBe(1);
    expect(result.data?.itemsSkipped).toBe(2);
  });

  it('enforces free tier collection limit', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.item.count).mockResolvedValue(0);
    // User already has 2 collections
    vi.mocked(prisma.collection.count).mockResolvedValue(2);
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([]);
    vi.mocked(prisma.itemType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'snippet', icon: 'Code', color: '#3b82f6', isSystem: true, userId: null },
      { id: 'type-2', name: 'command', icon: 'Terminal', color: '#f97316', isSystem: true, userId: null },
      { id: 'type-3', name: 'prompt', icon: 'Sparkles', color: '#8b5cf6', isSystem: true, userId: null },
    ]);

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const txClient = {
        collection: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: 'new-coll', name: 'Test' }),
        },
        item: {
          create: vi.fn().mockResolvedValue({ id: 'new-item' }),
        },
      };
      return (fn as (tx: typeof txClient) => Promise<void>)(txClient);
    });

    const result = await importData(validExportJson, false);

    expect(result.success).toBe(true);
    // Only 1 collection can fit (3 - 2 = 1)
    expect(result.data?.collectionsImported).toBe(1);
    expect(result.data?.collectionsSkipped).toBe(1);
  });
});
