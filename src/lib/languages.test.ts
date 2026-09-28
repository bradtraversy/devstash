import { describe, it, expect } from 'vitest';
import { LANGUAGES } from '@/lib/constants/editor';
import {
  FENCE_LANGUAGE_ALIASES,
  SHIKI_LANGUAGES,
  fenceLanguage,
  languageLabel,
  shikiLanguage,
  PLAIN_TEXT_LABEL,
} from './languages';

describe('SHIKI_LANGUAGES', () => {
  it('covers every editor language except plaintext', () => {
    const expected = LANGUAGES.map((language) => language.value).filter((id) => id !== 'plaintext');
    expect(Object.keys(SHIKI_LANGUAGES).sort()).toEqual(expected.sort());
  });

  it('holds no id the editor does not offer', () => {
    const offered = new Set(LANGUAGES.map((language) => language.value));
    for (const id of Object.keys(SHIKI_LANGUAGES)) {
      expect(offered.has(id)).toBe(true);
    }
  });
});

describe('shikiLanguage', () => {
  it('maps known ids case-insensitively', () => {
    expect(shikiLanguage('typescript')).toBe('typescript');
    expect(shikiLanguage('TypeScript')).toBe('typescript');
  });

  it('returns null for plaintext, unknown, and missing languages', () => {
    expect(shikiLanguage('plaintext')).toBeNull();
    expect(shikiLanguage('brainfuck')).toBeNull();
    expect(shikiLanguage(null)).toBeNull();
    expect(shikiLanguage(undefined)).toBeNull();
  });
});

describe('fenceLanguage', () => {
  it('resolves editor ids, aliases, and mixed case', () => {
    expect(fenceLanguage('typescript')).toBe('typescript');
    expect(fenceLanguage('js')).toBe('javascript');
    expect(fenceLanguage('TSX')).toBe('typescript');
    expect(fenceLanguage('sh')).toBe('bash');
    expect(fenceLanguage('yml')).toBe('yaml');
  });

  it('uses only the first word of the info string', () => {
    expect(fenceLanguage('bash title="install.sh"')).toBe('bash');
  });

  it('returns null for plain text, unknown, and missing info', () => {
    expect(fenceLanguage('text')).toBeNull();
    expect(fenceLanguage('plaintext')).toBeNull();
    expect(fenceLanguage('brainfuck')).toBeNull();
    expect(fenceLanguage('')).toBeNull();
    expect(fenceLanguage(null)).toBeNull();
  });

  it('aliases point at editor ids or plaintext', () => {
    const known = new Set([...Object.keys(SHIKI_LANGUAGES), 'plaintext']);
    for (const target of Object.values(FENCE_LANGUAGE_ALIASES)) {
      expect(known.has(target), target).toBe(true);
    }
  });
});

describe('languageLabel', () => {
  it('uses the editor label when known', () => {
    expect(languageLabel('csharp')).toBe('C#');
    expect(languageLabel('bash')).toBe('Bash / Shell');
  });

  it('falls back to the raw id or Plain Text', () => {
    expect(languageLabel('zig')).toBe('zig');
    expect(languageLabel(null)).toBe(PLAIN_TEXT_LABEL);
  });
});
