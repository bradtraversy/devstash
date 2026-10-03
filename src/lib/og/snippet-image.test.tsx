import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { HighlightedToken } from '@/lib/public/highlight';
import { IMAGE_MAX_LINE_CHARS, IMAGE_MAX_WIDTH, IMAGE_MIN_WIDTH } from './constants';
import { SnippetImage, snippetImageSize, type SnippetImageItem } from './snippet-image';

function line(text: string): HighlightedToken[] {
  return [{ content: text, color: '#d4d4d4' }];
}

const item: SnippetImageItem = {
  title: 'useAuth Hook',
  language: 'typescript',
  itemType: { name: 'snippet', color: '#3b82f6' },
  shortId: 'k3j9x2ab',
  handle: 'brad',
  shared: true,
};

describe('snippetImageSize', () => {
  it('never goes below the card width and grows 33px per line', () => {
    const one = snippetImageSize([line('short')], 0);
    const three = snippetImageSize([line('a'), line('b'), line('c')], 0);

    expect(one.width).toBe(IMAGE_MIN_WIDTH);
    expect(three.width).toBe(IMAGE_MIN_WIDTH);
    expect(three.height - one.height).toBe(66);
  });

  it('widens for long lines up to the maximum', () => {
    const wide = snippetImageSize([line('x'.repeat(120))], 0);
    const widest = snippetImageSize([line('x'.repeat(400))], 0);

    expect(wide.width).toBeGreaterThan(IMAGE_MIN_WIDTH);
    expect(wide.width).toBeLessThan(IMAGE_MAX_WIDTH);
    expect(widest.width).toBe(IMAGE_MAX_WIDTH);
  });

  it('fits a line at the character cap without clamping to the maximum width', () => {
    const atCap = snippetImageSize([line('x'.repeat(IMAGE_MAX_LINE_CHARS))], 0);
    const belowCap = snippetImageSize([line('x'.repeat(IMAGE_MAX_LINE_CHARS - 1))], 0);

    expect(atCap.width).toBe(Math.ceil(IMAGE_MAX_LINE_CHARS * 13.2 + 146));
    expect(atCap.width).toBeLessThanOrEqual(IMAGE_MAX_WIDTH);
    expect(belowCap.width).toBeLessThan(atCap.width);
  });

  it('matches the frame exactly: 274px of chrome plus 33px per row', () => {
    expect(snippetImageSize([line('a')], 0).height).toBe(274 + 33);
    expect(snippetImageSize([line('a'), line('b')], 5).height).toBe(274 + 33 * 3);
  });

  it('counts wide characters as two cells when measuring width', () => {
    const cjk = snippetImageSize([line('日'.repeat(60))], 0);
    const ascii = snippetImageSize([line('x'.repeat(120))], 0);

    expect(cjk.width).toBe(ascii.width);
    expect(cjk.width).toBeGreaterThan(IMAGE_MIN_WIDTH);
  });

  it('measures a line across all of its tokens', () => {
    const split = snippetImageSize([[{ content: 'x'.repeat(60), color: '#fff' }, { content: 'y'.repeat(60), color: '#fff' }]], 0);
    const whole = snippetImageSize([line('x'.repeat(120))], 0);

    expect(split.width).toBe(whole.width);
  });

  it('adds one row for the hidden-lines note and keeps one row for empty content', () => {
    const plain = snippetImageSize([line('a')], 0);
    const cut = snippetImageSize([line('a')], 12);
    const empty = snippetImageSize([], 0);

    expect(cut.height - plain.height).toBe(33);
    expect(empty.height).toBe(plain.height);
    expect(Number.isInteger(cut.height) && Number.isInteger(cut.width)).toBe(true);
  });
});

describe('SnippetImage', () => {
  it('shows the title, kind, every line, the handle, and the short link when shared', () => {
    const html = renderToStaticMarkup(
      <SnippetImage item={item} lines={[line('const a = 1;'), line('return a;')]} hidden={0} />
    );

    expect(html).toContain('useAuth Hook');
    expect(html).toContain('TypeScript');
    expect(html).toContain('const a = 1;');
    expect(html).toContain('return a;');
    expect(html).toContain('@brad');
    expect(html).toContain('devstash.io/s/k3j9x2ab');
    expect(html).not.toContain('more lines');
  });

  it('drops the short link for a private item and falls back when the owner has no handle', () => {
    const html = renderToStaticMarkup(
      <SnippetImage item={{ ...item, shared: false, handle: null }} lines={[line('x')]} hidden={0} />
    );

    expect(html).not.toContain('/s/k3j9x2ab');
    expect(html).toContain('devstash.io');
    expect(html).toContain('DevStash');
    expect(html).not.toContain('@brad');
  });

  it('says how many lines were left out and marks empty content', () => {
    expect(renderToStaticMarkup(<SnippetImage item={item} lines={[line('x')]} hidden={42} />)).toContain(
      '+ 42 more lines'
    );
    expect(renderToStaticMarkup(<SnippetImage item={item} lines={[]} hidden={0} />)).toContain('(empty)');
  });
});
