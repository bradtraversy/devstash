import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
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

vi.mock('@/lib/db/public', () => ({
  publicPathsForCollections: vi.fn(async () => []),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { previewImport, importData } from './import';
import { SHORT_ID_PATTERN } from '@/lib/short-id';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { publicPathsForCollections } from '@/lib/db/public';
import { revalidatePath } from 'next/cache';

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

// These tests cover Pro gating, so the switch is on unless a test turns it off.
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_PRO_ENABLED', 'true');
});

afterEach(() => {
  vi.unstubAllEnvs();
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

  it('keeps only file references inside the importer upload namespace', async () => {
    vi.stubEnv('R2_PUBLIC_URL', 'https://pub-test.r2.dev');
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    });

    const json = JSON.stringify({
      version: 1,
      items: [
        {
          title: 'Mine',
          type: 'file',
          content: null,
          fileUrl: 'https://pub-test.r2.dev/user-123/1700000000-mine.pdf',
          fileName: 'mine.pdf',
          fileSize: 10,
          tags: [],
          collections: [],
        },
        {
          title: 'Theirs',
          type: 'file',
          content: null,
          fileUrl: 'https://pub-test.r2.dev/user-victim/1700000000-theirs.pdf',
          fileName: 'theirs.pdf',
          fileSize: 10,
          tags: [],
          collections: [],
        },
        {
          title: 'Internal',
          type: 'image',
          content: null,
          fileUrl: 'http://169.254.169.254/latest/meta-data/',
          fileName: 'meta.png',
          fileSize: 10,
          tags: [],
          collections: [],
        },
      ],
      collections: [],
    });

    vi.mocked(prisma.item.count).mockResolvedValue(0);
    vi.mocked(prisma.collection.count).mockResolvedValue(0);
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([]);
    vi.mocked(prisma.itemType.findMany).mockResolvedValue([
      { id: 'type-file', name: 'file', icon: 'File', color: '#6b7280', isSystem: true, userId: null },
      { id: 'type-image', name: 'image', icon: 'Image', color: '#ec4899', isSystem: true, userId: null },
    ]);

    const itemCreate = vi.fn().mockResolvedValue({ id: 'new-item' });
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const txClient = {
        collection: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: 'new-coll', name: 'Test' }),
        },
        item: { create: itemCreate },
      };
      return (fn as (tx: typeof txClient) => Promise<void>)(txClient);
    });

    const result = await importData(json, false);

    expect(result.success).toBe(true);
    expect(result.data?.itemsImported).toBe(3);
    const created = itemCreate.mock.calls.map((call) => call[0].data);
    expect(created.find((d) => d.title === 'Mine')).toMatchObject({
      fileUrl: 'https://pub-test.r2.dev/user-123/1700000000-mine.pdf',
      fileName: 'mine.pdf',
      fileSize: 10,
    });
    expect(created.find((d) => d.title === 'Theirs')).toMatchObject({ fileUrl: null, fileName: null, fileSize: null });
    expect(created.find((d) => d.title === 'Internal')).toMatchObject({ fileUrl: null, fileName: null, fileSize: null });
  });

  it('skips file and image items even for a Pro user while Pro is off', async () => {
    vi.stubEnv('NEXT_PUBLIC_PRO_ENABLED', '');
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    });
    const json = JSON.stringify({
      version: 1,
      items: [
        { title: 'Doc', type: 'file', content: null, fileUrl: null, fileName: 'a.pdf', fileSize: 10, tags: [], collections: [] },
        { title: 'Hook', type: 'snippet', content: 'const a = 1;', tags: [], collections: [] },
      ],
      collections: [],
    });
    vi.mocked(prisma.item.count).mockResolvedValue(0);
    vi.mocked(prisma.collection.count).mockResolvedValue(0);
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([]);
    vi.mocked(prisma.itemType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'snippet', icon: 'Code', color: '#3b82f6', isSystem: true, userId: null },
      { id: 'type-file', name: 'file', icon: 'File', color: '#6b7280', isSystem: true, userId: null },
    ]);
    const itemCreate = vi.fn().mockResolvedValue({ id: 'new-item' });
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const txClient = {
        collection: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: 'new-coll', name: 'Test' }),
        },
        item: { create: itemCreate },
      };
      return (fn as (tx: typeof txClient) => Promise<void>)(txClient);
    });

    const result = await importData(json, false);

    expect(result.success).toBe(true);
    expect(result.data?.itemsImported).toBe(1);
    expect(itemCreate.mock.calls.map((call) => call[0].data.title)).toEqual(['Hook']);
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

  it('caps a stale Pro flag at the 1,000-item ceiling while Pro is off', async () => {
    vi.stubEnv('NEXT_PUBLIC_PRO_ENABLED', '');
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.item.count).mockResolvedValue(999);
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

describe('importData collection slugs and item positions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('slugs new collections past existing slugs and appends items in file order', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    });

    const json = JSON.stringify({
      version: 1,
      items: [
        { title: 'First', type: 'snippet', content: 'a', tags: [], collections: ['React Patterns'] },
        { title: 'Second', type: 'snippet', content: 'b', tags: [], collections: ['React Patterns', 'AI Workflows'] },
        { title: 'Third', type: 'snippet', content: 'c', tags: [], collections: ['AI Workflows', 'AI Workflows'] },
      ],
      collections: [
        { name: 'React Patterns', description: null, isFavorite: false },
        { name: 'AI Workflows', description: null, isFavorite: false },
      ],
    });

    vi.mocked(prisma.item.count).mockResolvedValue(0);
    vi.mocked(prisma.collection.count).mockResolvedValue(0);
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([{ name: 'React Patterns' }] as never);
    vi.mocked(prisma.itemType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'snippet', icon: 'Code', color: '#3b82f6', isSystem: true, userId: null },
    ]);

    const collectionCreate = vi.fn().mockResolvedValue({ id: 'new-coll', name: 'AI Workflows' });
    const membershipFindFirst = vi.fn().mockResolvedValue({ position: 4 });
    const itemCreate = vi.fn().mockResolvedValue({ id: 'new-item' });
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const txClient = {
        collection: {
          findMany: vi.fn().mockResolvedValue([
            { id: 'existing', name: 'React Patterns', slug: 'react-patterns' },
            { id: 'other', name: 'Old AI', slug: 'ai-workflows' },
          ]),
          create: collectionCreate,
        },
        itemCollection: { findFirst: membershipFindFirst },
        item: { create: itemCreate },
      };
      return (fn as (tx: typeof txClient) => Promise<void>)(txClient);
    });

    const result = await importData(json, false);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ itemsImported: 3, collectionsImported: 1, itemsSkipped: 0, collectionsSkipped: 1 });
    expect(collectionCreate).toHaveBeenCalledTimes(1);
    expect(collectionCreate.mock.calls[0][0].data).toMatchObject({
      name: 'AI Workflows',
      slug: 'ai-workflows-2',
      shortId: expect.stringMatching(SHORT_ID_PATTERN),
    });

    // The existing collection is read once for its last position, then counted up in memory.
    expect(membershipFindFirst).toHaveBeenCalledTimes(1);
    expect(membershipFindFirst).toHaveBeenCalledWith({
      where: { collectionId: 'existing' },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const memberships = itemCreate.mock.calls.map((call) => call[0].data.collections?.create);
    expect(memberships).toEqual([
      [{ collectionId: 'existing', position: 5 }],
      [
        { collectionId: 'existing', position: 6 },
        { collectionId: 'new-coll', position: 0 },
      ],
      [{ collectionId: 'new-coll', position: 1 }],
    ]);
  });
});

describe('importData public page revalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('revalidates only the collections that received items', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    });

    const json = JSON.stringify({
      version: 1,
      items: [
        { title: 'First', type: 'snippet', content: 'a', tags: [], collections: ['React Patterns'] },
        { title: 'Loose', type: 'snippet', content: 'b', tags: [], collections: [] },
      ],
      collections: [{ name: 'React Patterns', description: null, isFavorite: false }],
    });

    vi.mocked(prisma.item.count).mockResolvedValue(0);
    vi.mocked(prisma.collection.count).mockResolvedValue(0);
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([{ name: 'React Patterns' }] as never);
    vi.mocked(prisma.itemType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'snippet', icon: 'Code', color: '#3b82f6', isSystem: true, userId: null },
    ]);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const txClient = {
        collection: {
          findMany: vi.fn().mockResolvedValue([
            { id: 'existing', name: 'React Patterns', slug: 'react-patterns' },
          ]),
          create: vi.fn(),
        },
        itemCollection: { findFirst: vi.fn().mockResolvedValue(null) },
        item: { create: vi.fn().mockResolvedValue({ id: 'new-item' }) },
      };
      return (fn as (tx: typeof txClient) => Promise<void>)(txClient);
    });
    vi.mocked(publicPathsForCollections).mockResolvedValueOnce(['/brad/react-patterns']);

    const result = await importData(json, false);

    expect(result.success).toBe(true);
    expect(publicPathsForCollections).toHaveBeenCalledWith(['existing']);
    expect(vi.mocked(revalidatePath).mock.calls.map((call) => call[0])).toEqual(['/brad/react-patterns']);
  });
});
