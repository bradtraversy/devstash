import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({ auth: vi.fn() }));

import { auth } from '@/auth';
import { GET } from './route';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const fetchMock = vi.fn();

const PUBLIC = 'https://pub-abc.r2.dev';
const OWNED = ['user-1', '1700000000-notes.pdf'];
const session: Session = { user: { id: 'user-1', isPro: true }, expires: '2099-01-01T00:00:00.000Z' };

function get(segments: string[]) {
  return GET(new Request(`http://localhost/api/download/${segments.join('/')}`), {
    params: Promise.resolve({ path: segments }),
  });
}

describe('GET /api/download/[...path]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('R2_PUBLIC_URL', PUBLIC);
    vi.stubGlobal('fetch', fetchMock);
    mockAuth.mockResolvedValue(session);
    fetchMock.mockResolvedValue(
      new Response('file-bytes', { status: 200, headers: { 'content-type': 'application/pdf' } })
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await get(OWNED);

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 500 when storage is not configured', async () => {
    vi.stubEnv('R2_PUBLIC_URL', '');

    const res = await get(OWNED);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Storage not configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 403 for a file in another user namespace', async () => {
    const res = await get(['user-2', '1700000000-secret.pdf']);

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [['user-1', '..', 'user-2', 'secret.pdf']],
    [['user-1', '%2e%2e', 'user-2', 'secret.pdf']],
    [['user-1', 'a%2fb.pdf']],
  ])('returns 403 for the traversal attempt %j', async (segments) => {
    const res = await get(segments);

    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the object is missing in R2', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));

    const res = await get(OWNED);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'File not found' });
  });

  it('streams the owned file as an attachment with the timestamp stripped', async () => {
    const res = await get(OWNED);

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(`${PUBLIC}/user-1/1700000000-notes.pdf`);
    expect(await res.text()).toBe('file-bytes');
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="notes.pdf"');
    expect(res.headers.get('Cache-Control')).toBe('private, max-age=3600');
  });

  it('falls back to application/octet-stream when R2 sends no content type', async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));

    const res = await get(OWNED);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/octet-stream');
  });

  it('returns 500 when the fetch throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error('r2 unreachable'));

    const res = await get(OWNED);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'An error occurred during download' });
    errorSpy.mockRestore();
  });
});
