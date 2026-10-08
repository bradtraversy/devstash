import { readFile } from 'fs/promises';
import path from 'path';

export interface DocPage {
  slug: string;
  title: string;
  description: string;
}

export const DOC_PAGES: DocPage[] = [
  {
    slug: 'getting-started',
    title: 'Getting started',
    description: 'Save your first items from the paste box, find them again, and the keyboard shortcuts.',
  },
  {
    slug: 'sharing',
    title: 'Sharing and links',
    description: 'Private, unlisted, and public, the link formats every shared item gets, and Save to your stash.',
  },
  {
    slug: 'notes-as-pages',
    title: 'Notes as pages',
    description: 'Paste a whole markdown doc or gist and share it as one page with Copy on every code block.',
  },
  {
    slug: 'collections',
    title: 'Collections',
    description: 'Group items into an ordered collection and publish it at a readable URL.',
  },
  {
    slug: 'ai-helpers',
    title: 'AI helpers',
    description: 'Suggested tags, generated descriptions, code explanations, and prompt optimizing.',
  },
  {
    slug: 'import-export',
    title: 'Import and export',
    description: 'Download your stash as JSON or markdown and bring a JSON export back in.',
  },
  {
    slug: 'api',
    title: 'API',
    description: 'Create a token and save, search, share, and delete items from scripts and AI tools.',
  },
  {
    slug: 'mcp',
    title: 'MCP server',
    description: 'Connect Claude Code, Cursor, and other AI tools to your stash with nothing to install.',
  },
];

export const DOCS_DIR = path.join(process.cwd(), 'src/content/docs');

export function getDocPage(slug: string): DocPage | null {
  return DOC_PAGES.find((page) => page.slug === slug) ?? null;
}

/** The pages either side of a page in reading order. */
export function docNeighbors(slug: string): { previous: DocPage | null; next: DocPage | null } {
  const index = DOC_PAGES.findIndex((page) => page.slug === slug);
  return {
    previous: index > 0 ? DOC_PAGES[index - 1] : null,
    next: index >= 0 && index < DOC_PAGES.length - 1 ? DOC_PAGES[index + 1] : null,
  };
}

export function readDocMarkdown(slug: string): Promise<string> {
  return readFile(path.join(DOCS_DIR, `${slug}.md`), 'utf8');
}
