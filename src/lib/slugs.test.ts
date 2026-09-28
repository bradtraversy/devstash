import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  slugify,
  isValidSlug,
  collectionSlugBase,
  handleBase,
  dedupePrefix,
  HANDLE_FALLBACK,
  uniqueSlug,
  RESERVED_HANDLES,
  RESERVED_SLUGS,
  MAX_SLUG_LENGTH,
} from './slugs';

// The public_collections_phase_1 migration applies the same rule in SQL. These cases were run
// through both, so change them together.
const SLUGIFY_CASES: [input: string, expected: string][] = [
  ['React Patterns', 'react-patterns'],
  ['  Hello   World  ', 'hello-world'],
  ['C++ & Rust!!', 'c-rust'],
  ['already-a-slug', 'already-a-slug'],
  ['UPPER_snake_Case', 'upper-snake-case'],
  ['Ünïcödé näme', 'n-c-d-n-me'],
  ['İstanbul', 'istanbul'],
  ['---leading and trailing---', 'leading-and-trailing'],
  ['Test col 2', 'test-col-2'],
  ['111', '111'],
  ['!!!', ''],
  ['', ''],
  ['a'.repeat(70), 'a'.repeat(63)],
  ['a'.repeat(62) + '-bcd', 'a'.repeat(62)],
];

// Route segments under src/app, with route groups flattened and dynamic, private, and
// parallel segments left out because they are not literal paths.
function routeSegments(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
        return routeSegments(path.join(dir, entry.name));
      }
      if (/^[[_@]/.test(entry.name)) return [];
      return [entry.name];
    });
}

describe('slugify', () => {
  it.each(SLUGIFY_CASES)('slugify(%j) is %j', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('stays within the length limit and never ends with a hyphen', () => {
    const slug = slugify('x'.repeat(62) + ' ' + 'y'.repeat(10));
    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(slug.endsWith('-')).toBe(false);
    expect(isValidSlug(slug)).toBe(true);
  });
});

describe('isValidSlug', () => {
  it.each(['a', 'react-patterns', '111', 'a-b-c', 'a'.repeat(63)])('accepts %j', (value) => {
    expect(isValidSlug(value)).toBe(true);
  });

  it.each(['', '-leading', 'Upper', 'has space', 'under_score', 'a'.repeat(64)])('rejects %j', (value) => {
    expect(isValidSlug(value)).toBe(false);
  });
});

describe('collectionSlugBase', () => {
  it('slugifies ordinary names', () => {
    expect(collectionSlugBase('React Patterns')).toBe('react-patterns');
  });

  it('falls back to "collection" when the name slugifies to nothing', () => {
    expect(collectionSlugBase('!!!')).toBe('collection');
  });

  it('falls back to "collection" for reserved names', () => {
    for (const reserved of RESERVED_SLUGS) {
      expect(collectionSlugBase(reserved.toUpperCase())).toBe('collection');
    }
  });
});

describe('uniqueSlug', () => {
  it('returns the base when nothing has taken it', () => {
    expect(uniqueSlug('react', ['vue', 'svelte'])).toBe('react');
  });

  it('appends -2, -3, and so on until the slug is free', () => {
    expect(uniqueSlug('test', ['test'])).toBe('test-2');
    expect(uniqueSlug('test', ['test', 'test-2'])).toBe('test-3');
  });

  it('suffixes a literal name that collides with an earlier suffix', () => {
    expect(uniqueSlug('test-2', ['test', 'test-2'])).toBe('test-2-2');
  });

  it('keeps a suffixed slug within the length limit', () => {
    const base = 'a'.repeat(MAX_SLUG_LENGTH);
    const result = uniqueSlug(base, [base]);

    expect(result).toBe('a'.repeat(MAX_SLUG_LENGTH - 2) + '-2');
    expect(isValidSlug(result)).toBe(true);
  });

  it('does not leave a double hyphen when the cut lands on one', () => {
    const base = 'a'.repeat(MAX_SLUG_LENGTH - 2) + '-b';
    expect(uniqueSlug(base, [base])).toBe('a'.repeat(MAX_SLUG_LENGTH - 2) + '-2');
  });
});

describe('RESERVED_HANDLES', () => {
  it('covers every route segment under src/app', () => {
    const segments = routeSegments(fileURLToPath(new URL('../app', import.meta.url)));
    const missing = segments.filter((segment) => !RESERVED_HANDLES.has(segment));

    expect(segments.length).toBeGreaterThan(5);
    expect(missing).toEqual([]);
  });

  it('holds only lowercase names a handle could otherwise take', () => {
    for (const handle of RESERVED_HANDLES) {
      expect(handle === '_next' || isValidSlug(handle)).toBe(true);
    }
  });
});

describe('handleBase', () => {
  it.each([
    ['brad@traversymedia.com', 'brad'],
    ['Brad.Traversy+dev@example.com', 'brad-traversy-dev'],
    ['no-at-sign', 'no-at-sign'],
  ])('derives %s to %s', (email, expected) => {
    expect(handleBase(email)).toBe(expected);
  });

  it('falls back for a reserved local part', () => {
    expect(handleBase('admin@example.com')).toBe(HANDLE_FALLBACK);
    expect(handleBase('api@example.com')).toBe(HANDLE_FALLBACK);
  });

  it('falls back for a local part with no slug characters', () => {
    expect(handleBase('!!!@example.com')).toBe(HANDLE_FALLBACK);
    expect(handleBase('@example.com')).toBe(HANDLE_FALLBACK);
  });

  it('never returns a reserved handle', () => {
    // _next slugifies to next, which is allowed; every other reserved name falls back.
    for (const reserved of RESERVED_HANDLES) {
      expect(RESERVED_HANDLES.has(handleBase(`${reserved}@example.com`))).toBe(false);
    }
  });
});

describe('dedupePrefix', () => {
  it('returns a short base unchanged', () => {
    expect(dedupePrefix('brad')).toBe('brad');
  });

  it('is a prefix of every candidate uniqueSlug can produce for a long base', () => {
    const base = 'a'.repeat(60) + '-b';
    const prefix = dedupePrefix(base);
    const taken = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const candidate = uniqueSlug(base, taken);
      expect(candidate.startsWith(prefix)).toBe(true);
      expect(candidate.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
      taken.add(candidate);
    }
  });
});
