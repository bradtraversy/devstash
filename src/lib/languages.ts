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

const GUESS_SAMPLE_LENGTH = 2000;

type GuessRule = { id: string; test: (sample: string, content: string) => boolean };

function isJsonDocument(content: string): boolean {
  const trimmed = content.trim();
  if (!/^[[{]/.test(trimmed)) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

function looksLikeYaml(sample: string): boolean {
  if (/[{};]/.test(sample)) return false;
  const lines = sample.split('\n');
  if (/^---\s*$/.test(lines[0] ?? '')) return true;
  return lines.filter((line) => /^\s*[\w.-]+:(\s|$)/.test(line)).length >= 3;
}

function looksLikeDockerfile(sample: string): boolean {
  const first = sample.split('\n').find((line) => line.trim() !== '') ?? '';
  return /^FROM\s+\S/.test(first) && /^RUN\s/m.test(sample);
}

// Ordered so the specific rules win: TypeScript before JavaScript, SCSS before CSS, Go and Rust
// before the JavaScript keywords they share.
const GUESS_RULES: GuessRule[] = [
  { id: 'bash', test: (s) => /^#!.*\b(bash|sh|zsh)\b/.test(s) },
  { id: 'python', test: (s) => /^#!.*\bpython/.test(s) },
  { id: 'javascript', test: (s) => /^#!.*\bnode\b/.test(s) },
  { id: 'php', test: (s) => /^\s*<\?php/.test(s) },
  { id: 'html', test: (s) => /<!doctype html|<html[\s>]/i.test(s) },
  { id: 'go', test: (s) => /^\s*package main\b/m.test(s) || (/\bfunc\s+\w+\s*\(/.test(s) && /:=/.test(s)) },
  { id: 'rust', test: (s) => /\bfn main\s*\(\)/.test(s) || /\blet mut\b/.test(s) || /\bprintln!\s*\(/.test(s) },
  { id: 'cpp', test: (s) => /^\s*#include\s*</m.test(s) && /\bstd::/.test(s) },
  { id: 'c', test: (s) => /^\s*#include\s*</m.test(s) },
  { id: 'csharp', test: (s) => /^\s*using System\b/m.test(s) },
  { id: 'java', test: (s) => /public static void main/.test(s) || /System\.out\./.test(s) },
  { id: 'python', test: (s) => /^\s*def \w+\s*\(.*\)\s*(->\s*[^:]+)?:/m.test(s) || /^\s*from \w[\w.]* import /m.test(s) },
  {
    id: 'typescript',
    test: (s) =>
      /^\s*(export\s+)?interface \w+(<[^>]*>)?\s*\{/m.test(s) ||
      /:\s*(string|number|boolean)\b/.test(s) ||
      /^\s*import type\b/m.test(s),
  },
  {
    id: 'javascript',
    test: (s) =>
      /^\s*import React\b/m.test(s) ||
      /\brequire\s*\(/.test(s) ||
      /\bconsole\.log\s*\(/.test(s) ||
      /=>\s*\{/.test(s) ||
      /^\s*(async\s+)?function\s+\w+\s*\(/m.test(s),
  },
  { id: 'sql', test: (s) => /^\s*select\b[\s\S]*?\bfrom\b/im.test(s) || /\bcreate table\b/i.test(s) },
  { id: 'json', test: (_, content) => isJsonDocument(content) },
  { id: 'dockerfile', test: (s) => looksLikeDockerfile(s) },
  { id: 'graphql', test: (s) => /^\s*(query|mutation)\b[^{]*\{/m.test(s) || (/^\s*type \w+\s*\{/m.test(s) && /!/.test(s)) },
  { id: 'scss', test: (s) => /^\s*\$[\w-]+\s*:/m.test(s) || /@mixin\b/.test(s) || /@include\b/.test(s) },
  { id: 'css', test: (s) => /(^|\n)\s*[^{}\n]+\{\s*\n?\s*[\w-]+\s*:\s*[^;{}]+;/.test(s) },
  { id: 'yaml', test: (s) => looksLikeYaml(s) },
  { id: 'bash', test: (s) => /^\$ /m.test(s) },
];

/**
 * Best guess at the language of pasted content, or null when nothing matches. Only
 * high-confidence shapes are tested; prose and ambiguous code come back null.
 */
export function guessLanguage(content: string): string | null {
  if (!content.trim()) return null;
  const sample = content.slice(0, GUESS_SAMPLE_LENGTH);
  return GUESS_RULES.find((rule) => rule.test(sample, content))?.id ?? null;
}

export type ShareKind = 'snippet' | 'command';

/** Title used when a shared snippet is created without one. */
export function defaultShareTitle(kind: ShareKind, language: string | null): string {
  if (kind === 'command') return 'Command';
  if (!language || language === 'plaintext') return 'Snippet';
  return `${languageLabel(language)} snippet`;
}
