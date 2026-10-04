import { describe, it, expect } from 'vitest';
import { homeFilterPath, parseHomeFilter } from './home';

describe('parseHomeFilter', () => {
  it('accepts the three filters', () => {
    expect(parseHomeFilter('all')).toBe('all');
    expect(parseHomeFilter('shared')).toBe('shared');
    expect(parseHomeFilter('pinned')).toBe('pinned');
  });

  it('falls back to all for missing and unknown values and takes the first of repeated ones', () => {
    expect(parseHomeFilter(undefined)).toBe('all');
    expect(parseHomeFilter('favorites')).toBe('all');
    expect(parseHomeFilter(['pinned', 'shared'])).toBe('pinned');
    expect(parseHomeFilter([])).toBe('all');
  });
});

describe('homeFilterPath', () => {
  it('keeps the plain path for all and adds show for the others', () => {
    expect(homeFilterPath('all')).toBe('/dashboard');
    expect(homeFilterPath('shared')).toBe('/dashboard?show=shared');
    expect(homeFilterPath('pinned')).toBe('/dashboard?show=pinned');
  });
});
