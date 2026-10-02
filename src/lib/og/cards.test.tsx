import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PublicCollection, PublicItem, PublicSharedItem } from '@/lib/db/public';
import { formatFileSize } from '@/lib/r2';
import { CollectionCard, ItemCard, kindLabel } from './cards';
import { OG_COLLECTION_ROWS } from './constants';

const snippetType = { name: 'snippet', icon: 'Code', color: '#3b82f6' };

function item(overrides: Partial<PublicSharedItem> = {}): PublicSharedItem {
  return {
    id: 'item-1',
    title: 'useAuth Hook',
    description: null,
    content: 'export function useAuth() {}',
    url: null,
    language: 'typescript',
    fileUrl: null,
    fileName: null,
    fileSize: null,
    itemType: snippetType,
    shortId: 'k3j9x2ab',
    visibility: 'PUBLIC',
    publishedAt: new Date('2026-10-01T12:00:00Z'),
    updatedAt: new Date('2026-10-01T12:00:00Z'),
    handle: 'brad',
    ...overrides,
  };
}

const lines = [
  [
    { content: 'export ', color: '#569cd6' },
    { content: 'function', color: '#c586c0' },
  ],
  [{ content: '  return 1;', color: '#d4d4d4' }],
];

const FADE = 'rgba(24, 24, 27, 0)';

describe('ItemCard', () => {
  it('shows the title, kind, handle, and every preview line', () => {
    const html = renderToStaticMarkup(<ItemCard item={item()} lines={lines} truncated={false} />);

    expect(html).toContain('useAuth Hook');
    expect(html).toContain('TypeScript');
    expect(html).toContain('@brad');
    expect(html).toContain('devstash.io');
    expect(html).toContain('export ');
    expect(html).toContain('function');
    expect(html).toContain('  return 1;');
    expect(html).toContain('color:#569cd6');
    expect(html).not.toContain(FADE);
  });

  it('fades the bottom of the panel when lines were cut', () => {
    const html = renderToStaticMarkup(<ItemCard item={item()} lines={lines} truncated />);
    expect(html).toContain(FADE);
  });

  it('labels a command as Terminal and shows (empty) when there is nothing to preview', () => {
    const html = renderToStaticMarkup(
      <ItemCard
        item={item({ content: '', language: null, itemType: { name: 'command', icon: 'Terminal', color: '#f97316' } })}
        lines={[]}
        truncated={false}
      />
    );

    expect(html).toContain('Terminal');
    expect(html).toContain('(empty)');
  });

  it('shows the URL for a link', () => {
    const html = renderToStaticMarkup(
      <ItemCard
        item={item({ url: 'https://react.dev/reference', itemType: { name: 'link', icon: 'Link', color: '#10b981' } })}
        lines={[]}
        truncated={false}
      />
    );

    expect(html).toContain('https://react.dev/reference');
    expect(html).toContain('Link');
  });

  it('shows the file name and size for a file', () => {
    const html = renderToStaticMarkup(
      <ItemCard
        item={item({ fileName: 'notes.pdf', fileSize: 1536, itemType: { name: 'file', icon: 'File', color: '#6b7280' } })}
        lines={[]}
        truncated={false}
      />
    );

    expect(html).toContain('notes.pdf');
    expect(html).toContain(formatFileSize(1536));
  });
});

function collectionItems(count: number): PublicItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `item-${index + 1}`,
    title: `Item ${index + 1}`,
    description: null,
    content: null,
    url: null,
    language: 'javascript',
    fileUrl: null,
    fileName: null,
    fileSize: null,
    itemType: snippetType,
  }));
}

function collection(count: number): PublicCollection {
  return {
    id: 'col-1',
    name: 'React Hooks',
    description: null,
    slug: 'react-hooks',
    shortId: 'abc12345',
    visibility: 'PUBLIC',
    publishedAt: new Date('2026-09-28T12:00:00Z'),
    updatedAt: new Date('2026-09-28T12:00:00Z'),
    contentUpdatedAt: new Date('2026-09-28T12:00:00Z'),
    handle: 'brad',
    itemCount: count,
    items: collectionItems(count),
  };
}

describe('CollectionCard', () => {
  it('lists every item when they fit', () => {
    const html = renderToStaticMarkup(<CollectionCard collection={collection(OG_COLLECTION_ROWS)} />);

    expect(html).toContain('React Hooks');
    expect(html).toContain(`${OG_COLLECTION_ROWS} items`);
    for (let n = 1; n <= OG_COLLECTION_ROWS; n++) {
      expect(html).toContain(`Item ${n}`);
    }
    expect(html).not.toContain('more');
  });

  it('gives the last row to the overflow count when there are too many', () => {
    const html = renderToStaticMarkup(<CollectionCard collection={collection(OG_COLLECTION_ROWS + 3)} />);

    expect(html).toContain(`Item ${OG_COLLECTION_ROWS - 1}`);
    expect(html).not.toContain(`Item ${OG_COLLECTION_ROWS}<`);
    expect(html).toContain('+ 4 more');
  });

  it('handles an empty collection and the singular count', () => {
    expect(renderToStaticMarkup(<CollectionCard collection={collection(0)} />)).toContain('No items yet');
    expect(renderToStaticMarkup(<CollectionCard collection={collection(1)} />)).toContain('1 item<');
  });
});

describe('kindLabel', () => {
  it('names snippets by language, commands as Terminal, and other types by name', () => {
    expect(kindLabel({ itemType: snippetType, language: 'python' })).toBe('Python');
    expect(kindLabel({ itemType: snippetType, language: null })).toBe('Plain Text');
    expect(kindLabel({ itemType: { name: 'command', icon: 'Terminal', color: '#f97316' }, language: null })).toBe('Terminal');
    expect(kindLabel({ itemType: { name: 'note', icon: 'StickyNote', color: '#fde047' }, language: null })).toBe('Note');
  });
});
