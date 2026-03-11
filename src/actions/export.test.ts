import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db/export', () => ({
  getUserExportData: vi.fn(),
}));

import { exportData } from './export';
import { auth } from '@/auth';
import { getUserExportData } from '@/lib/db/export';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const mockGetUserExportData = vi.mocked(getUserExportData);

describe('exportData server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await exportData();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns export data on success', async () => {
    const mockData = {
      version: 1,
      exportedAt: '2026-03-11T00:00:00.000Z',
      items: [
        {
          title: 'Test Snippet',
          type: 'snippet',
          content: 'const x = 1;',
          language: 'typescript',
          description: null,
          url: null,
          fileName: null,
          fileSize: null,
          fileUrl: null,
          tags: ['test'],
          collections: ['React Patterns'],
          isFavorite: false,
          isPinned: false,
          createdAt: '2026-03-11T00:00:00.000Z',
          updatedAt: '2026-03-11T00:00:00.000Z',
        },
      ],
      collections: [
        {
          name: 'React Patterns',
          description: 'Common patterns',
          isFavorite: false,
        },
      ],
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockGetUserExportData.mockResolvedValue(mockData);

    const result = await exportData();

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockData);
    expect(mockGetUserExportData).toHaveBeenCalledWith('user-123');
  });

  it('includes version field in export data', async () => {
    const mockData = {
      version: 1,
      exportedAt: '2026-03-11T00:00:00.000Z',
      items: [],
      collections: [],
    };

    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockGetUserExportData.mockResolvedValue(mockData);

    const result = await exportData();

    expect(result.success).toBe(true);
    expect(result.data?.version).toBe(1);
  });
});
