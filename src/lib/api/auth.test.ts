import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/db/api-tokens', () => ({
  findApiTokenOwner: vi.fn(),
  touchApiToken: vi.fn(),
}));

vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  checkRateLimit: vi.fn(),
}));

import { findApiTokenOwner, touchApiToken } from '@/lib/db/api-tokens';
import { checkRateLimit } from '@/lib/rate-limit';
import { hashApiToken } from './tokens';
import { authenticateApiRequest } from './auth';

const mockFindOwner = vi.mocked(findApiTokenOwner);
const mockTouch = vi.mocked(touchApiToken);
const mockCheckRateLimit = vi.mocked(checkRateLimit);

const ALLOWED = { success: true, remaining: 119, reset: 0, retryAfter: 0 };
const LIMITED = { success: false, remaining: 0, reset: 0, retryAfter: 30 };

const TOKEN = `ds_${'k'.repeat(43)}`;
const OWNER = { tokenId: 'tok-1', userId: 'user-1', isPro: false };

function request(authorization?: string, url = 'http://localhost/api/v1/items') {
  return new Request(url, { headers: authorization ? { authorization } : {} });
}

async function expectUnauthorized(response: Response | undefined) {
  expect(response?.status).toBe(401);
  expect(response?.headers.get('WWW-Authenticate')).toBe('Bearer');
  expect(response?.headers.get('Cache-Control')).toBe('no-store');
  expect(await response?.json()).toEqual({ error: 'Invalid or missing API token' });
}

describe('authenticateApiRequest', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFindOwner.mockResolvedValue(OWNER);
    mockTouch.mockResolvedValue();
    mockCheckRateLimit.mockResolvedValue(ALLOWED);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('returns 401 without an Authorization header', async () => {
    const auth = await authenticateApiRequest(request());

    await expectUnauthorized(auth.response);
    expect(auth.user).toBeUndefined();
    expect(mockFindOwner).not.toHaveBeenCalled();
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it('returns 401 for a malformed token without looking it up', async () => {
    for (const header of ['Bearer abc', `Basic ${TOKEN}`, TOKEN, `Bearer ${TOKEN}x`]) {
      await expectUnauthorized((await authenticateApiRequest(request(header))).response);
    }
    expect(mockFindOwner).not.toHaveBeenCalled();
  });

  it('ignores a token in the query string', async () => {
    const auth = await authenticateApiRequest(request(undefined, `http://localhost/api/v1/items?token=${TOKEN}`));

    await expectUnauthorized(auth.response);
    expect(mockFindOwner).not.toHaveBeenCalled();
  });

  it('returns 401 for an unknown or revoked token', async () => {
    mockFindOwner.mockResolvedValue(null);

    const auth = await authenticateApiRequest(request(`Bearer ${TOKEN}`));

    await expectUnauthorized(auth.response);
    expect(mockFindOwner).toHaveBeenCalledWith(hashApiToken(TOKEN));
    expect(mockTouch).not.toHaveBeenCalled();
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it('returns the owner for a valid token and records its use', async () => {
    const auth = await authenticateApiRequest(request(`Bearer ${TOKEN}`));

    expect(auth).toEqual({ user: { id: 'user-1', isPro: false } });
    expect(mockTouch).toHaveBeenCalledWith('tok-1');
  });

  it("takes isPro from the token owner's row", async () => {
    mockFindOwner.mockResolvedValue({ ...OWNER, isPro: true });

    const auth = await authenticateApiRequest(request(`Bearer ${TOKEN}`));

    expect(auth.user).toEqual({ id: 'user-1', isPro: true });
  });

  it('still authenticates when recording use fails', async () => {
    mockTouch.mockRejectedValue(new Error('write failed'));

    const auth = await authenticateApiRequest(request(`Bearer ${TOKEN}`));

    expect(auth.user).toEqual({ id: 'user-1', isPro: false });
    expect(consoleError).toHaveBeenCalled();
  });

  it("returns 429 with Retry-After when the owner's api limit is spent", async () => {
    mockCheckRateLimit.mockResolvedValue(LIMITED);

    const auth = await authenticateApiRequest(request(`Bearer ${TOKEN}`));

    expect(auth.user).toBeUndefined();
    expect(auth.response?.status).toBe(429);
    expect(auth.response?.headers.get('Retry-After')).toBe('30');
    expect(auth.response?.headers.get('Cache-Control')).toBe('no-store');
    expect(mockCheckRateLimit).toHaveBeenCalledWith('api', 'user-1');
  });
});
