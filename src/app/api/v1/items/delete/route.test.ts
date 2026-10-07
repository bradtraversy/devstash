import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: { item: { findMany: vi.fn() } },
}));

vi.mock('@/lib/api/auth', () => ({ authenticateApiRequest: vi.fn() }));

vi.mock('@/lib/item-writes', () => ({ deleteItemForUser: vi.fn() }));

import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/auth';
import { unauthorizedResponse } from '@/lib/api/respond';
import { deleteItemForUser } from '@/lib/item-writes';
import { POST } from './route';

const mockFindMany = vi.mocked(prisma.item.findMany);
const mockAuth = vi.mocked(authenticateApiRequest);
const mockDelete = vi.mocked(deleteItemForUser);

const USER = { id: 'user-1', isPro: false };
const A = { id: 'cmgh1item0000000000000001', shortId: 'aaaa1111', title: 'First' };
const B = { id: 'cmgh1item0000000000000002', shortId: 'bbbb2222', title: 'Second' };
const C = { id: 'cmgh1item0000000000000003', shortId: 'cccc3333', title: 'Third' };

async function bulkDelete(body: unknown, raw = false): Promise<Response> {
  const res = await POST(
    new Request('http://localhost/api/v1/items/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: raw ? (body as string) : JSON.stringify(body),
    })
  );
  expect(res.headers.get('Cache-Control')).toBe('no-store');
  return res;
}

const queriedRefs = () => {
  const where = mockFindMany.mock.calls[0][0]?.where as { OR: [{ id: { in: string[] } }, { shortId: { in: string[] } }] };
  return where.OR[0].id.in;
};

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  mockAuth.mockResolvedValue({ user: USER });
  mockDelete.mockResolvedValue({ success: true });
});

afterEach(() => {
  consoleError.mockRestore();
});

describe('POST /api/v1/items/delete', () => {
  it('passes the 401 through', async () => {
    mockAuth.mockResolvedValue({ response: unauthorizedResponse() });

    const res = await bulkDelete({ ids: [A.id] });

    expect(res.status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON', async () => {
    const res = await bulkDelete('ids=1', true);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Body must be valid JSON' });
  });

  it('returns 400 for no ids, too many ids, or an unknown key', async () => {
    const empty = await bulkDelete({ ids: [] });
    expect(empty.status).toBe(400);
    expect((await empty.json()).fieldErrors.ids).toEqual(['Send at least one id']);

    const tooMany = await bulkDelete({ ids: Array.from({ length: 101 }, (_, i) => `id-${i}`) });
    expect(tooMany.status).toBe(400);

    const extra = await bulkDelete({ ids: [A.id], force: true });
    expect(extra.status).toBe(400);
    expect((await extra.json()).fieldErrors).toEqual({ force: ['Unknown field'] });

    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("dedupes the ids and looks them up among the caller's items", async () => {
    mockFindMany.mockResolvedValue([A] as never);

    await bulkDelete({ ids: [A.id, A.id, ' missing1 '] });

    expect(mockFindMany.mock.calls[0][0]?.where).toEqual({
      userId: 'user-1',
      OR: [{ id: { in: [A.id, 'missing1'] } }, { shortId: { in: [A.id, 'missing1'] } }],
    });
  });

  it('deletes what it found by id or short id and reports the rest as not found', async () => {
    mockFindMany.mockResolvedValue([A, B] as never);

    const res = await bulkDelete({ ids: [A.id, B.shortId, 'missing1', C.id] });

    expect(res.status).toBe(200);
    expect(mockDelete.mock.calls).toEqual([
      ['user-1', A.id],
      ['user-1', B.id],
    ]);
    expect(await res.json()).toEqual({
      deleted: [
        { id: A.id, title: A.title },
        { id: B.id, title: B.title },
      ],
      notFound: ['missing1', C.id],
    });
  });

  it('deletes an item named by both its id and short id once', async () => {
    mockFindMany.mockResolvedValue([A] as never);

    const res = await bulkDelete({ ids: [A.id, A.shortId] });

    expect(queriedRefs()).toEqual([A.id, A.shortId]);
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(await res.json()).toEqual({ deleted: [{ id: A.id, title: A.title }], notFound: [] });
  });

  it('reports an item that went before its delete landed as not found', async () => {
    mockFindMany.mockResolvedValue([A, B] as never);
    mockDelete
      .mockResolvedValueOnce({ success: false, error: 'Item not found or access denied', failure: 'not-found' })
      .mockResolvedValueOnce({ success: true });

    const res = await bulkDelete({ ids: [A.shortId, B.id] });

    expect(await res.json()).toEqual({ deleted: [{ id: B.id, title: B.title }], notFound: [A.shortId] });
  });

  it('returns 500 with what was already deleted when a delete throws partway', async () => {
    mockFindMany.mockResolvedValue([A, B, C] as never);
    mockDelete.mockResolvedValueOnce({ success: true }).mockRejectedValueOnce(new Error('connection reset'));

    const res = await bulkDelete({ ids: [A.id, B.id, C.id] });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: 'Something went wrong partway through',
      deleted: [{ id: A.id, title: A.title }],
    });
    expect(mockDelete).toHaveBeenCalledTimes(2);
  });

  it('returns 500 with a generic message when the lookup fails', async () => {
    mockFindMany.mockRejectedValue(new Error('connection reset'));

    const res = await bulkDelete({ ids: [A.id] });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Something went wrong' });
  });
});
