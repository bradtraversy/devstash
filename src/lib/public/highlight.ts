import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { shikiLanguage } from '@/lib/languages';

export const HIGHLIGHT_THEME = 'dark-plus';

// Listed by literal path so the bundler splits each grammar into its own chunk and loads none until asked.
export const GRAMMAR_LOADERS = {
  javascript: () => import('@shikijs/langs/javascript'),
  typescript: () => import('@shikijs/langs/typescript'),
  python: () => import('@shikijs/langs/python'),
  html: () => import('@shikijs/langs/html'),
  css: () => import('@shikijs/langs/css'),
  json: () => import('@shikijs/langs/json'),
  markdown: () => import('@shikijs/langs/markdown'),
  bash: () => import('@shikijs/langs/bash'),
  sql: () => import('@shikijs/langs/sql'),
  java: () => import('@shikijs/langs/java'),
  csharp: () => import('@shikijs/langs/csharp'),
  cpp: () => import('@shikijs/langs/cpp'),
  c: () => import('@shikijs/langs/c'),
  go: () => import('@shikijs/langs/go'),
  rust: () => import('@shikijs/langs/rust'),
  ruby: () => import('@shikijs/langs/ruby'),
  php: () => import('@shikijs/langs/php'),
  swift: () => import('@shikijs/langs/swift'),
  kotlin: () => import('@shikijs/langs/kotlin'),
  dart: () => import('@shikijs/langs/dart'),
  yaml: () => import('@shikijs/langs/yaml'),
  xml: () => import('@shikijs/langs/xml'),
  graphql: () => import('@shikijs/langs/graphql'),
  dockerfile: () => import('@shikijs/langs/dockerfile'),
  scss: () => import('@shikijs/langs/scss'),
  less: () => import('@shikijs/langs/less'),
  lua: () => import('@shikijs/langs/lua'),
  perl: () => import('@shikijs/langs/perl'),
  r: () => import('@shikijs/langs/r'),
  powershell: () => import('@shikijs/langs/powershell'),
} as const;

type Grammar = keyof typeof GRAMMAR_LOADERS;

let highlighterPromise: Promise<HighlighterCore> | null = null;
const grammarLoads = new Map<string, Promise<void>>();

function getHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    themes: [import('@shikijs/themes/dark-plus')],
    langs: [],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  }).catch((error: unknown) => {
    highlighterPromise = null;
    throw error;
  });
  return highlighterPromise;
}

async function ensureGrammar(highlighter: HighlighterCore, grammar: Grammar): Promise<void> {
  if (highlighter.getLoadedLanguages().includes(grammar)) return;

  let pending = grammarLoads.get(grammar);
  if (!pending) {
    pending = highlighter
      .loadLanguage(GRAMMAR_LOADERS[grammar]())
      .finally(() => grammarLoads.delete(grammar));
    grammarLoads.set(grammar, pending);
  }
  await pending;
}

/** HTML for one code block. Unknown, missing, and plaintext languages render as text through the same pipeline. */
export async function highlightCode(
  code: string,
  languageId: string | null | undefined
): Promise<string> {
  const highlighter = await getHighlighter();
  const grammar = shikiLanguage(languageId);
  const lang = grammar && grammar in GRAMMAR_LOADERS ? (grammar as Grammar) : null;

  if (lang) {
    await ensureGrammar(highlighter, lang);
  }

  return highlighter.codeToHtml(code, { lang: lang ?? 'text', theme: HIGHLIGHT_THEME });
}
