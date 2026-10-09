import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { z } from 'zod';
import type { CallToolResult, McpServer, ToolAnnotations } from '@modelcontextprotocol/server';
import type { ItemDetail, ItemWithType } from '@/lib/db/items';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

vi.mock('@/lib/db/items', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/db/items')>()),
  searchItems: vi.fn(),
  getItemByRef: vi.fn(),
}));

vi.mock('@/lib/db/collections', () => ({ getCollectionSummaries: vi.fn() }));

vi.mock('@/lib/item-writes', () => ({
  createItemForUser: vi.fn(),
  setItemVisibilityForUser: vi.fn(),
  updateItemForUser: vi.fn(),
}));

vi.mock('@/lib/api/bulk-delete', () => ({ deleteItemsForUser: vi.fn() }));

vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  checkRateLimit: vi.fn(),
}));

import { getItemByRef, searchItems } from '@/lib/db/items';
import { getCollectionSummaries } from '@/lib/db/collections';
import { createItemForUser, setItemVisibilityForUser, updateItemForUser } from '@/lib/item-writes';
import { deleteItemsForUser } from '@/lib/api/bulk-delete';
import { checkRateLimit } from '@/lib/rate-limit';
import { mcpAuthInfo, registerDevstashTools } from './tools';

const mockSearch = vi.mocked(searchItems);
const mockGetItem = vi.mocked(getItemByRef);
const mockCollections = vi.mocked(getCollectionSummaries);
const mockCreate = vi.mocked(createItemForUser);
const mockSetVisibility = vi.mocked(setItemVisibilityForUser);
const mockUpdate = vi.mocked(updateItemForUser);
const mockDeleteItems = vi.mocked(deleteItemsForUser);
const mockCheckRateLimit = vi.mocked(checkRateLimit);

const USER = { id: 'user-1', isPro: false };
const NOW = new Date('2026-10-08T12:00:00Z');
const ALLOWED = { success: true, remaining: 99, reset: 0, retryAfter: 0 };

const detail: ItemDetail = {
  id: 'item-1',
  title: 'docker compose up',
  description: null,
  content: 'docker compose up -d',
  url: null,
  language: null,
  contentType: 'TEXT',
  fileUrl: null,
  fileName: null,
  fileSize: null,
  isFavorite: false,
  isPinned: false,
  visibility: 'PRIVATE',
  shortId: 'abc12345',
  itemType: { name: 'command', icon: 'Terminal', color: '#f97316' },
  tags: [],
  collections: [],
  createdAt: NOW,
  updatedAt: NOW,
};

const listItem: ItemWithType = {
  ...detail,
  content: 'x'.repeat(300),
  sharedVia: [],
};

interface RegisteredTool {
  config: { inputSchema: z.ZodType; description?: string; annotations?: ToolAnnotations };
  cb: (args: unknown, ctx: unknown) => Promise<CallToolResult>;
}

const tools = new Map<string, RegisteredTool>();
registerDevstashTools({
  registerTool: (name: string, config: RegisteredTool['config'], cb: RegisteredTool['cb']) => {
    tools.set(name, { config, cb });
  },
} as unknown as McpServer);

async function callTool(name: string, args: unknown = {}, ctx: unknown = { http: { authInfo: mcpAuthInfo(USER) } }) {
  const tool = tools.get(name);
  if (!tool) throw new Error(`No tool ${name}`);
  const result = await tool.cb(tool.config.inputSchema.parse(args), ctx);
  const first = result.content[0];
  const text = first.type === 'text' ? first.text : '';
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  return { isError: result.isError === true, text, data: data as Record<string, unknown> };
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://devstash.io');
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  mockCheckRateLimit.mockResolvedValue(ALLOWED);
});

afterEach(() => {
  vi.unstubAllEnvs();
  consoleError.mockRestore();
});

describe('registerDevstashTools', () => {
  it('registers the seven tools with correct write, destructive, and read annotations', () => {
    expect([...tools.keys()].sort()).toEqual(
      ['delete_items', 'get_item', 'list_collections', 'save_item', 'search_items', 'share_item', 'update_item'].sort()
    );
    expect(tools.get('delete_items')?.config.annotations?.destructiveHint).toBe(true);
    expect(tools.get('update_item')?.config.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
    expect(tools.get('update_item')?.config.description).toContain('own visibility setting stay unchanged');
    expect(tools.get('update_item')?.config.description).toContain("exposes it through that collection's link");
    for (const name of ['search_items', 'get_item', 'list_collections']) {
      expect(tools.get(name)?.config.annotations?.readOnlyHint).toBe(true);
    }
  });

  it('refuses to run without an authenticated user', async () => {
    await expect(callTool('list_collections', {}, {})).rejects.toThrow('without an authenticated user');
    expect(mockCollections).not.toHaveBeenCalled();
  });

  it('turns an unexpected error into a generic tool error', async () => {
    mockCollections.mockRejectedValue(new Error('connection reset'));
    const result = await callTool('list_collections');
    expect(result).toMatchObject({ isError: true, text: 'Something went wrong' });
  });
});

describe('search_items', () => {
  it('searches as the user with defaults and returns previews', async () => {
    mockSearch.mockResolvedValue({ items: [listItem], totalCount: 1, totalPages: 1, currentPage: 1 });

    const result = await callTool('search_items', { query: '  compose ' });

    expect(mockSearch).toHaveBeenCalledWith('user-1', { query: 'compose', typeName: undefined, page: 1, limit: 20 });
    const items = result.data.items as Record<string, unknown>[];
    expect(items[0].preview).toHaveLength(200);
    expect(items[0]).not.toHaveProperty('content');
    expect(result.data).toMatchObject({ page: 1, totalPages: 1, totalCount: 1 });
  });

  it('lists the newest items for an empty query and passes the type', async () => {
    mockSearch.mockResolvedValue({ items: [], totalCount: 0, totalPages: 0, currentPage: 2 });
    await callTool('search_items', { query: '', type: 'note', page: 2, limit: 50 });
    expect(mockSearch).toHaveBeenCalledWith('user-1', { query: undefined, typeName: 'note', page: 2, limit: 50 });
  });

  it('caps the page size at 50', () => {
    expect(() => tools.get('search_items')?.config.inputSchema.parse({ limit: 51 })).toThrow();
  });
});

describe('get_item', () => {
  it.each([
    ['an id', 'item-1', 'item-1'],
    ['a short id', 'abc12345', 'abc12345'],
    ['a short link', 'https://devstash.io/s/abc12345', 'abc12345'],
    ['a raw link', 'https://devstash.io/s/abc12345/raw', 'abc12345'],
  ])('finds an item by %s', async (_label, input, ref) => {
    mockGetItem.mockResolvedValue(detail);
    const result = await callTool('get_item', { id: input });
    expect(mockGetItem).toHaveBeenCalledWith('user-1', ref);
    expect((result.data.item as Record<string, unknown>).content).toBe('docker compose up -d');
  });

  it('says not found for an item that is not the caller\'s', async () => {
    mockGetItem.mockResolvedValue(null);
    const result = await callTool('get_item', { id: 'someone-elses' });
    expect(result.isError).toBe(true);
    expect(result.text).toContain('No item');
  });
});

describe('save_item', () => {
  it('detects the type, creates as the user, and leaves the content out of the answer', async () => {
    mockCreate.mockResolvedValue({ success: true, data: detail });

    const result = await callTool('save_item', { content: '$ docker compose up -d' });

    expect(mockCheckRateLimit).toHaveBeenCalledWith('apiCreate', 'user-1');
    expect(mockCreate).toHaveBeenCalledWith(
      USER,
      expect.objectContaining({ typeName: 'command', content: 'docker compose up -d', visibility: 'PRIVATE' })
    );
    const item = result.data.item as Record<string, unknown>;
    expect(item).toMatchObject({ id: 'item-1', type: 'command', link: null });
    expect(item).not.toHaveProperty('content');
  });

  it('lets explicit fields win and returns the link when shared', async () => {
    mockCreate.mockResolvedValue({ success: true, data: { ...detail, visibility: 'UNLISTED' } });

    const result = await callTool('save_item', {
      content: 'const a = 1;',
      type: 'snippet',
      title: 'One',
      language: 'javascript',
      tags: ['x', 'x'],
      collectionIds: ['col-1'],
      visibility: 'unlisted',
      unknownKey: 'dropped',
    });

    expect(mockCreate).toHaveBeenCalledWith(
      USER,
      expect.objectContaining({
        typeName: 'snippet',
        title: 'One',
        language: 'javascript',
        tags: ['x'],
        collectionIds: ['col-1'],
        visibility: 'UNLISTED',
      })
    );
    expect((result.data.item as Record<string, unknown>).link).toBe('https://devstash.io/s/abc12345');
  });

  it('answers a validation failure as a tool error without creating', async () => {
    const result = await callTool('save_item', { type: 'link', content: 'not a url' });
    expect(result.isError).toBe(true);
    expect(result.text).toBe('Validation failed\nurl: A link needs one http or https URL');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('passes a write failure through without repeating its message', async () => {
    const message = 'One of the selected collections no longer exists';
    mockCreate.mockResolvedValue({ success: false, error: message, fieldErrors: { collectionIds: [message] } });
    const result = await callTool('save_item', { content: 'x', collectionIds: ['nope'] });
    expect(result).toMatchObject({ isError: true, text: message });
  });

  it('stops at the create limit before building the item', async () => {
    mockCheckRateLimit.mockResolvedValue({ success: false, remaining: 0, reset: 0, retryAfter: 120 });
    const result = await callTool('save_item', { content: 'x' });
    expect(result.isError).toBe(true);
    expect(result.text).toMatch(/^Too many saves\. Try again in /);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects a language the editor does not know', () => {
    expect(() => tools.get('save_item')?.config.inputSchema.parse({ content: 'x', language: 'klingon' })).toThrow();
  });
});

describe('share_item', () => {
  it('makes an item unlisted by default and returns its link', async () => {
    mockGetItem.mockResolvedValueOnce(detail).mockResolvedValueOnce({ ...detail, visibility: 'UNLISTED' });
    mockSetVisibility.mockResolvedValue({ success: true });

    const result = await callTool('share_item', { id: 'https://devstash.io/s/abc12345' });

    expect(mockSetVisibility).toHaveBeenCalledWith('user-1', 'item-1', 'UNLISTED');
    expect((result.data.item as Record<string, unknown>).link).toBe('https://devstash.io/s/abc12345');
  });

  it('stops sharing with private', async () => {
    mockGetItem.mockResolvedValue(detail);
    mockSetVisibility.mockResolvedValue({ success: true });

    const result = await callTool('share_item', { id: 'item-1', visibility: 'private' });

    expect(mockSetVisibility).toHaveBeenCalledWith('user-1', 'item-1', 'PRIVATE');
    expect((result.data.item as Record<string, unknown>).link).toBeNull();
  });

  it('shows the shared collections that still expose a private item', async () => {
    const inSharedCollection: ItemDetail = {
      ...detail,
      collections: [{ id: 'col-1', name: 'React', visibility: 'PUBLIC' }],
    };
    mockGetItem.mockResolvedValue(inSharedCollection);
    mockSetVisibility.mockResolvedValue({ success: true });

    const result = await callTool('share_item', { id: 'item-1', visibility: 'private' });

    expect(result.data.item).toMatchObject({
      visibility: 'private',
      link: null,
      collections: [{ id: 'col-1', name: 'React', visibility: 'public' }],
    });
  });

  it('says not found without changing anything', async () => {
    mockGetItem.mockResolvedValue(null);
    const result = await callTool('share_item', { id: 'nope' });
    expect(result.isError).toBe(true);
    expect(mockSetVisibility).not.toHaveBeenCalled();
  });
});

describe('update_item', () => {
  it.each([
    ['an id', 'item-1', 'item-1'],
    ['a short id', 'abc12345', 'abc12345'],
    ['a short link', 'https://devstash.io/s/abc12345', 'abc12345'],
  ])('updates by %s', async (_label, input, ref) => {
    mockGetItem.mockResolvedValue(detail);
    mockUpdate.mockResolvedValue({ success: true, data: { ...detail, title: 'Compose' } });

    const result = await callTool('update_item', { id: input, title: 'Compose' });

    expect(mockGetItem).toHaveBeenCalledWith('user-1', ref);
    expect(mockUpdate).toHaveBeenCalledWith('user-1', 'item-1', expect.objectContaining({ title: 'Compose' }));
    expect(result.data.item).toMatchObject({ title: 'Compose', visibility: 'private', link: null });
    expect(result.data.item).not.toHaveProperty('content');
  });

  it('preserves omitted fields while null and empty arrays clear their fields', async () => {
    mockGetItem.mockResolvedValue(detail);
    mockUpdate.mockResolvedValue({ success: true, data: { ...detail, description: null, tags: [], collections: [] } });

    await callTool('update_item', { id: 'item-1', description: null, tags: [], collectionIds: [] });

    expect(mockUpdate).toHaveBeenCalledWith('user-1', 'item-1', {
      title: detail.title,
      description: null,
      content: detail.content,
      url: detail.url,
      language: detail.language,
      tags: [],
      collectionIds: [],
    });
  });

  it('rejects an edit that would violate the fixed item type', async () => {
    mockGetItem.mockResolvedValue(detail);

    const result = await callTool('update_item', { id: 'item-1', content: null });

    expect(result).toMatchObject({ isError: true, text: 'Validation failed\ncontent: A command needs content' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('passes an unknown collection failure through without repeating it', async () => {
    const message = 'One of the selected collections no longer exists';
    mockGetItem.mockResolvedValue(detail);
    mockUpdate.mockResolvedValue({
      success: false,
      error: message,
      fieldErrors: { collectionIds: [message] },
      failure: 'invalid',
    });

    const result = await callTool('update_item', { id: 'item-1', collectionIds: ['nope'] });

    expect(result).toMatchObject({ isError: true, text: message });
  });

  it('returns not found without writing for a missing or foreign item', async () => {
    mockGetItem.mockResolvedValue(null);

    const result = await callTool('update_item', { id: 'nope', title: 'Nope' });

    expect(result.isError).toBe(true);
    expect(result.text).toContain('No item');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('does not apply the create-only rate limit', async () => {
    mockGetItem.mockResolvedValue(detail);
    mockUpdate.mockResolvedValue({ success: true, data: detail });

    await callTool('update_item', { id: 'item-1', title: 'Compose' });

    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });
});

describe('delete_items', () => {
  it('deletes by reference and reports what went and what was not found', async () => {
    mockDeleteItems.mockResolvedValue({ deleted: [{ id: 'item-1', title: 'docker compose up' }], notFound: ['zzzz9999'] });

    const result = await callTool('delete_items', { ids: ['https://devstash.io/s/abc12345', 'zzzz9999'] });

    expect(mockDeleteItems).toHaveBeenCalledWith('user-1', ['abc12345', 'zzzz9999']);
    expect(result.data).toEqual({ deleted: [{ id: 'item-1', title: 'docker compose up' }], notFound: ['zzzz9999'] });
  });

  it('reports a missing reference the way it was sent and sends each item once', async () => {
    mockDeleteItems.mockResolvedValue({ deleted: [], notFound: ['zzzz9999'] });

    const result = await callTool('delete_items', {
      ids: ['https://devstash.io/s/zzzz9999', 'zzzz9999', 'devstash.io/s/zzzz9999/raw'],
    });

    expect(mockDeleteItems).toHaveBeenCalledWith('user-1', ['zzzz9999']);
    expect(result.data.notFound).toEqual(['https://devstash.io/s/zzzz9999']);
  });

  it('still lists what was deleted when it fails partway', async () => {
    mockDeleteItems.mockResolvedValue({ deleted: [{ id: 'item-1', title: 'docker compose up' }], failedPartway: true });

    const result = await callTool('delete_items', { ids: ['item-1', 'item-2'] });

    expect(result.isError).toBe(true);
    expect(result.data).toEqual({
      error: 'Something went wrong partway through',
      deleted: [{ id: 'item-1', title: 'docker compose up' }],
    });
  });

  it('takes 1 to 100 references', () => {
    const schema = tools.get('delete_items')?.config.inputSchema;
    expect(() => schema?.parse({ ids: [] })).toThrow();
    expect(() => schema?.parse({ ids: Array.from({ length: 101 }, (_, i) => `id-${i}`) })).toThrow();
  });
});

describe('list_collections', () => {
  it('lists the user\'s collections with their links', async () => {
    mockCollections.mockResolvedValue([
      { id: 'col-1', name: 'React', description: null, visibility: 'UNLISTED', shortId: 'col12345', itemCount: 3 },
    ]);

    const result = await callTool('list_collections');

    expect(mockCollections).toHaveBeenCalledWith('user-1');
    expect(result.data.collections).toEqual([
      {
        id: 'col-1',
        name: 'React',
        description: null,
        itemCount: 3,
        visibility: 'unlisted',
        link: 'https://devstash.io/s/col12345',
      },
    ]);
  });
});
