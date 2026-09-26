import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({ auth: vi.fn() }));

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

vi.mock('@/lib/r2', () => ({ uploadToR2: vi.fn(), validateFile: vi.fn() }));

vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  checkRateLimit: vi.fn(),
}));

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { uploadToR2, validateFile } from '@/lib/r2';
import { checkRateLimit } from '@/lib/rate-limit';
import { POST } from './route';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockUpload = vi.mocked(uploadToR2);
const mockValidate = vi.mocked(validateFile);
const mockCheckRateLimit = vi.mocked(checkRateLimit);

const ALLOWED = { success: true, remaining: 9, reset: 0, retryAfter: 0 };
const LIMITED = { success: false, remaining: 0, reset: 0, retryAfter: 120 };

const NOW = new Date('2026-09-26T12:00:00Z');
const session: Session = { user: { id: 'user-1', isPro: true }, expires: '2099-01-01T00:00:00.000Z' };

const proUser = {
  id: 'user-1',
  email: 'brad@example.com',
  emailVerified: NOW,
  name: 'Brad',
  image: null,
  password: null,
  isPro: true,
  stripeCustomerId: 'cus_1',
  stripeSubscriptionId: 'sub_1',
  editorPreferences: null,
  createdAt: NOW,
  updatedAt: NOW,
};

const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });

function post(fields: { file?: File; itemType?: string }) {
  const body = new FormData();
  if (fields.file) body.append('file', fields.file);
  if (fields.itemType) body.append('itemType', fields.itemType);
  return POST(new Request('http://localhost/api/upload', { method: 'POST', body }));
}

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(session);
    mockFindUnique.mockResolvedValue(proUser);
    mockCheckRateLimit.mockResolvedValue(ALLOWED);
    mockValidate.mockReturnValue({ valid: true });
    mockUpload.mockResolvedValue({
      fileUrl: 'https://pub-abc.r2.dev/user-1/1700000000-notes.txt',
      key: 'user-1/1700000000-notes.txt',
    });
  });

  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await post({ file, itemType: 'file' });

    expect(res.status).toBe(401);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('returns 403 for a free user before checking the rate limit', async () => {
    mockFindUnique.mockResolvedValue({ ...proUser, isPro: false });

    const res = await post({ file, itemType: 'file' });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'File uploads require a Pro subscription' });
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'user-1' }, select: { isPro: true } });
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it('rate limits per user id', async () => {
    mockCheckRateLimit.mockResolvedValue(LIMITED);

    const res = await post({ file, itemType: 'file' });

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('120');
    expect(mockCheckRateLimit).toHaveBeenCalledWith('upload', 'user-1');
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('checks the rate limit before reading the multipart body', async () => {
    mockCheckRateLimit.mockResolvedValue(LIMITED);

    const res = await POST(new Request('http://localhost/api/upload', { method: 'POST', body: 'not a form' }));

    expect(res.status).toBe(429);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('returns 400 when no file is attached', async () => {
    const res = await post({ itemType: 'file' });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'No file provided' });
  });

  it('returns 400 for an item type other than file or image', async () => {
    const res = await post({ file, itemType: 'video' });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid item type. Must be "file" or "image"' });
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it('returns the validation error when the file is rejected', async () => {
    mockValidate.mockReturnValue({ valid: false, error: 'File too large' });

    const res = await post({ file, itemType: 'image' });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'File too large' });
    expect(mockValidate).toHaveBeenCalledWith({ name: 'notes.txt', size: 5, type: 'text/plain' }, 'image');
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('uploads into the session user namespace and returns the file details', async () => {
    const res = await post({ file, itemType: 'file' });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      data: {
        fileUrl: 'https://pub-abc.r2.dev/user-1/1700000000-notes.txt',
        fileName: 'notes.txt',
        fileSize: 5,
      },
    });
    const [buffer, ...rest] = mockUpload.mock.calls[0];
    expect(buffer.toString()).toBe('hello');
    expect(rest).toEqual(['notes.txt', 'text/plain', 'user-1']);
  });

  it('returns 500 when the upload throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUpload.mockRejectedValue(new Error('r2 down'));

    const res = await post({ file, itemType: 'file' });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'An error occurred during upload' });
    errorSpy.mockRestore();
  });
});
