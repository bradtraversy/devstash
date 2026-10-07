import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/prisma', () => {
  const prisma = {
    apiToken: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  // Interactive transactions run the callback against the same mocked client.
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));
  return { prisma };
});

import { prisma } from '@/lib/prisma';
import { hashApiToken } from '@/lib/api/tokens';
import {
  ApiTokenLimitError,
  createApiToken,
  findApiTokenOwner,
  getApiTokens,
  revokeApiToken,
  touchApiToken,
} from './api-tokens';

const mockFindMany = vi.mocked(prisma.apiToken.findMany);
const mockCount = vi.mocked(prisma.apiToken.count);
const mockCreate = vi.mocked(prisma.apiToken.create);
const mockDeleteMany = vi.mocked(prisma.apiToken.deleteMany);
const mockFindUnique = vi.mocked(prisma.apiToken.findUnique);
const mockUpdateMany = vi.mocked(prisma.apiToken.updateMany);
const mockQueryRaw = vi.mocked(prisma.$queryRaw);

const NOW = new Date('2026-10-07T12:00:00Z');

const summary = {
  id: 'tok-1',
  name: 'Laptop',
  lastFour: 'abcd',
  createdAt: NOW,
  lastUsedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getApiTokens', () => {
  it("lists the user's tokens newest first without the hash", async () => {
    mockFindMany.mockResolvedValue([summary] as never);

    const result = await getApiTokens('user-1');

    expect(result).toEqual([summary]);
    const args = mockFindMany.mock.calls[0][0];
    expect(args?.where).toEqual({ userId: 'user-1' });
    expect(args?.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'asc' }]);
    expect(args?.select).not.toHaveProperty('tokenHash');
  });
});

describe('createApiToken', () => {
  beforeEach(() => {
    mockQueryRaw.mockResolvedValue([] as never);
    mockCount.mockResolvedValue(0);
    mockCreate.mockResolvedValue(summary as never);
  });

  it('stores only the hash and last four and returns the plain token once', async () => {
    const result = await createApiToken('user-1', 'Laptop');

    expect(result.token).toMatch(/^ds_[A-Za-z0-9_-]{43}$/);
    expect(result.apiToken).toEqual(summary);

    const args = mockCreate.mock.calls[0][0];
    expect(args.data).toEqual({
      userId: 'user-1',
      name: 'Laptop',
      tokenHash: hashApiToken(result.token),
      lastFour: result.token.slice(-4),
    });
    expect(JSON.stringify(args)).not.toContain(result.token);
    expect(args.select).not.toHaveProperty('tokenHash');
  });

  it("locks the user's row before counting", async () => {
    await createApiToken('user-1', 'Laptop');

    const [strings, ...values] = mockQueryRaw.mock.calls[0] as unknown as [TemplateStringsArray, ...unknown[]];
    expect(strings.join('?')).toContain('FOR UPDATE');
    expect(values).toEqual(['user-1']);
    expect(mockQueryRaw.mock.invocationCallOrder[0]).toBeLessThan(mockCount.mock.invocationCallOrder[0]);
    expect(mockCount).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });

  it('allows the tenth token', async () => {
    mockCount.mockResolvedValue(9);

    await expect(createApiToken('user-1', 'Tenth')).resolves.toMatchObject({ apiToken: summary });
    expect(mockCreate).toHaveBeenCalled();
  });

  it('throws ApiTokenLimitError at 10 tokens without creating one', async () => {
    mockCount.mockResolvedValue(10);

    await expect(createApiToken('user-1', 'Eleventh')).rejects.toBeInstanceOf(ApiTokenLimitError);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('makes a new token on every call', async () => {
    const first = await createApiToken('user-1', 'A');
    const second = await createApiToken('user-1', 'B');

    expect(first.token).not.toBe(second.token);
  });
});

describe('revokeApiToken', () => {
  it('deletes by token id and owner together', async () => {
    mockDeleteMany.mockResolvedValue({ count: 1 });

    await expect(revokeApiToken('user-1', 'tok-1')).resolves.toBe(true);
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { id: 'tok-1', userId: 'user-1' } });
  });

  it("returns false when nothing matched, such as someone else's token", async () => {
    mockDeleteMany.mockResolvedValue({ count: 0 });

    await expect(revokeApiToken('user-2', 'tok-1')).resolves.toBe(false);
  });
});

describe('findApiTokenOwner', () => {
  it('maps the token row to its owner', async () => {
    mockFindUnique.mockResolvedValue({ id: 'tok-1', user: { id: 'user-1', isPro: true } } as never);

    await expect(findApiTokenOwner('hash-1')).resolves.toEqual({
      tokenId: 'tok-1',
      userId: 'user-1',
      isPro: true,
    });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { tokenHash: 'hash-1' },
      select: { id: true, user: { select: { id: true, isPro: true } } },
    });
  });

  it('returns null for an unknown hash', async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(findApiTokenOwner('hash-1')).resolves.toBeNull();
  });
});

describe('touchApiToken', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes only when never used or last used over 10 minutes ago', async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 });

    await touchApiToken('tok-1', NOW);

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'tok-1',
        OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: new Date('2026-10-07T11:50:00Z') } }],
      },
      data: { lastUsedAt: NOW },
    });
  });

  it('uses the current time by default', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mockUpdateMany.mockResolvedValue({ count: 0 });

    await touchApiToken('tok-1');

    const args = mockUpdateMany.mock.calls[0][0];
    expect(args?.data).toEqual({ lastUsedAt: NOW });
    expect(args?.where?.OR).toEqual([
      { lastUsedAt: null },
      { lastUsedAt: { lt: new Date('2026-10-07T11:50:00Z') } },
    ]);
  });
});
