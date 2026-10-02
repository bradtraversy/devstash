import { describe, it, expect } from 'vitest';
import type { PublicCollection, PublicSharedItem } from '@/lib/db/public';
import { itemKindLabel, publicCollectionMetadata, publicItemMetadata } from './metadata';

const base: PublicCollection = {
  id: 'col-1',
  name: 'React Hooks',
  description: 'Hooks I reuse',
  slug: 'react-hooks',
  shortId: 'abc12345',
  visibility: 'PUBLIC',
  publishedAt: new Date('2026-09-28T12:00:00Z'),
  updatedAt: new Date('2026-09-28T12:00:00Z'),
  contentUpdatedAt: new Date('2026-09-28T12:00:00Z'),
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
    const image = `/brad/react-hooks/og?v=${base.updatedAt.getTime()}`;
    expect(metadata.openGraph).toEqual({
      type: 'article',
      title: 'React Hooks by @brad',
      description: 'Hooks I reuse',
      url: '/brad/react-hooks',
      siteName: 'DevStash',
      images: [{ url: image, width: 1200, height: 630, alt: 'React Hooks by @brad' }],
    });
    expect(metadata.twitter).toEqual({
      card: 'summary_large_image',
      title: 'React Hooks by @brad',
      description: 'Hooks I reuse',
      images: [image],
    });
  });

  it('versions the image URL by the latest change to the collection or its items', () => {
    const later = publicCollectionMetadata(
      { ...base, contentUpdatedAt: new Date('2026-10-02T08:00:00Z') },
      '/brad/react-hooks'
    );
    expect(later.openGraph?.images).toEqual([
      expect.objectContaining({ url: `/brad/react-hooks/og?v=${new Date('2026-10-02T08:00:00Z').getTime()}` }),
    ]);
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

const sharedItem: PublicSharedItem = {
  id: 'item-1',
  title: 'useAuth Hook',
  description: 'Reads the session',
  content: 'export function useAuth() {}',
  url: null,
  language: 'typescript',
  fileUrl: null,
  fileName: null,
  fileSize: null,
  itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
  shortId: 'k3j9x2ab',
  visibility: 'PUBLIC',
  publishedAt: new Date('2026-10-01T12:00:00Z'),
  updatedAt: new Date('2026-10-01T12:00:00Z'),
  handle: 'brad',
};

describe('publicItemMetadata', () => {
  it('builds title, description, canonical, Open Graph, and twitter fields', () => {
    const metadata = publicItemMetadata(sharedItem, '/s/k3j9x2ab');

    expect(metadata.title).toBe('useAuth Hook by @brad | DevStash');
    expect(metadata.description).toBe('Reads the session');
    expect(metadata.alternates).toEqual({ canonical: '/s/k3j9x2ab' });
    const image = `/s/k3j9x2ab/og?v=${sharedItem.updatedAt.getTime()}`;
    expect(metadata.openGraph).toEqual({
      type: 'article',
      title: 'useAuth Hook by @brad',
      description: 'Reads the session',
      url: '/s/k3j9x2ab',
      siteName: 'DevStash',
      images: [{ url: image, width: 1200, height: 630, alt: 'useAuth Hook by @brad' }],
    });
    expect(metadata.twitter).toEqual({
      card: 'summary_large_image',
      title: 'useAuth Hook by @brad',
      description: 'Reads the session',
      images: [image],
    });
    expect(metadata.robots).toBeUndefined();
  });

  it('marks unlisted items noindex', () => {
    expect(publicItemMetadata({ ...sharedItem, visibility: 'UNLISTED' }, '/s/x').robots).toEqual({
      index: false,
      follow: false,
    });
  });

  it('describes an item by its kind when there is no description', () => {
    expect(publicItemMetadata({ ...sharedItem, description: null }, '/s/x').description).toBe(
      'TypeScript snippet by @brad on DevStash'
    );
    expect(
      publicItemMetadata({ ...sharedItem, description: null, language: null }, '/s/x').description
    ).toBe('Snippet by @brad on DevStash');
    expect(
      publicItemMetadata(
        {
          ...sharedItem,
          description: null,
          language: null,
          itemType: { name: 'command', icon: 'Terminal', color: '#f97316' },
        },
        '/s/x'
      ).description
    ).toBe('Command by @brad on DevStash');
  });

  it('shortens a long description', () => {
    const description = publicItemMetadata(
      { ...sharedItem, description: 'b'.repeat(300) },
      '/s/x'
    ).description!;

    expect(description.length).toBe(200);
    expect(description.endsWith('...')).toBe(true);
  });
});

describe('itemKindLabel', () => {
  it('capitalises non-snippet types', () => {
    expect(itemKindLabel({ itemType: { name: 'note', icon: 'StickyNote', color: '#fde047' }, language: null })).toBe('Note');
  });
});
