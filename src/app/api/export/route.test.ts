import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';
import { NextRequest } from 'next/server';

vi.mock('@/auth', () => ({ auth: vi.fn() }));

// The real file-urls and isFileType modules run; only the data query and the Prisma client are stubbed.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

vi.mock('@/lib/db/export', () => ({ getUserExportData: vi.fn() }));

import { auth } from '@/auth';
import { getUserExportData, type ExportData, type ExportItem } from '@/lib/db/export';
import { GET } from './route';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const mockGetExportData = vi.mocked(getUserExportData);
const fetchMock = vi.fn();

const NOW = new Date('2026-09-26T12:00:00Z');
const PUBLIC = 'https://pub-abc.r2.dev';
const OWNED_URL = `${PUBLIC}/user-1/1700000000-notes.pdf`;
const FOREIGN_URL = `${PUBLIC}/user-2/1700000000-secret.pdf`;

const freeSession: Session = { user: { id: 'user-1', isPro: false }, expires: '2099-01-01T00:00:00.000Z' };
const proSession: Session = { user: { id: 'user-1', isPro: true }, expires: '2099-01-01T00:00:00.000Z' };

function item(overrides: Partial<ExportItem> = {}): ExportItem {
  return {
    title: 'Item',
    type: 'snippet',
    content: 'const a = 1',
    language: 'typescript',
    description: null,
    url: null,
    fileName: null,
    fileSize: null,
    fileUrl: null,
    tags: [],
    collections: [],
    isFavorite: false,
    isPinned: false,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

const data: ExportData = {
  version: 1,
  exportedAt: NOW.toISOString(),
  items: [
    item(),
    item({ title: 'Owned file', type: 'file', fileName: 'notes.pdf', fileUrl: OWNED_URL }),
    item({ title: 'Foreign file', type: 'file', fileName: 'secret.pdf', fileUrl: FOREIGN_URL }),
  ],
  collections: [{ name: 'React', description: null, isFavorite: false }],
};

function get(query = '') {
  return GET(new NextRequest(`http://localhost/api/export${query}`));
}

describe('GET /api/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Only Date is faked: archiver drives its stream with real timers and nextTick.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    vi.stubEnv('R2_PUBLIC_URL', PUBLIC);
    vi.stubGlobal('fetch', fetchMock);
    mockAuth.mockResolvedValue(proSession);
    mockGetExportData.mockResolvedValue(data);
    fetchMock.mockResolvedValue(new Response('pdf-bytes', { status: 200 }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await get();

    expect(res.status).toBe(401);
    expect(mockGetExportData).not.toHaveBeenCalled();
  });

  it('returns 400 for an unknown format', async () => {
    const res = await get('?format=xml');

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid format' });
  });

  it('returns 403 for a ZIP export on the free tier', async () => {
    mockAuth.mockResolvedValue(freeSession);

    const res = await get('?format=zip');

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'ZIP export requires a Pro subscription' });
    expect(mockGetExportData).not.toHaveBeenCalled();
  });

  it('defaults to a JSON download of the session user data', async () => {
    mockAuth.mockResolvedValue(freeSession);

    const res = await get();

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="devstash-export-2026-09-26.json"');
    expect(await res.json()).toEqual(data);
    expect(mockGetExportData).toHaveBeenCalledWith('user-1');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('builds a ZIP for Pro users and only fetches files in the caller namespace', async () => {
    const res = await get('?format=zip');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/zip');
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="devstash-export-2026-09-26.zip"');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(OWNED_URL);
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK');
  });

  it('skips a file that cannot be fetched instead of failing the export', async () => {
    fetchMock.mockRejectedValue(new Error('r2 unreachable'));

    const res = await get('?format=zip');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/zip');
  });
});
