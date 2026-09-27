import { describe, it, expect } from 'vitest';
import { generateShortId, SHORT_ID_LENGTH, SHORT_ID_PATTERN } from './short-id';

describe('generateShortId', () => {
  it('returns 8 lowercase alphanumerics', () => {
    for (let i = 0; i < 100; i++) {
      const id = generateShortId();
      expect(id).toHaveLength(SHORT_ID_LENGTH);
      expect(id).toMatch(SHORT_ID_PATTERN);
    }
  });

  it('does not repeat across 10,000 draws', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      ids.add(generateShortId());
    }
    expect(ids.size).toBe(10_000);
  });
});
