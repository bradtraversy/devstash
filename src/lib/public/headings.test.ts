import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { createHeadingIds, headingSlug, nodeText, rehypeHeadingIds } from './headings';

describe('headingSlug', () => {
  it('lowercases and turns spaces into hyphens', () => {
    expect(headingSlug('Add GitHub Actions')).toBe('add-github-actions');
  });

  it('drops punctuation but keeps hyphens, underscores, and digits', () => {
    expect(headingSlug('CI/CD: Deploy (v2.0) on_Render!')).toBe('cicd-deploy-v20-on_render');
    expect(headingSlug('pre-commit hooks')).toBe('pre-commit-hooks');
  });

  it('keeps letters from other scripts', () => {
    expect(headingSlug('Résumé 設定')).toBe('résumé-設定');
  });

  it('falls back to section when nothing is left', () => {
    expect(headingSlug('  ?!  ')).toBe('section');
    expect(headingSlug('')).toBe('section');
  });
});

describe('createHeadingIds', () => {
  it('suffixes repeats in order', () => {
    const id = createHeadingIds();
    expect([id('Setup'), id('Setup'), id('Other'), id('setup')]).toEqual([
      'setup',
      'setup-1',
      'other',
      'setup-2',
    ]);
  });

  it('skips a suffix a literal heading already took', () => {
    const id = createHeadingIds();
    expect([id('Setup 1'), id('Setup'), id('Setup')]).toEqual(['setup-1', 'setup', 'setup-2']);
  });

  it('prefixes every id and keeps separate blocks independent', () => {
    const first = createHeadingIds('b3-');
    const second = createHeadingIds('b4-');
    expect(first('Setup')).toBe('b3-setup');
    expect(second('Setup')).toBe('b4-setup');
  });
});

describe('nodeText', () => {
  it('reads text through nested inline elements', () => {
    const node = [
      'Run ',
      createElement('code', { key: 'a' }, 'npm ci'),
      ' with ',
      createElement('em', { key: 'b' }, createElement('strong', null, 'care')),
      2,
    ];
    expect(nodeText(node)).toBe('Run npm ci with care2');
  });

  it('ignores empty and non-text nodes', () => {
    expect(nodeText(null)).toBe('');
    expect(nodeText(undefined)).toBe('');
    expect(nodeText(true)).toBe('');
  });
});

interface TestNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: TestNode[];
}

const text = (value: string): TestNode => ({ type: 'text', value });
const element = (
  tagName: string,
  children: TestNode[],
  properties: Record<string, unknown> = {}
): TestNode => ({ type: 'element', tagName, properties, children });

describe('rehypeHeadingIds', () => {
  it('sets prefixed ids on headings in document order and leaves other elements alone', () => {
    const h2 = element('h2', [text('Run '), element('code', [text('npm ci')])]);
    const p = element('p', [text('Setup')]);
    const h3 = element('h3', [text('Run npm ci')], { className: ['x'] });
    const tree: TestNode = { type: 'root', children: [h2, p, element('section', [h3])] };

    rehypeHeadingIds('b2-')(tree);

    expect(h2.properties).toEqual({ id: 'b2-run-npm-ci' });
    expect(p.properties).toEqual({});
    expect(h3.properties).toEqual({ className: ['x'], id: 'b2-run-npm-ci-1' });
  });

  it('leaves a heading that already has an id alone', () => {
    const footnotes = element('h2', [text('Footnotes')], { className: ['sr-only'], id: 'footnote-label' });
    const after = element('h2', [text('Footnotes')]);
    rehypeHeadingIds('b3-')({ type: 'root', children: [footnotes, after] });
    expect(footnotes.properties).toEqual({ className: ['sr-only'], id: 'footnote-label' });
    expect(after.properties).toEqual({ id: 'b3-footnotes' });
  });

  it('starts numbering fresh on every run', () => {
    const plugin = rehypeHeadingIds();
    const first = element('h2', [text('Setup')]);
    const second = element('h2', [text('Setup')]);
    plugin({ type: 'root', children: [first] });
    plugin({ type: 'root', children: [second] });
    expect(first.properties).toEqual({ id: 'setup' });
    expect(second.properties).toEqual({ id: 'setup' });
  });
});
