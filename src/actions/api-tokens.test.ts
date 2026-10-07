import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({ auth: vi.fn() }));

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

vi.mock('@/lib/db/api-tokens', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/db/api-tokens')>()),
  createApiToken: vi.fn(),
  revokeApiToken: vi.fn(),
}));

import { auth } from '@/auth';
import {
  ApiTokenLimitError,
  createApiToken as createApiTokenQuery,
  revokeApiToken as revokeApiTokenQuery,
} from '@/lib/db/api-tokens';
import { UNAUTHORIZED_ERROR } from '@/lib/constants/action-errors';
import { createApiToken, revokeApiToken } from './api-tokens';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const mockCreateQuery = vi.mocked(createApiTokenQuery);
const mockRevokeQuery = vi.mocked(revokeApiTokenQuery);

const session: Session = { user: { id: 'user-1', isPro: false }, expires: '2099-01-01T00:00:00.000Z' };

const created = {
  token: `ds_${'x'.repeat(43)}`,
  apiToken: {
    id: 'tok-1',
    name: 'Laptop',
    lastFour: 'xxxx',
    createdAt: new Date('2026-10-07T12:00:00Z'),
    lastUsedAt: null,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(session);
});

describe('createApiToken action', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('returns Unauthorized without a session', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await createApiToken({ name: 'Laptop' });

    expect(result).toEqual({ success: false, error: UNAUTHORIZED_ERROR });
    expect(mockCreateQuery).not.toHaveBeenCalled();
  });

  it('rejects an empty name', async () => {
    const result = await createApiToken({ name: '   ' });

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.name).toEqual(['Give the token a name']);
    expect(mockCreateQuery).not.toHaveBeenCalled();
  });

  it('rejects a name over 50 characters', async () => {
    const result = await createApiToken({ name: 'a'.repeat(51) });

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.name).toEqual(['Keep the name to 50 characters']);
    expect(mockCreateQuery).not.toHaveBeenCalled();
  });

  it('creates a token for the session user with the trimmed name', async () => {
    mockCreateQuery.mockResolvedValue(created);

    const result = await createApiToken({ name: `  ${'a'.repeat(50)}  ` });

    expect(result).toEqual({ success: true, data: created });
    expect(mockCreateQuery).toHaveBeenCalledWith('user-1', 'a'.repeat(50));
  });

  it('passes the limit message through', async () => {
    mockCreateQuery.mockRejectedValue(new ApiTokenLimitError());

    const result = await createApiToken({ name: 'Laptop' });

    expect(result).toEqual({
      success: false,
      error: 'You can have up to 10 tokens. Revoke one to make another.',
    });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('returns a generic message for any other failure', async () => {
    mockCreateQuery.mockRejectedValue(new Error('connection reset'));

    const result = await createApiToken({ name: 'Laptop' });

    expect(result).toEqual({ success: false, error: 'Failed to create token' });
    expect(consoleError).toHaveBeenCalled();
  });
});

describe('revokeApiToken action', () => {
  it('returns Unauthorized without a session', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await revokeApiToken('tok-1');

    expect(result).toEqual({ success: false, error: UNAUTHORIZED_ERROR });
    expect(mockRevokeQuery).not.toHaveBeenCalled();
  });

  it('rejects a blank id', async () => {
    const result = await revokeApiToken('  ');

    expect(result).toEqual({ success: false, error: 'Invalid token ID' });
    expect(mockRevokeQuery).not.toHaveBeenCalled();
  });

  it("returns Token not found when the token is missing or someone else's", async () => {
    mockRevokeQuery.mockResolvedValue(false);

    const result = await revokeApiToken('tok-other');

    expect(result).toEqual({ success: false, error: 'Token not found' });
    expect(mockRevokeQuery).toHaveBeenCalledWith('user-1', 'tok-other');
  });

  it('revokes the token for the session user', async () => {
    mockRevokeQuery.mockResolvedValue(true);

    const result = await revokeApiToken('tok-1');

    expect(result).toEqual({ success: true });
    expect(mockRevokeQuery).toHaveBeenCalledWith('user-1', 'tok-1');
  });
});
