import { describe, it, expect } from 'vitest';
import type { PublicCollection, PublicItem } from '@/lib/db/public';
import { collectionToMarkdown } from './markdown';

const NOW = new Date('2026-09-28T12:00:00Z');

function item(overrides: Partial<PublicItem> & { itemType: PublicItem['itemType'] }): PublicItem {
  return {
    id: 'item',
    title: 'Untitled',
    description: null,
    content: null,
    url: null,
    language: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    ...overrides,
  };
}

const snippet = { name: 'snippet', icon: 'Code', color: '#3b82f6' };
const command = { name: 'command', icon: 'Terminal', color: '#f97316' };
const note = { name: 'note', icon: 'StickyNote', color: '#fde047' };
const link = { name: 'link', icon: 'Link', color: '#10b981' };
const image = { name: 'image', icon: 'Image', color: '#ec4899' };
const file = { name: 'file', icon: 'File', color: '#6b7280' };

function collection(items: PublicItem[], overrides: Partial<PublicCollection> = {}): PublicCollection {
  return {
    id: 'col-1',
    name: 'React Hooks',
    description: 'Hooks I reuse',
    slug: 'react-hooks',
    shortId: 'abc12345',
    visibility: 'PUBLIC',
    publishedAt: NOW,
    updatedAt: NOW,
    handle: 'brad',
    itemCount: items.length,
    items,
    ...overrides,
  };
}

const URL = 'https://devstash.io/brad/react-hooks';

describe('collectionToMarkdown', () => {
  it('renders the header and one section per item in order', () => {
    const md = collectionToMarkdown(
      collection([
        item({ title: 'useAuth', content: 'export function useAuth() {}', language: 'typescript', itemType: snippet, description: 'Auth hook' }),
        item({ title: 'Install', content: '$ npm install', itemType: command }),
        item({ title: 'Notes', content: 'Some **markdown**.', itemType: note }),
        item({ title: 'Docs', url: 'https://react.dev', itemType: link }),
        item({ title: 'Diagram', fileUrl: 'https://pub.r2.dev/u/1-d.png', itemType: image }),
        item({ title: 'Slides', fileName: 'slides.pdf', fileSize: 2048, itemType: file }),
      ]),
      URL
    );

    expect(md).toBe(
      [
        '# React Hooks',
        '',
        'Hooks I reuse',
        '',
        'by @brad',
        '',
        `Source: ${URL}`,
        '',
        '## useAuth',
        '',
        'Auth hook',
        '',
        '```typescript title="useAuth"',
        'export function useAuth() {}',
        '```',
        '',
        '## Install',
        '',
        '```bash title="Install"',
        '$ npm install',
        '```',
        '',
        '## Notes',
        '',
        'Some **markdown**.',
        '',
        '## Docs',
        '',
        '[Docs](https://react.dev)',
        '',
        '## Diagram',
        '',
        '![Diagram](https://pub.r2.dev/u/1-d.png)',
        '',
        '## Slides',
        '',
        'slides.pdf (2 KB)',
        '',
      ].join('\n')
    );
  });

  it('omits a missing description and ends with one newline', () => {
    const md = collectionToMarkdown(collection([], { description: null }), URL);

    expect(md).toBe(`# React Hooks\n\nby @brad\n\nSource: ${URL}\n`);
  });

  it('grows the fence past backtick runs in the content', () => {
    const md = collectionToMarkdown(
      collection([item({ title: 'Readme', content: 'Use ```js\ncode\n``` here', language: 'markdown', itemType: snippet })]),
      URL
    );

    expect(md).toContain('````markdown title="Readme"\nUse ```js\ncode\n``` here\n````');
  });

  it('escapes quotes and backslashes in fence titles', () => {
    const md = collectionToMarkdown(
      collection([item({ title: 'Say "hi" \\ bye', content: 'x', language: 'python', itemType: snippet })]),
      URL
    );

    expect(md).toContain('```python title="Say \\"hi\\" \\\\ bye"');
  });

  it('falls back to a text fence for unknown or missing languages', () => {
    const md = collectionToMarkdown(
      collection([
        item({ title: 'A', content: 'a', language: 'brainfuck', itemType: snippet }),
        item({ title: 'B', content: 'b', language: null, itemType: snippet }),
      ]),
      URL
    );

    expect(md).toContain('```text title="A"');
    expect(md).toContain('```text title="B"');
  });

  it('uses the title for a file without a name and never links it', () => {
    const md = collectionToMarkdown(collection([item({ title: 'Slides', itemType: file })]), URL);

    expect(md).toContain('## Slides\n\nSlides\n');
    expect(md).not.toContain('](');
  });
});
