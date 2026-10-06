import { describe, it, expect } from 'vitest';
import { readdir } from 'fs/promises';
import { LEGAL_DIR, LEGAL_PAGES, readLegalMarkdown } from './legal';

describe('LEGAL_PAGES', () => {
  it('has a markdown file for every page and no file without a page', async () => {
    const files = (await readdir(LEGAL_DIR)).filter((file) => file.endsWith('.md')).sort();
    expect(files).toEqual(Object.keys(LEGAL_PAGES).map((slug) => `${slug}.md`).sort());
  });

  it('starts every page below the h1, which the route renders from the title', async () => {
    for (const page of Object.values(LEGAL_PAGES)) {
      const markdown = await readLegalMarkdown(page.slug);
      expect(markdown.trim().length).toBeGreaterThan(0);
      expect(markdown).not.toMatch(/^# /m);
    }
  });

  it('keys every page by its own slug', () => {
    for (const [key, page] of Object.entries(LEGAL_PAGES)) expect(page.slug).toBe(key);
  });
});
