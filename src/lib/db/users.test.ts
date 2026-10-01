import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureUserHandle, updateUserHandle, getUserWithSettings, retryOnHandleCollision } from './users';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockFindMany = vi.mocked(prisma.user.findMany);
const mockUpdate = vi.mocked(prisma.user.update);

describe('ensureUserHandle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindMany.mockResolvedValue([] as never);
    mockUpdate.mockResolvedValue({} as never);
  });

  it('returns the existing handle without writing', async () => {
    mockFindUnique.mockResolvedValue({ handle: 'brad', email: 'brad@example.com' } as never);

    const handle = await ensureUserHandle(prisma, 'user-1');

    expect(handle).toBe('brad');
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('generates the handle from the email local part and saves it', async () => {
    mockFindUnique.mockResolvedValue({ handle: null, email: 'Brad.Traversy@example.com' } as never);

    const handle = await ensureUserHandle(prisma, 'user-1');

    expect(handle).toBe('brad-traversy');
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { handle: { startsWith: 'brad-traversy' } },
      select: { handle: true },
    });
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { handle: 'brad-traversy' } });
  });

  it('suffixes the handle when other users already hold it', async () => {
    mockFindUnique.mockResolvedValue({ handle: null, email: 'brad@example.com' } as never);
    mockFindMany.mockResolvedValue([{ handle: 'brad' }, { handle: 'brad-2' }, { handle: 'bradley' }] as never);

    const handle = await ensureUserHandle(prisma, 'user-1');

    expect(handle).toBe('brad-3');
  });

  it('finds truncated candidates when the base is near the length limit', async () => {
    const base = 'a'.repeat(62);
    const truncated = base.slice(0, 61);
    mockFindUnique.mockResolvedValue({ handle: null, email: `${base}@example.com` } as never);
    mockFindMany.mockResolvedValue([{ handle: base }, { handle: `${truncated}-2` }] as never);

    const handle = await ensureUserHandle(prisma, 'user-1');

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { handle: { startsWith: base.slice(0, 54) } },
      select: { handle: true },
    });
    expect(handle).toBe(`${truncated}-3`);
  });

  it('falls back to "user" for a reserved or empty local part', async () => {
    mockFindUnique.mockResolvedValue({ handle: null, email: 'admin@example.com' } as never);

    expect(await ensureUserHandle(prisma, 'user-1')).toBe('user');

    mockFindUnique.mockResolvedValue({ handle: null, email: '!!!@example.com' } as never);

    expect(await ensureUserHandle(prisma, 'user-1')).toBe('user');
  });

  it('throws when the user does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(ensureUserHandle(prisma, 'user-1')).rejects.toThrow('User not found');
  });
});

describe('updateUserHandle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes the handle for the user', async () => {
    mockUpdate.mockResolvedValue({} as never);

    await updateUserHandle('user-1', 'brad');

    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { handle: 'brad' } });
  });

  it('propagates a unique violation', async () => {
    mockUpdate.mockRejectedValue({ code: 'P2002' });

    await expect(updateUserHandle('user-1', 'taken')).rejects.toEqual({ code: 'P2002' });
  });
});

describe('getUserWithSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the handle alongside the settings fields', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Brad',
      email: 'brad@example.com',
      image: null,
      password: null,
      handle: 'brad',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      editorPreferences: null,
    } as never);

    const user = await getUserWithSettings('user-1');

    expect(user?.handle).toBe('brad');
    expect(user?.hasPassword).toBe(false);
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ select: expect.objectContaining({ handle: true }) })
    );
  });

  it('returns null when the user does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    expect(await getUserWithSettings('user-1')).toBeNull();
  });
});

describe('retryOnHandleCollision', () => {
  it('returns the first result when the write succeeds', async () => {
    const write = vi.fn().mockResolvedValue('ok');

    expect(await retryOnHandleCollision(write)).toBe('ok');
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('runs the write once more after a unique violation', async () => {
    const write = vi.fn().mockRejectedValueOnce({ code: 'P2002' }).mockResolvedValueOnce('second');

    expect(await retryOnHandleCollision(write)).toBe('second');
    expect(write).toHaveBeenCalledTimes(2);
  });

  it('rethrows other errors without retrying', async () => {
    const write = vi.fn().mockRejectedValue(new Error('down'));

    await expect(retryOnHandleCollision(write)).rejects.toThrow('down');
    expect(write).toHaveBeenCalledTimes(1);
  });
});
