import { describe, it, expect } from 'vitest';
import { readdir } from 'fs/promises';
import { DOC_PAGES, DOCS_DIR, docNeighbors, getDocPage, readDocMarkdown } from './docs';

describe('DOC_PAGES', () => {
  it('has unique kebab-case slugs', () => {
    const slugs = DOC_PAGES.map((page) => page.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('has a markdown file for every page and no file without a page', async () => {
    const files = (await readdir(DOCS_DIR)).filter((file) => file.endsWith('.md')).sort();
    expect(files).toEqual(DOC_PAGES.map((page) => `${page.slug}.md`).sort());
  });

  it('starts every page below the h1, which the route renders from the title', async () => {
    for (const page of DOC_PAGES) {
      const markdown = await readDocMarkdown(page.slug);
      expect(markdown.trim().length).toBeGreaterThan(0);
      expect(markdown).not.toMatch(/^# /m);
    }
  });

  it('links only to docs pages that exist', async () => {
    const slugs = new Set(DOC_PAGES.map((page) => page.slug));
    for (const page of DOC_PAGES) {
      const markdown = await readDocMarkdown(page.slug);
      for (const match of markdown.matchAll(/\]\(\/docs\/([^)#\s]+)/g)) {
        expect(slugs, `${page.slug} links to /docs/${match[1]}`).toContain(match[1]);
      }
    }
  });
});

describe('getDocPage', () => {
  it('finds a page by slug and returns null for an unknown one', () => {
    expect(getDocPage('sharing')?.title).toBe('Sharing and links');
    expect(getDocPage('nope')).toBeNull();
  });
});

describe('docNeighbors', () => {
  it('returns the pages either side in manifest order', () => {
    const first = DOC_PAGES[0].slug;
    const last = DOC_PAGES[DOC_PAGES.length - 1].slug;
    expect(docNeighbors(first)).toEqual({ previous: null, next: DOC_PAGES[1] });
    expect(docNeighbors(last)).toEqual({ previous: DOC_PAGES[DOC_PAGES.length - 2], next: null });
    expect(docNeighbors(DOC_PAGES[2].slug)).toEqual({ previous: DOC_PAGES[1], next: DOC_PAGES[3] });
  });

  it('returns no neighbors for an unknown slug', () => {
    expect(docNeighbors('nope')).toEqual({ previous: null, next: null });
  });
});
