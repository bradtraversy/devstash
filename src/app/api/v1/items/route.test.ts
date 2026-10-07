import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: { item: { findMany: vi.fn(), count: vi.fn() } },
}));

vi.mock('@/lib/api/auth', () => ({ authenticateApiRequest: vi.fn() }));

vi.mock('@/lib/item-writes', () => ({ createItemForUser: vi.fn() }));

vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  checkRateLimit: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/auth';
import { unauthorizedResponse } from '@/lib/api/respond';
import { createItemForUser } from '@/lib/item-writes';
import { checkRateLimit } from '@/lib/rate-limit';
import type { ItemDetail } from '@/lib/db/items';
import { GET, POST } from './route';

const mockFindMany = vi.mocked(prisma.item.findMany);
const mockCount = vi.mocked(prisma.item.count);
const mockAuth = vi.mocked(authenticateApiRequest);
const mockCreate = vi.mocked(createItemForUser);
const mockCheckRateLimit = vi.mocked(checkRateLimit);

const ALLOWED = { success: true, remaining: 99, reset: 0, retryAfter: 0 };
const LIMITED = { success: false, remaining: 0, reset: 0, retryAfter: 600 };

const USER = { id: 'user-1', isPro: false };
const NOW = new Date('2026-10-07T12:00:00Z');
const SNIPPET = 'export function useDebounce<T>(value: T, delay = 300): T {\n  return value;\n}\n';

const createdItem: ItemDetail = {
  id: 'item-1',
  title: 'useDebounce',
  description: null,
  content: SNIPPET,
  url: null,
  language: 'typescript',
  contentType: 'TEXT',
  fileUrl: null,
  fileName: null,
  fileSize: null,
  isFavorite: false,
  isPinned: false,
  visibility: 'PRIVATE',
  shortId: 'abc12345',
  itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
  tags: [],
  collections: [],
  createdAt: NOW,
  updatedAt: NOW,
};

const listRow = {
  id: 'item-2',
  title: 'docker ps',
  description: 'List containers',
  content: 'docker ps -a',
  url: null,
  language: null,
  isFavorite: false,
  isPinned: false,
  visibility: 'PRIVATE',
  shortId: 'def67890',
  fileUrl: null,
  fileName: null,
  fileSize: null,
  createdAt: NOW,
  updatedAt: NOW,
  itemType: { name: 'command', icon: 'Terminal', color: '#f97316' },
  tags: [{ name: 'docker' }],
  collections: [],
};

async function expectNoStore(response: Promise<Response>): Promise<Response> {
  const res = await response;
  expect(res.headers.get('Cache-Control')).toBe('no-store');
  return res;
}

function list(query = '') {
  return expectNoStore(GET(new Request(`http://localhost/api/v1/items${query}`)));
}

function create(body: unknown, raw = false) {
  const request = new Request('http://localhost/api/v1/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  });
  return { request, response: expectNoStore(POST(request)) };
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://devstash.io');
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  mockAuth.mockResolvedValue({ user: USER });
  mockCheckRateLimit.mockResolvedValue(ALLOWED);
  mockFindMany.mockResolvedValue([listRow] as never);
  mockCount.mockResolvedValue(1);
  mockCreate.mockImplementation(async (_user, data) => ({
    success: true,
    data: { ...createdItem, visibility: data.visibility ?? 'PRIVATE' },
  }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  consoleError.mockRestore();
});

describe('GET /api/v1/items', () => {
  it('passes the 401 through without querying', async () => {
    mockAuth.mockResolvedValue({ response: unauthorizedResponse() });

    const res = await list();

    expect(res.status).toBe(401);
    expect(res.headers.get('WWW-Authenticate')).toBe('Bearer');
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("lists the user's items newest first with defaults", async () => {
    const res = await list();

    expect(res.status).toBe(200);
    const args = mockFindMany.mock.calls[0][0];
    expect(args?.where).toEqual({ userId: 'user-1' });
    expect(args?.orderBy).toEqual([{ updatedAt: 'desc' }, { id: 'asc' }]);
    expect(args?.skip).toBe(0);
    expect(args?.take).toBe(20);
  });

  it('searches by q, including tag names, filtered by type and paged', async () => {
    mockCount.mockResolvedValue(12);

    const res = await list('?q=Docker&type=command&page=2&limit=5');

    const contains = { contains: 'Docker', mode: 'insensitive' };
    const args = mockFindMany.mock.calls[0][0];
    expect(args?.where).toEqual({
      userId: 'user-1',
      itemType: { name: 'command', isSystem: true },
      OR: [
        { title: contains },
        { description: contains },
        { content: contains },
        { url: contains },
        { tags: { some: { name: contains } } },
      ],
    });
    expect(args?.skip).toBe(5);
    expect(args?.take).toBe(5);
    expect(await res.json()).toMatchObject({ page: 2, totalPages: 3, totalCount: 12 });
  });

  it('ignores a blank q', async () => {
    await list('?q=%20%20');

    expect(mockFindMany.mock.calls[0][0]?.where).toEqual({ userId: 'user-1' });
  });

  it('maps rows to list items with a preview', async () => {
    const res = await list();

    const body = await res.json();
    expect(body.items).toEqual([
      {
        id: 'item-2',
        shortId: 'def67890',
        type: 'command',
        title: 'docker ps',
        url: null,
        language: null,
        tags: ['docker'],
        visibility: 'private',
        link: null,
        isFavorite: false,
        isPinned: false,
        fileName: null,
        fileSize: null,
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
        preview: 'docker ps -a',
      },
    ]);
  });

  it('returns 400 for a limit over 100 or an unknown type', async () => {
    const res = await list('?limit=500');

    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors.limit).toEqual(['limit is 1 to 100']);

    expect((await list('?type=video')).status).toBe(400);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('returns 500 with a generic message when the query fails', async () => {
    mockFindMany.mockRejectedValue(new Error('connection reset'));

    const res = await list();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Something went wrong' });
  });
});

describe('POST /api/v1/items', () => {
  it('passes the 401 through before the create limit', async () => {
    mockAuth.mockResolvedValue({ response: unauthorizedResponse() });

    const res = await create({ content: SNIPPET }).response;

    expect(res.status).toBe(401);
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 429 from the create limit before reading the body', async () => {
    mockCheckRateLimit.mockResolvedValue(LIMITED);

    const { request, response } = create('{not json', true);
    const res = await response;

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('600');
    expect(request.bodyUsed).toBe(false);
    expect(mockCheckRateLimit).toHaveBeenCalledWith('apiCreate', 'user-1');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON', async () => {
    const res = await create('{not json', true).response;

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Body must be valid JSON' });
  });

  it('refuses unknown keys under their own name', async () => {
    const res = await create({ content: SNIPPET, color: 'red', pinned: true }).response;

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Validation failed',
      fieldErrors: { color: ['Unknown field'], pinned: ['Unknown field'] },
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('refuses file and image types', async () => {
    const res = await create({ content: 'x', type: 'file' }).response;

    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors.type).toHaveLength(1);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('refuses a link without a url', async () => {
    const res = await create({ type: 'link' }).response;

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Validation failed',
      fieldErrors: { url: ['A link needs one http or https URL'] },
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates an item with a detected type and returns 201', async () => {
    const res = await create({ content: SNIPPET }).response;

    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(
      USER,
      expect.objectContaining({ typeName: 'snippet', title: 'useDebounce', content: SNIPPET, visibility: 'PRIVATE' })
    );
    const { item } = await res.json();
    expect(item).toMatchObject({ id: 'item-1', type: 'snippet', visibility: 'private', link: null });
    expect(item).not.toHaveProperty('fileUrl');
  });

  it('creates an item with an explicit type and lets explicit fields win', async () => {
    await create({
      content: '$ git status',
      type: 'snippet',
      title: 'Status',
      language: 'bash',
      tags: ['git', 'git'],
    }).response;

    expect(mockCreate).toHaveBeenCalledWith(USER, {
      typeName: 'snippet',
      title: 'Status',
      description: null,
      content: '$ git status',
      url: null,
      language: 'bash',
      tags: ['git'],
      collectionIds: [],
      visibility: 'PRIVATE',
    });
  });

  it('returns the share link when created shared', async () => {
    const res = await create({ content: SNIPPET, visibility: 'unlisted' }).response;

    expect(mockCreate).toHaveBeenCalledWith(USER, expect.objectContaining({ visibility: 'UNLISTED' }));
    expect((await res.json()).item).toMatchObject({
      visibility: 'unlisted',
      link: 'https://devstash.io/s/abc12345',
    });
  });

  it('returns 403 for the item limit', async () => {
    mockCreate.mockResolvedValue({ success: false, error: 'Item limit reached', failure: 'forbidden' });

    const res = await create({ content: SNIPPET }).response;

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Item limit reached' });
  });

  it("returns 400 on collectionIds for a collection that is not the caller's", async () => {
    const message = 'One of the selected collections no longer exists';
    mockCreate.mockResolvedValue({
      success: false,
      error: message,
      fieldErrors: { collectionIds: [message] },
      failure: 'invalid',
    });

    const res = await create({ content: SNIPPET, collectionIds: ['col-other'] }).response;

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: message, fieldErrors: { collectionIds: [message] } });
  });

  it('returns 500 with a generic message when the create throws', async () => {
    mockCreate.mockRejectedValue(new Error('connection reset'));

    const res = await create({ content: SNIPPET }).response;

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Something went wrong' });
  });
});
