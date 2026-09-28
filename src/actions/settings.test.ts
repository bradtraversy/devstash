import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

// Mock the auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock the db module
vi.mock('@/lib/db/users', () => ({
  updateEditorPreferences: vi.fn(),
  updateUserHandle: vi.fn(),
}));

vi.mock('@/lib/db/public', () => ({
  publicPathsForUser: vi.fn(async () => []),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { updateEditorPreferences, updateHandle } from './settings';
import { auth } from '@/auth';
import {
  updateEditorPreferences as updateEditorPreferencesQuery,
  updateUserHandle as updateUserHandleQuery,
} from '@/lib/db/users';
import { DEFAULT_EDITOR_PREFERENCES } from '@/lib/constants/editor';
import { publicPathsForUser } from '@/lib/db/public';
import { revalidatePath } from 'next/cache';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const mockUpdateEditorPreferencesQuery = vi.mocked(updateEditorPreferencesQuery);
const mockUpdateUserHandleQuery = vi.mocked(updateUserHandleQuery);
const mockPublicPathsForUser = vi.mocked(publicPathsForUser);
const mockRevalidatePath = vi.mocked(revalidatePath);
const revalidated = () => mockRevalidatePath.mock.calls.map((call) => call[0]);

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

describe('updateHandle server action', () => {
  const session = {
    user: { id: 'user-123', isPro: false },
    expires: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(session);
    mockUpdateUserHandleQuery.mockResolvedValue(undefined);
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await updateHandle({ handle: 'brad' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(mockUpdateUserHandleQuery).not.toHaveBeenCalled();
  });

  it('rejects a malformed handle with a field error', async () => {
    const result = await updateHandle({ handle: 'brad traversy' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
    expect(result.fieldErrors?.handle).toEqual(['Use lowercase letters, numbers, and hyphens']);
    expect(mockUpdateUserHandleQuery).not.toHaveBeenCalled();
  });

  it('rejects a reserved handle', async () => {
    const result = await updateHandle({ handle: 'settings' });

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.handle).toEqual(['That name is reserved']);
    expect(mockUpdateUserHandleQuery).not.toHaveBeenCalled();
  });

  it('normalizes the handle and saves it for the session user', async () => {
    const result = await updateHandle({ handle: '  Brad ' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ handle: 'brad' });
    expect(mockUpdateUserHandleQuery).toHaveBeenCalledWith('user-123', 'brad');
  });

  it('maps a unique violation to a taken message', async () => {
    mockUpdateUserHandleQuery.mockRejectedValue({ code: 'P2002' });

    const result = await updateHandle({ handle: 'brad' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
    expect(result.fieldErrors?.handle).toEqual(['That handle is taken']);
  });

  it('returns a generic error when the query throws', async () => {
    mockUpdateUserHandleQuery.mockRejectedValue(new Error('DB error'));

    const result = await updateHandle({ handle: 'brad' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to update handle');
  });
});

describe('public page revalidation from settings actions', () => {
  const session = {
    user: { id: 'user-123', isPro: true },
    expires: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(session);
  });

  it('updateHandle revalidates every shared collection under the old and new handle', async () => {
    mockPublicPathsForUser
      .mockResolvedValueOnce(['/brad/react', '/brad/node'])
      .mockResolvedValueOnce(['/traversy/react', '/traversy/node']);
    mockUpdateUserHandleQuery.mockResolvedValue(undefined as never);

    const result = await updateHandle({ handle: 'traversy' });

    expect(result.success).toBe(true);
    expect(mockPublicPathsForUser).toHaveBeenCalledTimes(2);
    expect(mockPublicPathsForUser).toHaveBeenCalledWith('user-123');
    expect(revalidated()).toEqual([
      '/brad/react',
      '/brad/node',
      '/traversy/react',
      '/traversy/node',
    ]);
  });

  it('updateHandle skips revalidation when the handle is taken', async () => {
    mockUpdateUserHandleQuery.mockRejectedValue({ code: 'P2002' });

    const result = await updateHandle({ handle: 'taken' });

    expect(result.success).toBe(false);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('updateEditorPreferences never revalidates', async () => {
    mockUpdateEditorPreferencesQuery.mockResolvedValue(true);

    await updateEditorPreferences(DEFAULT_EDITOR_PREFERENCES);

    expect(mockPublicPathsForUser).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
