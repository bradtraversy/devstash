import { defaultShareTitle, guessLanguage } from '@/lib/languages';

export const PASTE_TYPES = ['snippet', 'command', 'note', 'prompt', 'link'] as const;

export type PasteType = (typeof PASTE_TYPES)[number];

export interface PasteGuess {
  typeName: PasteType;
  title: string;
  content: string | null;
  url: string | null;
  language: string | null;
}

export const PASTE_TITLE_LENGTH = 80;

const COMMAND_WORDS =
  /^(git|npm|npx|pnpm|yarn|bun|bunx|docker|kubectl|curl|wget|lsof|ssh|scp|rsync|brew|apt|psql|python3?|pip3?|deno|cargo|gh|vercel|prisma|chmod|chown)(\s|$)/;

// Also English words, so they count only in a short line or next to something shell shaped.
const AMBIGUOUS_COMMAND_WORDS = /^(make|find|cat|go|kill|cd|node|sudo|grep|tar|cp|mv|rm|ls|mkdir)(\s|$)/;
const SHELL_TOKEN = /\s(-{1,2}\w|[.~/]|[|><*]|\S+\.\w{1,5}\b)/;

// A declaration needs a code-shaped next token, so prose like "let me know" never becomes a title.
const DECLARED_NAME = new RegExp(
  [
    String.raw`^[ \t]*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*[=:]`,
    String.raw`^[ \t]*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\*?\s+([A-Za-z_$][\w$]*)\s*[(<]`,
    String.raw`^[ \t]*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(`,
    String.raw`^[ \t]*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)\s*(?:[{<(:]|extends\b|implements\b)`,
    String.raw`^[ \t]*(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)\s*(?:[{<]|extends\b)`,
    String.raw`^[ \t]*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*[=<]`,
  ].join('|'),
  'm'
);

function looksLikeCommand(line: string): boolean {
  if (COMMAND_WORDS.test(line)) return true;
  if (!AMBIGUOUS_COMMAND_WORDS.test(line)) return false;
  return line.split(/\s+/).length <= 4 || SHELL_TOKEN.test(line);
}

function isWebUrl(text: string): boolean {
  try {
    const { protocol } = new URL(text);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

function cut(text: string): string {
  return text.length > PASTE_TITLE_LENGTH ? `${text.slice(0, PASTE_TITLE_LENGTH - 3).trimEnd()}...` : text;
}

function linkTitle(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '') + parsed.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
}

// Formats with list-like or comment lines that are still code, so they never become notes.
const NEVER_PROSE_LANGUAGES = ['yaml', 'json', 'dockerfile', 'bash'];

// Lookaheads instead of \b, so "Write-up from the retro" is not an instruction.
const PROMPT_OPENING =
  /^(you are|you're|act as|pretend to be|pretend you|imagine you|i want you to|i need you to|i'd like you to|i would like you to|can you|could you|would you|your task|your role|role:|system:)(?=[\s:,]|$)/i;
const PROMPT_IMPERATIVE =
  /^(write|generate|create|draft|review|explain|summari[sz]e|rewrite|refactor|translate|improve|analy[sz]e|convert|turn|fix|list|compare|suggest|given)\s+(this|these|that|the following|the code|the text|my|me|a|an|it|them|below)(?=[\s:,.]|$)/i;
// A markdown link is not a placeholder, so "[your settings](url)" stays a note.
const PROMPT_PLACEHOLDER = /\{\{\s*[\w.]+\s*\}\}|\[(?:insert|paste|your)[^\[\]\n]*\](?!\()|<(?:insert|paste)[^<>\n]*>/i;

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;

/** Prose with code fences, inline code, checkboxes, links, placeholders, and worded asides taken out. */
function proseOnly(text: string): string {
  return text
    .replace(/^[ \t]*(```|~~~)[^\n]*\n[\s\S]*?^[ \t]*\1[ \t]*$/gm, '')
    .replace(/`[^`\n]*`/g, '')
    .replace(/^[ \t]*[-*+][ \t]+\[[ xX]\]/gm, '')
    .replace(/\[[^\[\]\n]*\]\([^()\s]*\)/g, '')
    .replace(new RegExp(PROMPT_PLACEHOLDER.source, 'gi'), '')
    .replace(/\([\p{L}\s,'’-]+\)/gu, ' ');
}

function codeDensity(prose: string): number {
  const nonSpace = prose.replace(/\s/g, '');
  if (!nonSpace) return 0;
  return (nonSpace.match(/[{}()[\];=<>]/g) ?? []).length / nonSpace.length;
}

function hasMarkdown(text: string): boolean {
  return (
    /^#{1,6}[ \t]+\S/m.test(text) ||
    /^[ \t]*[-*+][ \t]+\[[ xX]\][ \t]/m.test(text) ||
    /^>[ \t]+\S/m.test(text) ||
    /^[ \t]*(```|~~~)/m.test(text) ||
    (text.match(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+\S/gm) ?? []).length >= 2
  );
}

/** Words rather than code: few code characters, mostly plain words, and sentences or markdown when that is unclear. */
function isProse(text: string, language: string | null): boolean {
  if (language && NEVER_PROSE_LANGUAGES.includes(language)) return false;
  if (text.startsWith('#!')) return false;
  const prose = proseOnly(text);
  if (codeDensity(prose) >= 0.05) return false;

  const tokens = prose.split(/\s+/).filter(Boolean);
  const cjkWords = Math.floor((prose.match(CJK) ?? []).length / 2);
  if (tokens.length + cjkWords < 4) return false;
  if (cjkWords >= 4) return true;

  const plainWords = tokens.filter((token) => /^[("'“]*\p{L}[\p{L}'’-]*[.,!?;:)"'”]*$/u.test(token)).length;
  const plainRatio = plainWords / tokens.length;
  if (plainRatio < 0.6) return false;
  const sentencesOrMarkdown = /\p{L}[.!?](\s|$)/u.test(prose) || hasMarkdown(text);
  return sentencesOrMarkdown || (!language && plainRatio >= 0.8);
}

const MARKDOWN_MARKER = /^[ \t]*(?:#{1,6}|[-*+](?:[ \t]+\[[ xX]\])?|\d+[.)]|>)[ \t]+/;

function firstLine(text: string): string {
  const line = text.split('\n').find((candidate) => candidate.trim()) ?? '';
  return line.replace(MARKDOWN_MARKER, '').trim();
}

/** The first line that is plain text, skipping headings and list items. */
function firstPlainLine(lines: string[]): string {
  return lines.map((line) => line.trim()).find((line) => !MARKDOWN_MARKER.test(line)) ?? '';
}

function snippetLanguage(text: string): string | null {
  const guessed = guessLanguage(text);
  return guessed && guessed !== 'plaintext' ? guessed : null;
}

function isCommandLine(line: string): boolean {
  return /^[ \t]*\$[ \t]/.test(line) || looksLikeCommand(line.trim());
}

/** The type a paste most likely is. */
export function detectPasteType(text: string): PasteType | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (canBeLink(trimmed)) return 'link';

  const lines = trimmed.split('\n').filter((line) => line.trim());
  // Shell comments ride along with the commands they describe.
  const codeLines = lines.filter((line) => !/^[ \t]*#/.test(line));
  if (codeLines.length > 0 && codeLines.every(isCommandLine)) return 'command';

  if (isProse(trimmed, snippetLanguage(trimmed))) {
    const opening = firstPlainLine(lines);
    const instructs = PROMPT_OPENING.test(opening) || PROMPT_IMPERATIVE.test(opening);
    return instructs || PROMPT_PLACEHOLDER.test(trimmed) ? 'prompt' : 'note';
  }
  return 'snippet';
}

/** Whether the paste can be saved as a link at all: one http or https URL. */
export function canBeLink(text: string): boolean {
  const trimmed = text.trim();
  return !trimmed.includes('\n') && /^https?:\/\/\S+$/i.test(trimmed) && isWebUrl(trimmed);
}

/** The fields a paste is saved with as a given type, or null when it cannot be that type. */
export function pasteAs(text: string, typeName: PasteType): PasteGuess | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  switch (typeName) {
    case 'link':
      return canBeLink(trimmed)
        ? { typeName, title: cut(linkTitle(trimmed)), content: null, url: trimmed, language: null }
        : null;
    case 'command': {
      const content = trimmed.replace(/^[ \t]*\$[ \t]+/gm, '');
      return { typeName, title: cut(firstLine(content) || 'Command'), content, url: null, language: null };
    }
    case 'note':
    case 'prompt':
      return {
        typeName,
        title: cut(firstLine(trimmed) || (typeName === 'note' ? 'Note' : 'Prompt')),
        content: text,
        url: null,
        language: null,
      };
    case 'snippet': {
      const language = snippetLanguage(text);
      const name = text.match(DECLARED_NAME)?.slice(1).find(Boolean);
      return {
        typeName,
        title: cut(name ?? defaultShareTitle('snippet', language)),
        content: text,
        url: null,
        language,
      };
    }
  }
}

/** What a paste most likely is, with the title and language it would be saved with. */
export function guessPaste(text: string): PasteGuess | null {
  const typeName = detectPasteType(text);
  return typeName ? pasteAs(text, typeName) : null;
}
