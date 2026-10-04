import { defaultShareTitle, guessLanguage } from '@/lib/languages';

export type PasteType = 'snippet' | 'command' | 'link';

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
    String.raw`^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*[=:]`,
    String.raw`^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\*?\s+([A-Za-z_$][\w$]*)\s*[(<]`,
    String.raw`^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(`,
    String.raw`^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)\s*(?:[{<(:]|extends\b|implements\b)`,
    String.raw`^\s*(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)\s*(?:[{<]|extends\b)`,
    String.raw`^\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*[=<]`,
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

/** What a paste most likely is, with the title and language it would be saved with. */
export function guessPaste(text: string): PasteGuess | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const singleLine = !trimmed.includes('\n');

  if (singleLine && /^https?:\/\/\S+$/i.test(trimmed) && isWebUrl(trimmed)) {
    return { typeName: 'link', title: cut(linkTitle(trimmed)), content: null, url: trimmed, language: null };
  }

  const withoutPrompt = trimmed.replace(/^\$\s+/, '');
  if (singleLine && (trimmed.startsWith('$ ') || looksLikeCommand(withoutPrompt))) {
    return { typeName: 'command', title: cut(withoutPrompt), content: withoutPrompt, url: null, language: null };
  }

  const guessed = guessLanguage(text);
  const language = guessed && guessed !== 'plaintext' ? guessed : null;
  const name = text.match(DECLARED_NAME)?.slice(1).find(Boolean);
  return {
    typeName: 'snippet',
    title: cut(name ?? defaultShareTitle('snippet', language)),
    content: text,
    url: null,
    language,
  };
}
