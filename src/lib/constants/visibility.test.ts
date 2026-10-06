import { describe, it, expect } from 'vitest';
import { collectionShareNotice, describeSharedVia } from './visibility';

describe('collectionShareNotice', () => {
  it('says nothing for an empty collection', () => {
    expect(collectionShareNotice(0, 0, 'PRIVATE')).toBeNull();
  });

  it('warns before sharing that every item becomes visible', () => {
    expect(collectionShareNotice(1, 0, 'PRIVATE')).toBe(
      'Sharing this collection makes its 1 item visible to anyone with the link.'
    );
    expect(collectionShareNotice(5, 0, 'PRIVATE')).toBe(
      'Sharing this collection makes all 5 of its items visible to anyone with the link.'
    );
  });

  it('names the private items before sharing', () => {
    expect(collectionShareNotice(5, 2, 'PRIVATE')).toBe(
      'Sharing this collection makes all 5 of its items visible to anyone with the link, including 2 set to Private.'
    );
  });

  it('only warns about a shared collection when it holds private items', () => {
    expect(collectionShareNotice(5, 0, 'UNLISTED')).toBeNull();
    expect(collectionShareNotice(1, 1, 'UNLISTED')).toBe(
      'This collection is shared, so its 1 item is visible to anyone with the link, including 1 set to Private.'
    );
    expect(collectionShareNotice(5, 3, 'PUBLIC')).toBe(
      'This collection is shared, so all 5 of its items are visible to anyone with the link, including 3 set to Private.'
    );
  });
});

describe('describeSharedVia', () => {
  const shared = (name: string, visibility: 'UNLISTED' | 'PUBLIC' = 'UNLISTED') => ({ name, visibility });

  it('returns null when no collection is shared', () => {
    expect(describeSharedVia([])).toBeNull();
    expect(describeSharedVia([{ name: 'Drafts', visibility: 'PRIVATE' }])).toBeNull();
  });

  it('names one shared collection and ignores private ones', () => {
    expect(describeSharedVia([{ name: 'Drafts', visibility: 'PRIVATE' }, shared('DevOps', 'PUBLIC')])).toBe(
      'Shared via the DevOps collection, so anyone with its link can see it'
    );
  });

  it('names two shared collections', () => {
    expect(describeSharedVia([shared('DevOps'), shared('React')])).toBe(
      'Shared via the DevOps and React collections, so anyone with their links can see it'
    );
  });

  it('summarizes three or more', () => {
    expect(describeSharedVia([shared('A'), shared('B'), shared('C'), shared('D')])).toBe(
      'Shared via 4 collections: A, B, and 2 more, so anyone with their links can see it'
    );
  });
});
