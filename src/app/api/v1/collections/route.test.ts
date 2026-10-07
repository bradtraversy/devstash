import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    apiToken: { findUnique: vi.fn(), updateMany: vi.fn() },
    collection: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  checkRateLimit: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { hashApiToken } from '@/lib/api/tokens';
import { GET } from './route';

const mockFindToken = vi.mocked(prisma.apiToken.findUnique);
const mockTouch = vi.mocked(prisma.apiToken.updateMany);
const mockFindCollections = vi.mocked(prisma.collection.findMany);
const mockCheckRateLimit = vi.mocked(checkRateLimit);

const ALLOWED = { success: true, remaining: 119, reset: 0, retryAfter: 0 };
const LIMITED = { success: false, remaining: 0, reset: 0, retryAfter: 45 };

const TOKEN = `ds_${'Ab3_-'.repeat(8)}xyz`;

async function list(headers: Record<string, string> = { Authorization: `Bearer ${TOKEN}` }, query = '') {
  const res = await GET(new Request(`http://localhost/api/v1/collections${query}`, { headers }));
  expect(res.headers.get('Cache-Control')).toBe('no-store');
  return res;
}

async function expectUnauthorized(res: Response) {
  expect(res.status).toBe(401);
  expect(res.headers.get('WWW-Authenticate')).toBe('Bearer');
  expect(await res.json()).toEqual({ error: 'Invalid or missing API token' });
  expect(mockCheckRateLimit).not.toHaveBeenCalled();
  expect(mockFindCollections).not.toHaveBeenCalled();
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://devstash.io');
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  mockFindToken.mockResolvedValue({ id: 'tok-1', user: { id: 'user-1', isPro: false } } as never);
  mockTouch.mockResolvedValue({ count: 1 });
  mockCheckRateLimit.mockResolvedValue(ALLOWED);
  mockFindCollections.mockResolvedValue([
    {
      id: 'col-1',
      name: 'AI Workflows',
      description: 'Prompts I reuse',
      visibility: 'PRIVATE',
      shortId: 'col11111',
      _count: { items: 3 },
    },
    {
      id: 'col-2',
      name: 'React Patterns',
      description: null,
      visibility: 'UNLISTED',
      shortId: 'col22222',
      _count: { items: 0 },
    },
  ] as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
  consoleError.mockRestore();
});

describe('GET /api/v1/collections', () => {
  it('token fixture is well formed', () => {
    expect(TOKEN).toMatch(/^ds_[A-Za-z0-9_-]{43}$/);
  });

  it('returns 401 without an Authorization header', async () => {
    await expectUnauthorized(await list({}));
    expect(mockFindToken).not.toHaveBeenCalled();
  });

  it('returns 401 for a malformed header without a lookup', async () => {
    await expectUnauthorized(await list({ Authorization: `Basic ${TOKEN}` }));
    await expectUnauthorized(await list({ Authorization: 'Bearer ds_short' }));
    expect(mockFindToken).not.toHaveBeenCalled();
  });

  it('ignores a token in the query string', async () => {
    await expectUnauthorized(await list({}, `?token=${TOKEN}`));
  });

  it('returns 401 for an unknown or revoked token', async () => {
    mockFindToken.mockResolvedValue(null);

    await expectUnauthorized(await list());
    expect(mockFindToken).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: hashApiToken(TOKEN) } })
    );
    expect(mockTouch).not.toHaveBeenCalled();
  });

  it('returns 429 when the api limit is spent', async () => {
    mockCheckRateLimit.mockResolvedValue(LIMITED);

    const res = await list();

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('45');
    expect(mockCheckRateLimit).toHaveBeenCalledWith('api', 'user-1');
    expect(mockFindCollections).not.toHaveBeenCalled();
  });

  it("lists the owner's collections with counts, visibility, and links", async () => {
    const res = await list();

    expect(res.status).toBe(200);
    expect(mockTouch).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'tok-1' }) }));
    expect(mockFindCollections.mock.calls[0][0]?.where).toEqual({ userId: 'user-1' });
    expect(mockFindCollections.mock.calls[0][0]?.orderBy).toEqual([{ name: 'asc' }, { id: 'asc' }]);
    expect(await res.json()).toEqual({
      collections: [
        {
          id: 'col-1',
          name: 'AI Workflows',
          description: 'Prompts I reuse',
          itemCount: 3,
          visibility: 'private',
          link: null,
        },
        {
          id: 'col-2',
          name: 'React Patterns',
          description: null,
          itemCount: 0,
          visibility: 'unlisted',
          link: 'https://devstash.io/s/col22222',
        },
      ],
    });
  });

  it('still answers when recording token use fails', async () => {
    mockTouch.mockRejectedValue(new Error('write failed'));

    expect((await list()).status).toBe(200);
  });

  it('returns 500 with a generic message when the query fails', async () => {
    mockFindCollections.mockRejectedValue(new Error('connection reset'));

    const res = await list();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Something went wrong' });
  });
});
