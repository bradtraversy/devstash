import { describe, it, expect, vi, afterEach } from 'vitest';
import { hasAiAccess, hasFileAccess, isProEnabled, isProUser, isTypeListed, showsProBadge } from './plans';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isProEnabled', () => {
  it('is off when the variable is unset or anything other than "true"', () => {
    vi.stubEnv('NEXT_PUBLIC_PRO_ENABLED', '');
    expect(isProEnabled()).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_PRO_ENABLED', '1');
    expect(isProEnabled()).toBe(false);
  });

  it('is on when the variable is "true"', () => {
    vi.stubEnv('NEXT_PUBLIC_PRO_ENABLED', 'true');
    expect(isProEnabled()).toBe(true);
  });
});

describe('with Pro off', () => {
  it('opens AI to everyone and closes files to everyone, a stale Pro flag included', () => {
    vi.stubEnv('NEXT_PUBLIC_PRO_ENABLED', '');

    expect(hasAiAccess(false)).toBe(true);
    expect(hasAiAccess(undefined)).toBe(true);
    expect(hasFileAccess(true)).toBe(false);
    expect(isProUser(true)).toBe(false);
  });

  it('lists Files and Images only for users who have some, with no PRO badge', () => {
    vi.stubEnv('NEXT_PUBLIC_PRO_ENABLED', '');

    expect(isTypeListed({ name: 'file', count: 0 })).toBe(false);
    expect(isTypeListed({ name: 'image', count: 2 })).toBe(true);
    expect(isTypeListed({ name: 'snippet', count: 0 })).toBe(true);
    expect(showsProBadge('file')).toBe(false);
  });
});

describe('with Pro on', () => {
  it('keeps AI and files for Pro users only', () => {
    vi.stubEnv('NEXT_PUBLIC_PRO_ENABLED', 'true');

    expect(hasAiAccess(false)).toBe(false);
    expect(hasAiAccess(true)).toBe(true);
    expect(hasFileAccess(false)).toBe(false);
    expect(hasFileAccess(true)).toBe(true);
    expect(isProUser(true)).toBe(true);
  });

  it('lists every type and badges Files and Images', () => {
    vi.stubEnv('NEXT_PUBLIC_PRO_ENABLED', 'true');

    expect(isTypeListed({ name: 'file', count: 0 })).toBe(true);
    expect(showsProBadge('image')).toBe(true);
    expect(showsProBadge('snippet')).toBe(false);
  });
});
