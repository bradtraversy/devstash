import { readFile } from 'fs/promises';
import path from 'path';

export interface LegalPage {
  slug: 'privacy' | 'terms';
  title: string;
  description: string;
  updated: string;
}

export const LEGAL_PAGES: Record<LegalPage['slug'], LegalPage> = {
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    description: 'What DevStash collects, why, which services process it, and what you can do about it.',
    updated: 'October 7, 2026',
  },
  terms: {
    slug: 'terms',
    title: 'Terms of Service',
    description: 'The terms for using DevStash: your account, your content, acceptable use, and the service.',
    updated: 'October 6, 2026',
  },
};

export const LEGAL_DIR = path.join(process.cwd(), 'src/content/legal');

export function readLegalMarkdown(slug: LegalPage['slug']): Promise<string> {
  return readFile(path.join(LEGAL_DIR, `${slug}.md`), 'utf8');
}
