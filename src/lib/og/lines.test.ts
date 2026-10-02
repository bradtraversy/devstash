import { describe, it, expect } from 'vitest';
import { previewLines } from './lines';

describe('previewLines', () => {
  it('returns the first lines and flags the rest as truncated', () => {
    expect(previewLines('a\nb\nc\nd', 2)).toEqual({ lines: ['a', 'b'], truncated: true });
  });

  it('is not truncated when everything fits', () => {
    expect(previewLines('a\nb', 10)).toEqual({ lines: ['a', 'b'], truncated: false });
  });

  it('drops one trailing empty line from a newline-terminated body', () => {
    expect(previewLines('a\nb\n', 2)).toEqual({ lines: ['a', 'b'], truncated: false });
    expect(previewLines('a\n\n', 10)).toEqual({ lines: ['a', ''], truncated: false });
  });

  it('expands tabs to two spaces and strips carriage returns', () => {
    expect(previewLines('\tx\r\n\t\ty', 10).lines).toEqual(['  x', '    y']);
  });

  it('cuts a long line at 120 characters', () => {
    const { lines } = previewLines('x'.repeat(200), 10);
    expect(lines[0]).toHaveLength(120);
  });

  it('returns no lines for empty or missing content', () => {
    expect(previewLines('', 5)).toEqual({ lines: [], truncated: false });
    expect(previewLines(null, 5)).toEqual({ lines: [], truncated: false });
    expect(previewLines(undefined, 5)).toEqual({ lines: [], truncated: false });
  });
});
