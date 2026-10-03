import { describe, it, expect } from 'vitest';
import { DEFAULT_LIST_LAYOUT, parseListLayout } from './list-layout';

describe('parseListLayout', () => {
  it('accepts both layouts', () => {
    expect(parseListLayout('rows')).toBe('rows');
    expect(parseListLayout('cards')).toBe('cards');
  });

  it('falls back to rows for missing values', () => {
    expect(DEFAULT_LIST_LAYOUT).toBe('rows');
    expect(parseListLayout(undefined)).toBe('rows');
    expect(parseListLayout(null)).toBe('rows');
    expect(parseListLayout('')).toBe('rows');
  });

  it('falls back to rows for unknown values', () => {
    expect(parseListLayout('grid')).toBe('rows');
    expect(parseListLayout('Cards')).toBe('rows');
    expect(parseListLayout('rows; path=/')).toBe('rows');
  });
});
