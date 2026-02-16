import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

// Mock the auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock the db module
vi.mock('@/lib/db/users', () => ({
  updateEditorPreferences: vi.fn(),
}));

import { updateEditorPreferences } from './settings';
import { auth } from '@/auth';
import { updateEditorPreferences as updateEditorPreferencesQuery } from '@/lib/db/users';
import { DEFAULT_EDITOR_PREFERENCES } from '@/lib/constants/editor';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const mockUpdateEditorPreferencesQuery = vi.mocked(updateEditorPreferencesQuery);

describe('updateEditorPreferences server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await updateEditorPreferences(DEFAULT_EDITOR_PREFERENCES);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns error for invalid font size', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await updateEditorPreferences({
      ...DEFAULT_EDITOR_PREFERENCES,
      fontSize: 999, // Invalid font size
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid preferences');
  });

  it('returns error for invalid tab size', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await updateEditorPreferences({
      ...DEFAULT_EDITOR_PREFERENCES,
      tabSize: 3, // Invalid tab size (not 2, 4, or 8)
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid preferences');
  });

  it('returns error for invalid theme', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await updateEditorPreferences({
      ...DEFAULT_EDITOR_PREFERENCES,
      theme: 'invalid-theme' as 'vs-dark',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid preferences');
  });

  it('successfully updates valid preferences', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockUpdateEditorPreferencesQuery.mockResolvedValue(true);

    const preferences = {
      fontSize: 16,
      tabSize: 4,
      wordWrap: false,
      minimap: true,
      theme: 'monokai' as const,
    };

    const result = await updateEditorPreferences(preferences);

    expect(result.success).toBe(true);
    expect(mockUpdateEditorPreferencesQuery).toHaveBeenCalledWith('user-123', preferences);
  });

  it('returns error when database update fails', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockUpdateEditorPreferencesQuery.mockResolvedValue(false);

    const result = await updateEditorPreferences(DEFAULT_EDITOR_PREFERENCES);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to update preferences');
  });

  it('handles database exceptions gracefully', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockUpdateEditorPreferencesQuery.mockRejectedValue(new Error('Database error'));

    const result = await updateEditorPreferences(DEFAULT_EDITOR_PREFERENCES);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to update preferences');
  });

  it('validates all valid font sizes', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockUpdateEditorPreferencesQuery.mockResolvedValue(true);

    const validFontSizes = [12, 13, 14, 15, 16, 18, 20];

    for (const fontSize of validFontSizes) {
      const result = await updateEditorPreferences({
        ...DEFAULT_EDITOR_PREFERENCES,
        fontSize,
      });
      expect(result.success).toBe(true);
    }
  });

  it('validates all valid themes', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });
    mockUpdateEditorPreferencesQuery.mockResolvedValue(true);

    const validThemes = ['vs-dark', 'monokai', 'github-dark'] as const;

    for (const theme of validThemes) {
      const result = await updateEditorPreferences({
        ...DEFAULT_EDITOR_PREFERENCES,
        theme,
      });
      expect(result.success).toBe(true);
    }
  });
});
