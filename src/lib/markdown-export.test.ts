import { describe, it, expect } from 'vitest';
import type { MarkdownExport, MarkdownExportItem } from '@/lib/db/export';
import { stashToMarkdown } from './markdown-export';

const NOW = new Date('2026-09-29T12:00:00Z');

function item(type: string, title: string, overrides: Partial<MarkdownExportItem> = {}): MarkdownExportItem {
  return {
    id: title.toLowerCase(),
    title,
    description: null,
    content: null,
    url: null,
    language: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    itemType: { name: type },
    tags: [],
    ...overrides,
  };
}

function stash(overrides: Partial<MarkdownExport> = {}): MarkdownExport {
  return { exportedAt: NOW, itemCount: 0, collections: [], uncollected: [], ...overrides };
}

const review = item('prompt', 'Review', { content: 'Review this **code**.', tags: ['ai'] });

describe('stashToMarkdown', () => {
  it('renders the header, every collection in order, then the uncollected items by type', () => {
    const md = stashToMarkdown(
      stash({
        itemCount: 7,
        collections: [
          { name: 'AI Workflows', description: null, items: [review] },
          {
            name: 'React Hooks',
            description: 'Hooks I reuse',
            items: [
              item('snippet', 'useAuth', { content: 'export function useAuth() {}', language: 'typescript' }),
              item('command', 'Install', { content: '$ npm install' }),
              review,
            ],
          },
        ],
        uncollected: [
          item('snippet', 'Debounce', { content: 'const d = 1', language: 'javascript' }),
          item('snippet', 'Retry', { content: 'x = 1', language: 'python' }),
          item('note', 'Ideas', { content: 'Ship it.' }),
          item('link', 'Docs', { url: 'https://react.dev' }),
        ],
      })
    );

    expect(md).toBe(
      [
        '# DevStash export',
        '',
        'Exported September 29, 2026. 7 items, 2 collections.',
        '',
        '## AI Workflows',
        '',
        '### Review',
        '',
        'Tags: ai',
        '',
        'Review this **code**.',
        '',
        '## React Hooks',
        '',
        'Hooks I reuse',
        '',
        '### useAuth',
        '',
        '```typescript title="useAuth"',
        'export function useAuth() {}',
        '```',
        '',
        '### Install',
        '',
        '```bash title="Install"',
        '$ npm install',
        '```',
        '',
        '### Review',
        '',
        'Tags: ai',
        '',
        'Review this **code**.',
        '',
        '## Snippets not in a collection',
        '',
        '### Debounce',
        '',
        '```javascript title="Debounce"',
        'const d = 1',
        '```',
        '',
        '### Retry',
        '',
        '```python title="Retry"',
        'x = 1',
        '```',
        '',
        '## Notes not in a collection',
        '',
        '### Ideas',
        '',
        'Ship it.',
        '',
        '## Links not in a collection',
        '',
        '### Docs',
        '',
        '[Docs](https://react.dev)',
        '',
      ].join('\n')
    );
  });

  it('renders only the header for an empty stash', () => {
    expect(stashToMarkdown(stash())).toBe('# DevStash export\n\nExported September 29, 2026. 0 items, 0 collections.\n');
  });

  it('keeps a heading and description for a collection with no items', () => {
    const md = stashToMarkdown(
      stash({ collections: [{ name: 'Empty', description: 'Nothing yet', items: [] }, { name: 'Bare', description: null, items: [] }] })
    );

    expect(md).toContain('\n\n## Empty\n\nNothing yet\n\n## Bare\n');
  });

  it('labels an unknown type by capitalising its name', () => {
    const md = stashToMarkdown(stash({ uncollected: [item('recipe', 'Soup', { content: 'Boil.' })] }));

    expect(md).toContain('## Recipes not in a collection\n\n### Soup\n\nBoil.\n');
  });

  it('ends with exactly one newline', () => {
    const md = stashToMarkdown(stash({ uncollected: [item('note', 'Trailing', { content: 'text\n\n' })] }));

    expect(md.endsWith('\n')).toBe(true);
    expect(md.endsWith('\n\n')).toBe(false);
  });
});
