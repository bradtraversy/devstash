import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({ auth: vi.fn() }));

vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  checkRateLimit: vi.fn(),
}));

import { auth } from '@/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAuthedSession, requirePro, checkAiRateLimit } from './action-utils';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const mockCheckRateLimit = vi.mocked(checkRateLimit);

const session: Session = { user: { id: 'user-1', isPro: true }, expires: '2099-01-01T00:00:00.000Z' };

describe('getAuthedSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an Unauthorized result when there is no session', async () => {
    mockAuth.mockResolvedValue(null);

    expect(await getAuthedSession()).toEqual({ unauthorized: { success: false, error: 'Unauthorized' } });
  });

  it('treats a session without a user id as unauthorized', async () => {
    mockAuth.mockResolvedValue({ ...session, user: { id: '', isPro: false } });

    expect(await getAuthedSession()).toEqual({ unauthorized: { success: false, error: 'Unauthorized' } });
  });

  it('returns the session when a user id is present', async () => {
    mockAuth.mockResolvedValue(session);

    expect(await getAuthedSession()).toEqual({ session });
  });
});

describe('requirePro', () => {
  it('rejects undefined and false', () => {
    const expected = { success: false, error: 'AI features require a Pro subscription' };
    expect(requirePro(undefined)).toEqual(expected);
    expect(requirePro(false)).toEqual(expected);
  });

  it('returns null for a Pro user', () => {
    expect(requirePro(true)).toBeNull();
  });
});

describe('checkAiRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null and keys the limit by user id when allowed', async () => {
    mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 19, reset: 0, retryAfter: 0 });

    expect(await checkAiRateLimit('user-1')).toBeNull();
    expect(mockCheckRateLimit).toHaveBeenCalledWith('ai', 'user-1');
  });

  it('formats the retry time in minutes when limited', async () => {
    mockCheckRateLimit.mockResolvedValue({ success: false, remaining: 0, reset: 0, retryAfter: 90 });

    expect(await checkAiRateLimit('user-1')).toEqual({
      success: false,
      error: 'Too many AI requests. Please try again in 2 minutes.',
    });
  });

  it('formats the retry time in seconds under a minute', async () => {
    mockCheckRateLimit.mockResolvedValue({ success: false, remaining: 0, reset: 0, retryAfter: 45 });

    expect(await checkAiRateLimit('user-1')).toEqual({
      success: false,
      error: 'Too many AI requests. Please try again in 45 seconds.',
    });
  });
});
