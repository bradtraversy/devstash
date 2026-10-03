import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/stripe', () => ({ getStripe: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: vi.fn(), update: vi.fn() } } }));

import { auth } from '@/auth';
import { POST } from './route';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/stripe/checkout', () => {
  it('returns 404 without reading the session while Pro is off', async () => {
    vi.stubEnv('NEXT_PUBLIC_PRO_ENABLED', '');

    const res = await POST(new Request('http://localhost/api/stripe/checkout', { method: 'POST', body: '{"plan":"monthly"}' }));

    expect(res.status).toBe(404);
    expect(auth).not.toHaveBeenCalled();
  });
});
