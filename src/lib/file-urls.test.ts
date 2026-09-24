import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ownedFileKey, isOwnedFileUrl } from './file-urls';

const PUBLIC = 'https://pub-abc.r2.dev';
const ME = 'user_me';

describe('ownedFileKey', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('R2_PUBLIC_URL', PUBLIC);
  });

  it('returns the key for a URL in the caller namespace', () => {
    expect(ownedFileKey(`${PUBLIC}/${ME}/1700000000-notes.pdf`, ME)).toBe(`${ME}/1700000000-notes.pdf`);
  });

  it('tolerates a trailing slash on the configured public URL', () => {
    vi.stubEnv('R2_PUBLIC_URL', `${PUBLIC}/`);
    expect(ownedFileKey(`${PUBLIC}/${ME}/a.png`, ME)).toBe(`${ME}/a.png`);
  });

  it('rejects another user namespace', () => {
    expect(ownedFileKey(`${PUBLIC}/user_victim/1700000000-secret.pdf`, ME)).toBeNull();
  });

  it('rejects a namespace that merely starts with the caller id', () => {
    expect(ownedFileKey(`${PUBLIC}/${ME}2/a.pdf`, ME)).toBeNull();
  });

  it('rejects other hosts, including internal ones', () => {
    expect(ownedFileKey(`http://169.254.169.254/latest/meta-data/`, ME)).toBeNull();
    expect(ownedFileKey(`https://evil.example/${ME}/a.pdf`, ME)).toBeNull();
  });

  it('rejects dot segments, empty segments, queries, and fragments', () => {
    expect(ownedFileKey(`${PUBLIC}/${ME}/../user_victim/a.pdf`, ME)).toBeNull();
    expect(ownedFileKey(`${PUBLIC}/${ME}//a.pdf`, ME)).toBeNull();
    expect(ownedFileKey(`${PUBLIC}/${ME}/`, ME)).toBeNull();
    expect(ownedFileKey(`${PUBLIC}/${ME}/a.pdf?x=1`, ME)).toBeNull();
    expect(ownedFileKey(`${PUBLIC}/${ME}/a.pdf#frag`, ME)).toBeNull();
  });

  it('returns null when the public URL is not configured or inputs are empty', () => {
    vi.stubEnv('R2_PUBLIC_URL', '');
    expect(ownedFileKey(`${PUBLIC}/${ME}/a.pdf`, ME)).toBeNull();
    vi.stubEnv('R2_PUBLIC_URL', PUBLIC);
    expect(ownedFileKey(null, ME)).toBeNull();
    expect(ownedFileKey(`${PUBLIC}/${ME}/a.pdf`, '')).toBeNull();
  });

  it('isOwnedFileUrl mirrors the key check', () => {
    expect(isOwnedFileUrl(`${PUBLIC}/${ME}/a.pdf`, ME)).toBe(true);
    expect(isOwnedFileUrl(`${PUBLIC}/other/a.pdf`, ME)).toBe(false);
  });
});
