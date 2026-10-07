import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: { item: { findUnique: vi.fn(), findMany: vi.fn() } },
}));

vi.mock('@/lib/api/auth', () => ({ authenticateApiRequest: vi.fn() }));

vi.mock('@/lib/item-writes', () => ({
  deleteItemForUser: vi.fn(),
  setItemVisibilityForUser: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/auth';
import { unauthorizedResponse } from '@/lib/api/respond';
import { deleteItemForUser, setItemVisibilityForUser } from '@/lib/item-writes';
import { DELETE, GET, PATCH } from './route';

const mockFindUnique = vi.mocked(prisma.item.findUnique);
const mockFindMany = vi.mocked(prisma.item.findMany);
const mockAuth = vi.mocked(authenticateApiRequest);
const mockDelete = vi.mocked(deleteItemForUser);
const mockSetVisibility = vi.mocked(setItemVisibilityForUser);

const USER = { id: 'user-1', isPro: false };
const NOW = new Date('2026-10-07T12:00:00Z');
const ITEM_ID = 'cmgh1item0000000000000001';
const SHORT_ID = 'abc12345';

const row = {
  id: ITEM_ID,
  userId: 'user-1',
  title: 'useDebounce',
  description: 'Debounce a value',
  content: 'export const x = 1;',
  url: null,
  language: 'typescript',
  contentType: 'TEXT',
  fileUrl: 'https://pub-test.r2.dev/user-1/1700000000-notes.pdf',
  fileName: null,
  fileSize: null,
  isFavorite: false,
  isPinned: false,
  visibility: 'PRIVATE',
  shortId: SHORT_ID,
  createdAt: NOW,
  updatedAt: NOW,
  itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
  tags: [{ name: 'react' }],
  collections: [{ collection: { id: 'col-1', name: 'React', visibility: 'PRIVATE' } }],
};

const context = (id: string) => ({ params: Promise.resolve({ id }) });

async function expectNoStore(response: Promise<Response>): Promise<Response> {
  const res = await response;
  expect(res.headers.get('Cache-Control')).toBe('no-store');
  return res;
}

const url = (id: string) => `http://localhost/api/v1/items/${id}`;

function get(id: string) {
  return expectNoStore(GET(new Request(url(id)), context(id)));
}

function patch(id: string, body: unknown, raw = false) {
  const request = new Request(url(id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  });
  return expectNoStore(PATCH(request, context(id)));
}

function del(id: string) {
  return expectNoStore(DELETE(new Request(url(id), { method: 'DELETE' }), context(id)));
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://devstash.io');
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  mockAuth.mockResolvedValue({ user: USER });
  mockFindUnique.mockResolvedValue(row as never);
  mockFindMany.mockResolvedValue([{ id: ITEM_ID, shortId: SHORT_ID, title: 'useDebounce' }] as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
  consoleError.mockRestore();
});

describe('GET /api/v1/items/[id]', () => {
  it('passes the 401 through without a lookup', async () => {
    mockAuth.mockResolvedValue({ response: unauthorizedResponse() });

    const res = await get(ITEM_ID);

    expect(res.status).toBe(401);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('returns the whole item by id', async () => {
    const res = await get(ITEM_ID);

    expect(res.status).toBe(200);
    expect(mockFindUnique.mock.calls[0][0].where).toEqual({ id: ITEM_ID });
    const { item } = await res.json();
    expect(item).toMatchObject({
      id: ITEM_ID,
      shortId: SHORT_ID,
      content: 'export const x = 1;',
      tags: ['react'],
      collections: [{ id: 'col-1', name: 'React' }],
      visibility: 'private',
      link: null,
    });
    expect(item).not.toHaveProperty('fileUrl');
  });

  it('finds the item by short id', async () => {
    const res = await get(SHORT_ID);

    expect(res.status).toBe(200);
    expect(mockFindUnique.mock.calls[0][0].where).toEqual({ shortId: SHORT_ID });
  });

  it("returns 404 for another user's item by id and by short id", async () => {
    mockFindUnique.mockResolvedValue({ ...row, userId: 'user-2' } as never);

    for (const ref of [ITEM_ID, SHORT_ID]) {
      const res = await get(ref);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'Item not found' });
    }
  });

  it('returns 404 for a missing item', async () => {
    mockFindUnique.mockResolvedValue(null);

    expect((await get(ITEM_ID)).status).toBe(404);
  });

  it('returns 500 with a generic message when the lookup fails', async () => {
    mockFindUnique.mockRejectedValue(new Error('connection reset'));

    const res = await get(ITEM_ID);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Something went wrong' });
  });
});

describe('PATCH /api/v1/items/[id]', () => {
  it('passes the 401 through', async () => {
    mockAuth.mockResolvedValue({ response: unauthorizedResponse() });

    expect((await patch(ITEM_ID, { visibility: 'unlisted' })).status).toBe(401);
    expect(mockSetVisibility).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON', async () => {
    const res = await patch(ITEM_ID, '{', true);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Body must be valid JSON' });
  });

  it('refuses any field but visibility', async () => {
    const res = await patch(ITEM_ID, { visibility: 'unlisted', title: 'New title' });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Validation failed',
      fieldErrors: { title: ['Only visibility can be changed through the API'] },
    });
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockSetVisibility).not.toHaveBeenCalled();
  });

  it('refuses an unknown visibility', async () => {
    const res = await patch(ITEM_ID, { visibility: 'everyone' });

    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors.visibility).toEqual([
      'visibility must be private, unlisted, or public',
    ]);
  });

  it("returns 404 for a missing or someone else's item", async () => {
    mockFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...row, userId: 'user-2' } as never);

    expect((await patch(ITEM_ID, { visibility: 'unlisted' })).status).toBe(404);
    expect((await patch(SHORT_ID, { visibility: 'unlisted' })).status).toBe(404);
    expect(mockSetVisibility).not.toHaveBeenCalled();
  });

  it('shares the item found by short id and returns it refreshed with its link', async () => {
    mockFindUnique.mockResolvedValueOnce(row as never).mockResolvedValueOnce({ ...row, visibility: 'UNLISTED' } as never);
    mockSetVisibility.mockResolvedValue({
      success: true,
      data: { visibility: 'UNLISTED', publishedAt: NOW, handle: 'brad' },
    });

    const res = await patch(SHORT_ID, { visibility: 'unlisted' });

    expect(res.status).toBe(200);
    expect(mockSetVisibility).toHaveBeenCalledWith('user-1', ITEM_ID, 'UNLISTED');
    expect(mockFindUnique.mock.calls[1][0].where).toEqual({ id: ITEM_ID });
    expect((await res.json()).item).toMatchObject({
      id: ITEM_ID,
      visibility: 'unlisted',
      link: `https://devstash.io/s/${SHORT_ID}`,
    });
  });

  it('maps a failed write to its status', async () => {
    mockSetVisibility.mockResolvedValue({ success: false, error: 'Failed to update visibility', failure: 'error' });

    const res = await patch(ITEM_ID, { visibility: 'private' });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to update visibility' });
  });
});

describe('DELETE /api/v1/items/[id]', () => {
  it('passes the 401 through', async () => {
    mockAuth.mockResolvedValue({ response: unauthorizedResponse() });

    expect((await del(ITEM_ID)).status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns 404 when the ref is not one of the caller's items", async () => {
    mockFindMany.mockResolvedValue([]);

    const res = await del(SHORT_ID);

    expect(res.status).toBe(404);
    expect(mockFindMany.mock.calls[0][0]?.where).toEqual({
      userId: 'user-1',
      OR: [{ id: { in: [SHORT_ID] } }, { shortId: { in: [SHORT_ID] } }],
    });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deletes by short id and returns the id and title', async () => {
    mockDelete.mockResolvedValue({ success: true });

    const res = await del(SHORT_ID);

    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith('user-1', ITEM_ID);
    expect(await res.json()).toEqual({ deleted: { id: ITEM_ID, title: 'useDebounce' } });
  });

  it('returns 404 when the item goes before the delete lands', async () => {
    mockDelete.mockResolvedValue({ success: false, error: 'Item not found or access denied', failure: 'not-found' });

    expect((await del(ITEM_ID)).status).toBe(404);
  });
});
