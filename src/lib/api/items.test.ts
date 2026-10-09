import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ItemDetail, ItemWithType } from '@/lib/db/items';
import type { CollectionSummary } from '@/lib/db/collections';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import {
  apiBulkDeleteSchema,
  apiCreateItemSchema,
  apiItemEditSchema,
  apiListQuerySchema,
  apiPatchItemSchema,
  apiUpdateItemSchema,
  itemRefFromInput,
  mcpUpdateItemSchema,
  shareLink,
  toApiCollection,
  toApiItem,
  toApiItemSummary,
  toApiListItem,
  toCreateItemData,
  toUpdateItemData,
  type ApiCreateItemInput,
} from './items';

const NOW = new Date('2026-10-07T12:00:00Z');
const FILE_URL = 'https://pub-test.r2.dev/user-1/1700000000-notes.pdf';

const detail: ItemDetail = {
  id: 'item-1',
  title: 'useDebounce',
  description: 'Debounce a value',
  content: 'export const x = 1;',
  url: null,
  language: 'typescript',
  contentType: 'TEXT',
  fileUrl: FILE_URL,
  fileName: 'notes.pdf',
  fileSize: 1024,
  isFavorite: true,
  isPinned: false,
  visibility: 'PRIVATE',
  shortId: 'abc12345',
  itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
  tags: ['react', 'hooks'],
  collections: [{ id: 'col-1', name: 'React', visibility: 'UNLISTED' }],
  createdAt: NOW,
  updatedAt: NOW,
};

const listItem: ItemWithType = {
  id: 'item-1',
  title: 'useDebounce',
  description: 'Debounce a value',
  content: 'x'.repeat(300),
  url: null,
  language: 'typescript',
  isFavorite: false,
  isPinned: true,
  visibility: 'PUBLIC',
  shortId: 'abc12345',
  itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
  tags: ['react'],
  sharedVia: [{ id: 'col-1', name: 'React', visibility: 'UNLISTED' }],
  fileUrl: FILE_URL,
  fileName: null,
  fileSize: null,
  createdAt: NOW,
  updatedAt: NOW,
};

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://devstash.io/');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('shareLink', () => {
  it('is null while private and the full short link once shared', () => {
    expect(shareLink('abc12345', 'PRIVATE')).toBeNull();
    expect(shareLink('abc12345', 'UNLISTED')).toBe('https://devstash.io/s/abc12345');
    expect(shareLink('abc12345', 'PUBLIC')).toBe('https://devstash.io/s/abc12345');
  });
});

describe('toApiItem', () => {
  it('returns the whole item with a lowercase visibility and no link while private', () => {
    expect(toApiItem(detail)).toEqual({
      id: 'item-1',
      shortId: 'abc12345',
      type: 'snippet',
      title: 'useDebounce',
      description: 'Debounce a value',
      content: 'export const x = 1;',
      url: null,
      language: 'typescript',
      tags: ['react', 'hooks'],
      collections: [{ id: 'col-1', name: 'React', visibility: 'unlisted' }],
      visibility: 'private',
      link: null,
      isFavorite: true,
      isPinned: false,
      fileName: 'notes.pdf',
      fileSize: 1024,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it('links to the short URL once shared', () => {
    expect(toApiItem({ ...detail, visibility: 'UNLISTED' })).toMatchObject({
      visibility: 'unlisted',
      link: 'https://devstash.io/s/abc12345',
    });
    expect(toApiItem({ ...detail, visibility: 'PUBLIC' }).visibility).toBe('public');
  });

  it('never includes the R2 file URL', () => {
    const item = toApiItem({ ...detail, visibility: 'PUBLIC' });

    expect(item).not.toHaveProperty('fileUrl');
    expect(item).not.toHaveProperty('contentType');
    expect(JSON.stringify(item)).not.toContain(FILE_URL);
  });
});

describe('toApiItemSummary', () => {
  it('is the whole item without its content', () => {
    const { content, ...rest } = toApiItem(detail);
    expect(content).toBe('export const x = 1;');
    expect(toApiItemSummary(detail)).toEqual(rest);
  });
});

describe('itemRefFromInput', () => {
  it.each([
    ['abc12345', 'abc12345'],
    ['cmgh1item0000000000000001', 'cmgh1item0000000000000001'],
    ['  abc12345 ', 'abc12345'],
    ['https://devstash.io/s/abc12345', 'abc12345'],
    ['devstash.io/s/abc12345/', 'abc12345'],
    ['https://devstash.io/s/abc12345/raw', 'abc12345'],
    ['https://devstash.io/s/abc12345.png', 'abc12345'],
    ['https://devstash.io/s/abc12345?ref=x#b1', 'abc12345'],
  ])('reads %s as %s', (input, ref) => {
    expect(itemRefFromInput(input)).toBe(ref);
  });

  it('leaves anything that is not a short link as it is', () => {
    expect(itemRefFromInput('https://devstash.io/brad/react-patterns')).toBe('https://devstash.io/brad/react-patterns');
    expect(itemRefFromInput('https://devstash.io/s/abc1234')).toBe('https://devstash.io/s/abc1234');
  });
});

describe('toApiListItem', () => {
  it('carries a 200 character preview in place of the content, description, and collections', () => {
    const item = toApiListItem(listItem);

    expect(item.preview).toBe('x'.repeat(200));
    expect(item).toMatchObject({ visibility: 'public', link: 'https://devstash.io/s/abc12345', isPinned: true });
    for (const key of ['content', 'description', 'collections', 'sharedVia', 'fileUrl']) {
      expect(item).not.toHaveProperty(key);
    }
  });

  it('previews a link by its URL', () => {
    const item = toApiListItem({ ...listItem, content: null, url: 'https://example.com/docs' });

    expect(item.preview).toBe('https://example.com/docs');
  });

  it('has no preview when there is neither content nor URL', () => {
    expect(toApiListItem({ ...listItem, content: null }).preview).toBeNull();
  });
});

describe('toApiCollection', () => {
  const collection: CollectionSummary = {
    id: 'col-1',
    name: 'React',
    description: null,
    visibility: 'PRIVATE',
    shortId: 'col12345',
    itemCount: 4,
  };

  it('maps the count, visibility, and link', () => {
    expect(toApiCollection(collection)).toEqual({
      id: 'col-1',
      name: 'React',
      description: null,
      itemCount: 4,
      visibility: 'private',
      link: null,
    });
    expect(toApiCollection({ ...collection, visibility: 'PUBLIC' })).toMatchObject({
      visibility: 'public',
      link: 'https://devstash.io/s/col12345',
    });
  });
});

describe('toCreateItemData', () => {
  const SNIPPET = 'export function useDebounce<T>(value: T, delay = 300): T {\n  return value;\n}\n';

  it('detects a snippet and titles it by its declared name', () => {
    const { data } = toCreateItemData({ content: SNIPPET });

    expect(data).toMatchObject({
      typeName: 'snippet',
      title: 'useDebounce',
      description: null,
      content: SNIPPET,
      url: null,
      tags: [],
      collectionIds: [],
      visibility: 'PRIVATE',
    });
  });

  it('detects a command and strips its $ prompts', () => {
    const { data } = toCreateItemData({ content: '$ git fetch\n$ git rebase origin/main' });

    expect(data).toMatchObject({
      typeName: 'command',
      title: 'git fetch',
      content: 'git fetch\ngit rebase origin/main',
      language: null,
    });
  });

  it('makes a link from a url alone', () => {
    const { data } = toCreateItemData({ url: 'https://example.com/docs' });

    expect(data).toMatchObject({
      typeName: 'link',
      title: 'example.com/docs',
      content: null,
      url: 'https://example.com/docs',
    });
  });

  it('makes a link from content that is one URL', () => {
    const { data } = toCreateItemData({ content: '  https://example.com/docs  ' });

    expect(data).toMatchObject({ typeName: 'link', content: null, url: 'https://example.com/docs' });
  });

  it('refuses content and a url together for a link', () => {
    expect(toCreateItemData({ url: 'https://example.com', content: 'notes' }).fieldErrors).toEqual({
      content: ['A link takes a url and no content'],
    });
    expect(
      toCreateItemData({ type: 'link', url: 'https://example.com', content: 'notes' }).fieldErrors
    ).toEqual({ content: ['A link takes a url and no content'] });
  });

  it('refuses a link without a usable URL', () => {
    expect(toCreateItemData({ type: 'link' }).fieldErrors).toEqual({
      url: ['A link needs one http or https URL'],
    });
    expect(toCreateItemData({ url: 'ftp://example.com/file' }).fieldErrors).toEqual({
      url: ['A link needs one http or https URL'],
    });
    expect(toCreateItemData({ type: 'link', content: 'not a url' }).fieldErrors).toEqual({
      url: ['A link needs one http or https URL'],
    });
  });

  it('refuses a url on anything but a link', () => {
    expect(
      toCreateItemData({ type: 'snippet', content: 'const x = 1;', url: 'https://example.com' }).fieldErrors
    ).toEqual({ url: ['Only links take a url'] });
  });

  it('refuses a request with no content', () => {
    expect(toCreateItemData({}).fieldErrors).toEqual({ content: ['Send content, or a url for a link'] });
    expect(toCreateItemData({ content: '   ' }).fieldErrors).toEqual({
      content: ['Send content, or a url for a link'],
    });
    expect(toCreateItemData({ type: 'note', content: '' }).fieldErrors).toEqual({
      content: ['A note needs content'],
    });
    expect(toCreateItemData({ type: 'snippet', content: '  \n ' }).fieldErrors).toEqual({
      content: ['A snippet needs content'],
    });
  });

  it('refuses a language on a note, prompt, or link', () => {
    for (const input of [
      { type: 'note', content: '# Hello\n\nSome words here.' },
      { type: 'prompt', content: 'Explain this code to me.' },
      { type: 'link', url: 'https://example.com' },
    ] as ApiCreateItemInput[]) {
      expect(toCreateItemData({ ...input, language: 'markdown' }).fieldErrors).toEqual({
        language: ['Only snippets and commands take a language'],
      });
    }
  });

  it('lets an explicit type, title, and language win over the guess', () => {
    const { data } = toCreateItemData({
      content: SNIPPET,
      type: 'snippet',
      title: 'Mine',
      language: 'javascript',
      description: 'Waits a bit',
    });

    expect(data).toMatchObject({
      typeName: 'snippet',
      title: 'Mine',
      language: 'javascript',
      description: 'Waits a bit',
      content: SNIPPET,
    });

    expect(toCreateItemData({ content: 'git status', type: 'snippet' }).data).toMatchObject({
      typeName: 'snippet',
      content: 'git status',
    });
    expect(toCreateItemData({ content: '$ ls -la', language: 'bash' }).data).toMatchObject({
      typeName: 'command',
      content: 'ls -la',
      language: 'bash',
    });
  });

  it('dedupes tags and collection ids and maps the visibility', () => {
    const { data } = toCreateItemData({
      content: SNIPPET,
      tags: ['react', 'hooks', 'react'],
      collectionIds: ['col-1', 'col-2', 'col-1'],
      visibility: 'unlisted',
    });

    expect(data?.tags).toEqual(['react', 'hooks']);
    expect(data?.collectionIds).toEqual(['col-1', 'col-2']);
    expect(data?.visibility).toBe('UNLISTED');
    expect(toCreateItemData({ content: SNIPPET, visibility: 'public' }).data?.visibility).toBe('PUBLIC');
  });

  it('stores an empty description as null', () => {
    expect(toCreateItemData({ content: SNIPPET, description: '' }).data?.description).toBeNull();
  });
});

describe('apiCreateItemSchema', () => {
  it('accepts a full body', () => {
    const result = apiCreateItemSchema.safeParse({
      content: 'const x = 1;',
      type: 'snippet',
      title: ' Example ',
      language: 'typescript',
      description: 'd',
      tags: ['a'],
      collectionIds: ['col-1'],
      visibility: 'public',
    });

    expect(result.success).toBe(true);
    expect(result.data?.title).toBe('Example');
  });

  it('rejects unknown keys', () => {
    const result = apiCreateItemSchema.safeParse({ content: 'x', color: 'red' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ code: 'unrecognized_keys', keys: ['color'] });
  });

  it('rejects file and image types', () => {
    for (const type of ['file', 'image']) {
      const result = apiCreateItemSchema.safeParse({ content: 'x', type });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toEqual(['type']);
    }
  });

  it('rejects a language the editor does not know', () => {
    const result = apiCreateItemSchema.safeParse({ content: 'x', language: 'klingon' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['language']);
  });

  it('rejects an unknown visibility and too many tags', () => {
    expect(apiCreateItemSchema.safeParse({ content: 'x', visibility: 'everyone' }).success).toBe(false);
    expect(
      apiCreateItemSchema.safeParse({ content: 'x', tags: Array.from({ length: 21 }, (_, i) => `t${i}`) }).success
    ).toBe(false);
  });
});

describe('apiListQuerySchema', () => {
  it('defaults to page 1 and limit 20', () => {
    expect(apiListQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it('coerces query string numbers', () => {
    expect(apiListQuerySchema.parse({ q: ' docker ', type: 'command', page: '2', limit: '100' })).toEqual({
      q: 'docker',
      type: 'command',
      page: 2,
      limit: 100,
    });
  });

  it('rejects a limit of 0 or 101 and an unknown type', () => {
    expect(apiListQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
    expect(apiListQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(apiListQuerySchema.safeParse({ type: 'video' }).success).toBe(false);
    expect(apiListQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });
});

describe('apiUpdateItemSchema', () => {
  it('takes only a visibility', () => {
    expect(apiUpdateItemSchema.safeParse({ visibility: 'unlisted' }).success).toBe(true);
    expect(apiUpdateItemSchema.safeParse({ visibility: 'unlisted', title: 'x' }).success).toBe(false);
    expect(apiUpdateItemSchema.safeParse({}).success).toBe(false);
  });
});

describe('apiItemEditSchema', () => {
  it('accepts one or more partial edit fields', () => {
    expect(apiItemEditSchema.parse({ title: ' Renamed ' })).toEqual({ title: 'Renamed' });
    expect(apiItemEditSchema.parse({ description: null, tags: [], collectionIds: [] })).toEqual({
      description: null,
      tags: [],
      collectionIds: [],
    });
  });

  it('requires an edit and rejects unknown keys', () => {
    expect(apiItemEditSchema.safeParse({}).success).toBe(false);
    expect(apiItemEditSchema.safeParse({ title: 'Renamed', color: 'blue' }).success).toBe(false);
  });
});

describe('apiPatchItemSchema', () => {
  it('accepts either visibility or partial item fields', () => {
    expect(apiPatchItemSchema.parse({ visibility: 'unlisted' })).toEqual({ visibility: 'unlisted' });
    expect(apiPatchItemSchema.parse({ title: 'Renamed' })).toEqual({ title: 'Renamed' });
  });

  it('rejects mixed, empty, and unknown-key bodies', () => {
    expect(apiPatchItemSchema.safeParse({ visibility: 'public', title: 'Renamed' }).success).toBe(false);
    expect(apiPatchItemSchema.safeParse({}).success).toBe(false);
    expect(apiPatchItemSchema.safeParse({ title: 'Renamed', color: 'blue' }).success).toBe(false);
  });
});

describe('mcpUpdateItemSchema', () => {
  it('accepts partial edits and preserves null and empty array values', () => {
    expect(
      mcpUpdateItemSchema.parse({ id: 'abc12345', description: null, tags: [], collectionIds: [] })
    ).toEqual({ id: 'abc12345', description: null, tags: [], collectionIds: [] });
  });

  it('requires at least one edit field', () => {
    expect(mcpUpdateItemSchema.safeParse({ id: 'abc12345' }).success).toBe(false);
  });

  it('enforces every editable field limit and rejects unsafe values', () => {
    const invalid = [
      { title: 'x'.repeat(201) },
      { description: 'x'.repeat(2001) },
      { content: 'x'.repeat(500_001) },
      { url: `https://example.com/${'x'.repeat(2049)}` },
      { url: 'javascript:alert(1)' },
      { language: 'klingon' },
      { tags: Array.from({ length: 21 }, (_, i) => `tag-${i}`) },
      { tags: ['x'.repeat(51)] },
      { collectionIds: Array.from({ length: 21 }, (_, i) => `col-${i}`) },
    ];

    for (const edit of invalid) {
      expect(mcpUpdateItemSchema.safeParse({ id: 'abc12345', ...edit }).success).toBe(false);
    }
    expect(mcpUpdateItemSchema.safeParse({ id: 'abc12345', title: '   ' }).success).toBe(false);
  });
});

describe('toUpdateItemData', () => {
  it('merges a title-only edit without changing omitted fields', () => {
    expect(toUpdateItemData(detail, mcpUpdateItemSchema.parse({ id: 'item-1', title: 'Renamed' })).data).toEqual({
      title: 'Renamed',
      description: detail.description,
      content: detail.content,
      url: detail.url,
      language: detail.language,
      tags: detail.tags,
      collectionIds: undefined,
    });
  });

  it('keeps null, empty arrays, and omission distinct', () => {
    expect(
      toUpdateItemData(
        detail,
        mcpUpdateItemSchema.parse({ id: 'item-1', description: null, tags: [], collectionIds: [] })
      ).data
    ).toMatchObject({
      description: null,
      content: detail.content,
      tags: [],
      collectionIds: [],
    });
  });

  it('rejects invalid link and text shapes after merging', () => {
    const link = { ...detail, contentType: 'URL' as const, content: null, url: 'https://example.com', language: null };
    expect(
      toUpdateItemData(link, mcpUpdateItemSchema.parse({ id: 'item-1', content: 'not allowed' })).fieldErrors
    ).toEqual({ content: ['A link takes a url and no content'] });
    expect(toUpdateItemData(link, mcpUpdateItemSchema.parse({ id: 'item-1', url: null })).fieldErrors).toEqual({
      url: ['A link needs one http or https URL'],
    });
    expect(toUpdateItemData(detail, mcpUpdateItemSchema.parse({ id: 'item-1', url: 'https://example.com' })).fieldErrors)
      .toEqual({ url: ['Only links take a url'] });
    expect(toUpdateItemData(detail, mcpUpdateItemSchema.parse({ id: 'item-1', content: null })).fieldErrors).toEqual({
      content: ['A snippet needs content'],
    });
  });

  it('allows language only on snippets and commands', () => {
    const note = { ...detail, itemType: { ...detail.itemType, name: 'note' } };
    expect(toUpdateItemData(note, mcpUpdateItemSchema.parse({ id: 'item-1', language: 'markdown' })).fieldErrors)
      .toEqual({ language: ['Only snippets and commands take a language'] });
  });

  it('allows metadata-only edits for file and image items', () => {
    const file = {
      ...detail,
      contentType: 'FILE' as const,
      content: null,
      language: null,
      itemType: { ...detail.itemType, name: 'file' },
    };
    expect(toUpdateItemData(file, mcpUpdateItemSchema.parse({ id: 'item-1', title: 'Notes' })).data)
      .toMatchObject({ title: 'Notes', content: null });
    expect(toUpdateItemData(file, mcpUpdateItemSchema.parse({ id: 'item-1', content: null })).fieldErrors)
      .toEqual({ content: ['File and image items only support metadata edits'] });
  });
});

describe('apiBulkDeleteSchema', () => {
  it('takes 1 to 100 ids', () => {
    expect(apiBulkDeleteSchema.safeParse({ ids: ['a'] }).success).toBe(true);
    expect(apiBulkDeleteSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(apiBulkDeleteSchema.safeParse({ ids: Array.from({ length: 101 }, (_, i) => `id-${i}`) }).success).toBe(
      false
    );
    expect(apiBulkDeleteSchema.safeParse({ ids: ['a'], force: true }).success).toBe(false);
  });
});
