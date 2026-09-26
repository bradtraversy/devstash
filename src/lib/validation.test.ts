import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { parseZodErrors, isValidUrlProtocol, safeUrlSchema, validateId } from './validation';

describe('parseZodErrors', () => {
  it('groups issue messages by their first path segment', () => {
    const schema = z.object({
      title: z.string().min(1, 'Title is required'),
      tags: z.array(z.string().max(2, 'Too long')),
    });
    const result = schema.safeParse({ title: '', tags: ['abc', 'defg'] });
    if (result.success) throw new Error('expected validation to fail');

    expect(parseZodErrors(result.error)).toEqual({
      title: ['Title is required'],
      tags: ['Too long', 'Too long'],
    });
  });

  it('files issues with an empty path under unknown', () => {
    const result = z.string().min(3, 'Too short').safeParse('a');
    if (result.success) throw new Error('expected validation to fail');

    expect(parseZodErrors(result.error)).toEqual({ unknown: ['Too short'] });
  });
});

describe('isValidUrlProtocol', () => {
  it.each(['https://example.com', 'http://localhost:3000/path?q=1'])('accepts %s', (url) => {
    expect(isValidUrlProtocol(url)).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,hi',
    'ftp://example.com/file',
    'file:///etc/passwd',
  ])('rejects %s', (url) => {
    expect(isValidUrlProtocol(url)).toBe(false);
  });

  it('rejects strings that do not parse as URLs', () => {
    expect(isValidUrlProtocol('not a url')).toBe(false);
    expect(isValidUrlProtocol('')).toBe(false);
  });
});

describe('safeUrlSchema', () => {
  it('passes http and https URLs through unchanged', () => {
    expect(safeUrlSchema.parse('https://example.com/a?b=1')).toBe('https://example.com/a?b=1');
  });

  it('normalizes null and undefined to null', () => {
    expect(safeUrlSchema.parse(null)).toBeNull();
    expect(safeUrlSchema.parse(undefined)).toBeNull();
  });

  it('rejects non-http protocols', () => {
    const result = safeUrlSchema.safeParse('javascript:alert(1)');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('URL must use http or https protocol');
    }
  });

  it('rejects malformed URLs', () => {
    expect(safeUrlSchema.safeParse('nope').success).toBe(false);
  });
});

describe('validateId', () => {
  it('returns null for a non-empty id', () => {
    expect(validateId('abc', 'item')).toBeNull();
  });

  it('rejects empty and whitespace ids with the label', () => {
    expect(validateId('', 'item')).toEqual({ success: false, error: 'Invalid item' });
    expect(validateId('   ', 'collection')).toEqual({ success: false, error: 'Invalid collection' });
  });
});
