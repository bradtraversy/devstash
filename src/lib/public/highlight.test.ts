import { describe, it, expect } from 'vitest';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { SHIKI_LANGUAGES } from '@/lib/languages';
import { GRAMMAR_LOADERS, HIGHLIGHT_THEME, highlightCode } from './highlight';

describe('GRAMMAR_LOADERS', () => {
  it('has one loader per Shiki grammar in the registry', () => {
    const grammars = Array.from(new Set(Object.values(SHIKI_LANGUAGES))).sort();
    expect(Object.keys(GRAMMAR_LOADERS).sort()).toEqual(grammars);
  });

  // Production uses the forgiving engine so one bad pattern degrades a block instead of failing the page;
  // the strict engine here fails loudly when a grammar stops being JavaScript-compatible.
  it('every grammar compiles under the strict JavaScript regex engine', async () => {
    const highlighter = await createHighlighterCore({
      themes: [import('@shikijs/themes/dark-plus')],
      langs: Object.values(GRAMMAR_LOADERS).map((load) => load()),
      engine: createJavaScriptRegexEngine(),
    });

    for (const grammar of Object.keys(GRAMMAR_LOADERS)) {
      expect(() => highlighter.codeToHtml('x = 1', { lang: grammar, theme: HIGHLIGHT_THEME })).not.toThrow();
    }
  }, 60_000);
});

describe('highlightCode', () => {
  it('highlights every registry language with the JavaScript engine', async () => {
    for (const id of Object.keys(SHIKI_LANGUAGES)) {
      const html = await highlightCode('x = 1', id);
      expect(html, id).toContain('<pre class="shiki dark-plus"');
      expect(html, id).toContain('x');
    }
  }, 60_000);

  it('renders unknown and missing languages as plain text', async () => {
    const unknown = await highlightCode('hello', 'brainfuck');
    const missing = await highlightCode('hello', null);
    const plain = await highlightCode('hello', 'plaintext');

    for (const html of [unknown, missing, plain]) {
      expect(html).toContain('<pre class="shiki dark-plus"');
      expect(html).toContain('hello');
      expect(html).not.toContain('style="color');
    }
  });

  it('escapes markup inside the code', async () => {
    const html = await highlightCode('<script>alert(1)</script>', 'html');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('</script>');
    expect(html).toContain('&#x3C;');
  });

  it('preserves leading whitespace', async () => {
    const html = await highlightCode('    indented', 'typescript');
    expect(html).toContain('    indented');
  });
});
