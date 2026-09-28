import { LANGUAGES } from '@/lib/constants/editor';

/**
 * Shiki grammar for each id in LANGUAGES. plaintext has no grammar and renders
 * through Shiki's built-in text language, as does any id missing here.
 */
export const SHIKI_LANGUAGES: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  html: 'html',
  css: 'css',
  json: 'json',
  markdown: 'markdown',
  bash: 'bash',
  sql: 'sql',
  java: 'java',
  csharp: 'csharp',
  cpp: 'cpp',
  c: 'c',
  go: 'go',
  rust: 'rust',
  ruby: 'ruby',
  php: 'php',
  swift: 'swift',
  kotlin: 'kotlin',
  dart: 'dart',
  yaml: 'yaml',
  xml: 'xml',
  graphql: 'graphql',
  dockerfile: 'dockerfile',
  scss: 'scss',
  less: 'less',
  lua: 'lua',
  perl: 'perl',
  r: 'r',
  powershell: 'powershell',
};

export const COMMAND_LANGUAGE = 'bash';

export const PLAIN_TEXT_LABEL = 'Plain Text';

/** Common markdown fence names that differ from the editor's language ids. */
export const FENCE_LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  shellscript: 'bash',
  zsh: 'bash',
  console: 'bash',
  yml: 'yaml',
  md: 'markdown',
  rb: 'ruby',
  rs: 'rust',
  kt: 'kotlin',
  cs: 'csharp',
  'c++': 'cpp',
  golang: 'go',
  docker: 'dockerfile',
  ps1: 'powershell',
  pwsh: 'powershell',
  jsonc: 'json',
  json5: 'json',
  htm: 'html',
  text: 'plaintext',
  txt: 'plaintext',
  plain: 'plaintext',
};

/** Shiki grammar id for an item language, or null when it should render as plain text. */
export function shikiLanguage(languageId: string | null | undefined): string | null {
  if (!languageId) return null;
  return SHIKI_LANGUAGES[languageId.toLowerCase()] ?? null;
}

/** Shiki grammar id for a markdown fence info string such as `js` or `Python`, or null for plain text. */
export function fenceLanguage(info: string | null | undefined): string | null {
  if (!info) return null;
  const name = info.trim().toLowerCase().split(/\s+/)[0] ?? '';
  return shikiLanguage(FENCE_LANGUAGE_ALIASES[name] ?? name);
}

/** Display label for an item language: the LANGUAGES label, the raw id for unknown ids. */
export function languageLabel(languageId: string | null | undefined): string {
  if (!languageId) return PLAIN_TEXT_LABEL;
  return LANGUAGES.find((language) => language.value === languageId)?.label ?? languageId;
}
