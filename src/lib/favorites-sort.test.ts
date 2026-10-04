import { describe, it, expect } from 'vitest';
import { favoritesPath, parseFavoriteSort } from './favorites-sort';

describe('parseFavoriteSort', () => {
  it('accepts every sort', () => {
    for (const sort of ['date-desc', 'date-asc', 'name-asc', 'name-desc', 'type']) {
      expect(parseFavoriteSort(sort)).toBe(sort);
    }
  });

  it('falls back to newest for missing and unknown values and takes the first of repeated ones', () => {
    expect(parseFavoriteSort(undefined)).toBe('date-desc');
    expect(parseFavoriteSort('price')).toBe('date-desc');
    expect(parseFavoriteSort(['type', 'name-asc'])).toBe('type');
  });
});

describe('favoritesPath', () => {
  it('keeps the plain path for the default sort', () => {
    expect(favoritesPath('date-desc')).toBe('/favorites');
    expect(favoritesPath('name-asc')).toBe('/favorites?sort=name-asc');
  });
});
