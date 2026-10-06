import { describe, it, expect } from 'vitest';
import { snippetFileChip } from './item-row-parts';

const item = (name: string, language: string | null, content: string | null = null) => ({
  itemType: { name, icon: 'Code', color: '#3b82f6' },
  language,
  content,
});

describe('snippetFileChip', () => {
  it('gives a snippet its file name and language label', () => {
    expect(snippetFileChip(item('snippet', 'yaml'))).toEqual({ fileName: '.yml', label: 'YAML' });
    expect(snippetFileChip(item('snippet', 'typescript', 'export const Card = () => <div>Hi</div>;'))).toEqual({
      fileName: '.tsx',
      label: 'TypeScript',
    });
  });

  it('gives nothing to a snippet without a language or to any other type', () => {
    expect(snippetFileChip(item('snippet', null))).toBeNull();
    expect(snippetFileChip(item('command', null))).toBeNull();
    expect(snippetFileChip(item('note', 'markdown'))).toBeNull();
    expect(snippetFileChip(item('link', null))).toBeNull();
  });
});
