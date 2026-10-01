import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  normalizePublicSegment,
  publicCollectionPath,
  publicMarkdownPath,
  publicRawPath,
  publicShortPath,
  publicShortRawPath,
  siteOrigin,
} from './paths';

describe('siteOrigin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the app URL without a trailing slash and falls back to localhost', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://devstash.io/');
    expect(siteOrigin()).toBe('https://devstash.io');

    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    expect(siteOrigin()).toBe('http://localhost:3000');
  });
});

describe('public paths', () => {
  it('builds the page, raw, and markdown paths', () => {
    expect(publicCollectionPath('brad', 'react-hooks')).toBe('/brad/react-hooks');
    expect(publicRawPath('brad', 'react-hooks')).toBe('/brad/react-hooks/raw');
    expect(publicMarkdownPath('brad', 'react-hooks')).toBe('/brad/react-hooks.md');
  });
});

describe('normalizePublicSegment', () => {
  it('lowercases a valid segment', () => {
    expect(normalizePublicSegment('Brad')).toBe('brad');
    expect(normalizePublicSegment('react-hooks')).toBe('react-hooks');
  });

  it('rejects anything a slug or handle could not be', () => {
    expect(normalizePublicSegment('')).toBeNull();
    expect(normalizePublicSegment(undefined)).toBeNull();
    expect(normalizePublicSegment('-leading')).toBeNull();
    expect(normalizePublicSegment('has space')).toBeNull();
    expect(normalizePublicSegment('.well-known')).toBeNull();
    expect(normalizePublicSegment('a%2e')).toBeNull();
    expect(normalizePublicSegment('a'.repeat(64))).toBeNull();
  });
});

describe('short link paths', () => {
  it('builds the item page and raw paths from the short id', () => {
    expect(publicShortPath('abc12345')).toBe('/s/abc12345');
    expect(publicShortRawPath('abc12345')).toBe('/s/abc12345/raw');
  });
});
