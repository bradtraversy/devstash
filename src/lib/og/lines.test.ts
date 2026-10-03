import { describe, it, expect } from 'vitest';
import { columnWidth, linesWithinBudget, previewLines } from './lines';

describe('previewLines', () => {
  it('returns the first lines, flags the rest as truncated, and counts them all', () => {
    expect(previewLines('a\nb\nc\nd', 2)).toEqual({ lines: ['a', 'b'], truncated: true, total: 4 });
  });

  it('is not truncated when everything fits', () => {
    expect(previewLines('a\nb', 10)).toEqual({ lines: ['a', 'b'], truncated: false, total: 2 });
  });

  it('drops one trailing empty line from a newline-terminated body', () => {
    expect(previewLines('a\nb\n', 2)).toEqual({ lines: ['a', 'b'], truncated: false, total: 2 });
    expect(previewLines('a\n\n', 10)).toEqual({ lines: ['a', ''], truncated: false, total: 2 });
  });

  it('expands tabs to two spaces and strips carriage returns', () => {
    expect(previewLines('\tx\r\n\t\ty', 10).lines).toEqual(['  x', '    y']);
  });

  it('cuts a long line at 120 characters by default and at the given width otherwise', () => {
    expect(previewLines('x'.repeat(200), 10).lines[0]).toHaveLength(120);
    expect(previewLines('x'.repeat(200), 10, 170).lines[0]).toHaveLength(170);
    expect(previewLines('x'.repeat(50), 10, 170).lines[0]).toHaveLength(50);
  });

  it('cuts wide characters by cells and never splits an emoji', () => {
    expect(previewLines('日本語のテキスト', 10, 7).lines[0]).toBe('日本語');
    expect(previewLines('ab🚀cd', 10, 3).lines[0]).toBe('ab');
    expect(previewLines('ab🚀cd', 10, 4).lines[0]).toBe('ab🚀');
  });

  it('returns no lines for empty or missing content', () => {
    expect(previewLines('', 5)).toEqual({ lines: [], truncated: false, total: 0 });
    expect(previewLines(null, 5)).toEqual({ lines: [], truncated: false, total: 0 });
    expect(previewLines(undefined, 5)).toEqual({ lines: [], truncated: false, total: 0 });
  });
});

describe('columnWidth', () => {
  it('counts ASCII as one cell and CJK, Hangul, fullwidth, and emoji as two', () => {
    expect(columnWidth('const a = 1;')).toBe(12);
    expect(columnWidth('日本語')).toBe(6);
    expect(columnWidth('한국어')).toBe(6);
    expect(columnWidth('ＡＢ')).toBe(4);
    expect(columnWidth('ok 🚀')).toBe(5);
  });
});

describe('linesWithinBudget', () => {
  it('keeps every line that fits and stops before the line that crosses the budget', () => {
    expect(linesWithinBudget(['abc', 'def'], 10)).toBe(2);
    expect(linesWithinBudget(['abcd', 'efgh', 'ijkl'], 8)).toBe(2);
    expect(linesWithinBudget([], 8)).toBe(0);
  });

  it('does not charge whitespace and charges wide characters double', () => {
    expect(linesWithinBudget(['    a b', '', '\t\t'], 2)).toBe(3);
    expect(linesWithinBudget(['日本', 'x'], 4)).toBe(1);
  });
});
