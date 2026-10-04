import { describe, it, expect } from 'vitest';
import { DEFAULT_PAGE_SIZE, parsePageParam, parsePageSize } from './page-size';

describe('parsePageSize', () => {
  it('accepts the offered sizes', () => {
    expect(parsePageSize('25')).toBe(25);
    expect(parsePageSize('50')).toBe(50);
    expect(parsePageSize('100')).toBe(100);
  });

  it('falls back to 25 for anything else', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(25);
    expect(parsePageSize(undefined)).toBe(25);
    expect(parsePageSize(null)).toBe(25);
    expect(parsePageSize('')).toBe(25);
    expect(parsePageSize('1000')).toBe(25);
    expect(parsePageSize('21')).toBe(25);
    expect(parsePageSize('50abc')).toBe(25);
  });
});

describe('parsePageParam', () => {
  it('reads a page number', () => {
    expect(parsePageParam('3')).toBe(3);
    expect(parsePageParam(['4', '9'])).toBe(4);
  });

  it('treats missing, invalid, zero, and negative pages as the first', () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam('abc')).toBe(1);
    expect(parsePageParam('0')).toBe(1);
    expect(parsePageParam('-2')).toBe(1);
    expect(parsePageParam([])).toBe(1);
  });

  it('caps absurd page numbers', () => {
    expect(parsePageParam('1000000000000000000')).toBe(10000);
  });
});
