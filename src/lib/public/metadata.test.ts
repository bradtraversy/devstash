import { describe, it, expect } from 'vitest';
import type { PublicCollection } from '@/lib/db/public';
import { publicCollectionMetadata } from './metadata';

const base: PublicCollection = {
  id: 'col-1',
  name: 'React Hooks',
  description: 'Hooks I reuse',
  slug: 'react-hooks',
  shortId: 'abc12345',
  visibility: 'PUBLIC',
  publishedAt: new Date('2026-09-28T12:00:00Z'),
  updatedAt: new Date('2026-09-28T12:00:00Z'),
  handle: 'brad',
  itemCount: 3,
  items: [],
};

describe('publicCollectionMetadata', () => {
  it('builds title, description, canonical, Open Graph, and twitter fields', () => {
    const metadata = publicCollectionMetadata(base, '/brad/react-hooks');

    expect(metadata.title).toBe('React Hooks by @brad | DevStash');
    expect(metadata.description).toBe('Hooks I reuse');
    expect(metadata.alternates).toEqual({ canonical: '/brad/react-hooks' });
    expect(metadata.openGraph).toEqual({
      type: 'article',
      title: 'React Hooks by @brad',
      description: 'Hooks I reuse',
      url: '/brad/react-hooks',
      siteName: 'DevStash',
    });
    expect(metadata.twitter).toEqual({
      card: 'summary_large_image',
      title: 'React Hooks by @brad',
      description: 'Hooks I reuse',
    });
  });

  it('leaves public collections indexable and marks unlisted ones noindex', () => {
    expect(publicCollectionMetadata(base, '/brad/react-hooks').robots).toBeUndefined();
    expect(
      publicCollectionMetadata({ ...base, visibility: 'UNLISTED' }, '/brad/react-hooks').robots
    ).toEqual({ index: false, follow: false });
  });

  it('describes the collection by item count when there is no description', () => {
    expect(publicCollectionMetadata({ ...base, description: null }, '/x/y').description).toBe(
      '3 items by @brad on DevStash'
    );
    expect(
      publicCollectionMetadata({ ...base, description: null, itemCount: 1 }, '/x/y').description
    ).toBe('1 item by @brad on DevStash');
  });

  it('shortens a long description', () => {
    const long = 'a'.repeat(250);
    const description = publicCollectionMetadata({ ...base, description: long }, '/x/y').description!;

    expect(description.length).toBe(200);
    expect(description.endsWith('...')).toBe(true);
  });
});
