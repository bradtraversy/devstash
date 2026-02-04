import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatRelativeDate } from './date';

describe('formatRelativeDate', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Today" for the current date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));

    expect(formatRelativeDate(new Date('2025-06-15T08:00:00Z'))).toBe('Today');
  });

  it('returns "Yesterday" for one day ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));

    expect(formatRelativeDate(new Date('2025-06-14T12:00:00Z'))).toBe(
      'Yesterday'
    );
  });

  it('returns "X days ago" for 2-6 days ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));

    expect(formatRelativeDate(new Date('2025-06-12T12:00:00Z'))).toBe(
      '3 days ago'
    );
  });

  it('returns "X weeks ago" for 7-29 days ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));

    expect(formatRelativeDate(new Date('2025-06-01T12:00:00Z'))).toBe(
      '2 weeks ago'
    );
  });

  it('returns formatted date for 30+ days ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));

    const result = formatRelativeDate(new Date('2025-04-01T12:00:00Z'));
    expect(result).toBe('Apr 1');
  });

  it('includes year for dates over 365 days ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));

    const result = formatRelativeDate(new Date('2024-01-15T12:00:00Z'));
    expect(result).toBe('Jan 15, 2024');
  });

  it('accepts string dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));

    expect(formatRelativeDate('2025-06-15T08:00:00Z')).toBe('Today');
  });
});
