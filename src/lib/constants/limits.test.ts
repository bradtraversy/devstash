import { describe, it, expect, vi, afterEach } from 'vitest';
import { collectionLimitError, itemLimitError, maxCollections, maxItems } from './limits';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('limits', () => {
  it('uses the abuse ceiling without upgrade wording while Pro is off', () => {
    vi.stubEnv('NEXT_PUBLIC_PRO_ENABLED', '');

    expect(maxItems()).toBe(1000);
    expect(maxCollections()).toBe(100);
    expect(itemLimitError()).toBe('You have reached the limit of 1,000 items. Delete some to add more.');
    expect(collectionLimitError()).toBe('You have reached the limit of 100 collections. Delete some to add more.');
  });

  it('uses the free tier caps with the upgrade wording while Pro is on', () => {
    vi.stubEnv('NEXT_PUBLIC_PRO_ENABLED', 'true');

    expect(maxItems()).toBe(50);
    expect(maxCollections()).toBe(3);
    expect(itemLimitError()).toContain('Upgrade to Pro');
    expect(collectionLimitError()).toContain('Upgrade to Pro');
  });
});
