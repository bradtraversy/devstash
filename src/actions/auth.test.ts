import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/auth', () => ({ signIn: vi.fn() }));

import { signIn } from '@/auth';
import { signInWithGitHub } from './auth';

const mockSignIn = vi.mocked(signIn);

function form(redirectTo?: string) {
  const data = new FormData();
  if (redirectTo !== undefined) data.set('redirectTo', redirectTo);
  return data;
}

describe('signInWithGitHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns to the dashboard when no return path is given', async () => {
    await signInWithGitHub();
    await signInWithGitHub(form());

    expect(mockSignIn).toHaveBeenNthCalledWith(1, 'github', { redirectTo: '/dashboard' });
    expect(mockSignIn).toHaveBeenNthCalledWith(2, 'github', { redirectTo: '/dashboard' });
  });

  it('returns to a same-origin path with its query', async () => {
    await signInWithGitHub(form('/s/abc12345?save=1'));

    expect(mockSignIn).toHaveBeenCalledWith('github', { redirectTo: '/s/abc12345?save=1' });
  });

  it('ignores another origin', async () => {
    await signInWithGitHub(form('https://evil.example/steal'));
    await signInWithGitHub(form('//evil.example/steal'));

    expect(mockSignIn).toHaveBeenNthCalledWith(1, 'github', { redirectTo: '/dashboard' });
    expect(mockSignIn).toHaveBeenNthCalledWith(2, 'github', { redirectTo: '/dashboard' });
  });
});
