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

  it('falls back for empty values and header injection attempts', () => {
    expect(safeRedirectPath(null)).toBe('/dashboard');
    expect(safeRedirectPath('')).toBe('/dashboard');
    expect(safeRedirectPath('/ok\r\nSet-Cookie: x')).toBe('/dashboard');
  });

  it('honors a custom fallback', () => {
    expect(safeRedirectPath('https://evil.example', '/')).toBe('/');
  });
});
