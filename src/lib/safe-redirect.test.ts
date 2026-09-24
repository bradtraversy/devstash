import { describe, it, expect } from 'vitest';
import { safeRedirectPath } from './safe-redirect';

describe('safeRedirectPath', () => {
  it('keeps same-origin paths with query strings', () => {
    expect(safeRedirectPath('/collections/abc?page=2')).toBe('/collections/abc?page=2');
    expect(safeRedirectPath('/')).toBe('/');
  });

  it('falls back for absolute and protocol-relative URLs', () => {
    expect(safeRedirectPath('https://evil.example/login')).toBe('/dashboard');
    expect(safeRedirectPath('//evil.example')).toBe('/dashboard');
    expect(safeRedirectPath('/\\evil.example')).toBe('/dashboard');
    expect(safeRedirectPath('javascript:alert(1)')).toBe('/dashboard');
  });

  it('falls back for empty values', () => {
    expect(safeRedirectPath(null)).toBe('/dashboard');
    expect(safeRedirectPath('')).toBe('/dashboard');
  });

  it('falls back when parser-stripped characters would change the origin', () => {
    const tab = String.fromCharCode(9);
    expect(safeRedirectPath(`/${tab}/evil.example`)).toBe('/dashboard');
    expect(safeRedirectPath(decodeURIComponent('/%09/evil.example'))).toBe('/dashboard');
    expect(safeRedirectPath('/\\evil.example')).toBe('/dashboard');
    expect(safeRedirectPath('/\\/evil.example')).toBe('/dashboard');
  });

  it('returns a normalized same-origin path', () => {
    expect(safeRedirectPath('/a/../b?x=1#h')).toBe('/b?x=1#h');
  });

  it('honors a custom fallback', () => {
    expect(safeRedirectPath('https://evil.example', '/')).toBe('/');
  });
});
