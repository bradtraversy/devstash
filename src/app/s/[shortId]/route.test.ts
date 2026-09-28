import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/public', () => ({ resolveShortId: vi.fn() }));

import { resolveShortId } from '@/lib/db/public';
import { GET } from './route';

const mockResolveShortId = vi.mocked(resolveShortId);

function get(shortId: string) {
  return GET(new Request(`https://devstash.io/s/${shortId}`), {
    params: Promise.resolve({ shortId }),
  });
}

describe('GET /s/[shortId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders not found for a malformed id without querying', async () => {
    await expect(get('not-a-short-id')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(mockResolveShortId).not.toHaveBeenCalled();
  });

  it('renders not found when the id is unknown or private', async () => {
    mockResolveShortId.mockResolvedValue(null);

    await expect(get('abc12345')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(mockResolveShortId).toHaveBeenCalledWith('abc12345');
  });

  it('redirects to the canonical URL on the request origin', async () => {
    mockResolveShortId.mockResolvedValue({ handle: 'brad', slug: 'react-hooks' });

    const res = await get('abc12345');

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://devstash.io/brad/react-hooks');
  });

  it('accepts an uppercase id', async () => {
    mockResolveShortId.mockResolvedValue({ handle: 'brad', slug: 'react-hooks' });

    const res = await get('ABC12345');

    expect(mockResolveShortId).toHaveBeenCalledWith('abc12345');
    expect(res.status).toBe(302);
  });
});
