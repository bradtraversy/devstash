export const MAX_SLUG_LENGTH = 63;

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;

// Every top-level route segment under src/app (route groups flattened) plus the names the public
// routes will need. slugs.test.ts fails when a new app route is missing here.
export const RESERVED_HANDLES = new Set([
  'api',
  'collections',
  'dashboard',
  'docs',
  'favorites',
  'items',
  'privacy',
  'profile',
  'settings',
  'shared',
  'terms',
  'upgrade',
  'sign-in',
  'register',
  'forgot-password',
  'reset-password',
  'verify-email',
  's',
  'search',
  'new',
  'edit',
  'login',
  'logout',
  'auth',
  'admin',
  'static',
  'public',
  '_next',
]);

export const RESERVED_SLUGS = new Set(['raw', 'new', 'edit']);

export const COLLECTION_SLUG_FALLBACK = 'collection';

export const HANDLE_FALLBACK = 'user';

/**
 * Lowercase, runs outside [a-z0-9] become one hyphen, hyphens trimmed, cut to 63 characters.
 * The public_collections_phase_1 migration applies the same rule in SQL.
 */
export function slugify(input: string): string {
  // U+0130 is the one code point whose JavaScript lowercase is two characters; Postgres lower() gives a plain i.
  const trimmed = input
    .replace(/\u0130/g, 'i')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return trimmed.slice(0, MAX_SLUG_LENGTH).replace(/-+$/, '');
}

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

/** Slug a collection name resolves to before per-user deduplication. */
export function collectionSlugBase(name: string): string {
  const base = slugify(name);
  return base === '' || RESERVED_SLUGS.has(base) ? COLLECTION_SLUG_FALLBACK : base;
}

/** Handle an email resolves to before global deduplication; the phase 1 backfill applied the same rule. */
export function handleBase(email: string): string {
  const base = slugify(email.split('@')[0] ?? '');
  return base === '' || RESERVED_HANDLES.has(base) ? HANDLE_FALLBACK : base;
}

/**
 * Prefix shared by every uniqueSlug candidate for `base`. A long base is cut to make room for
 * the suffix (at most 8 characters plus one trimmed hyphen), so a startsWith lookup on the
 * full base would miss those candidates.
 */
export function dedupePrefix(base: string): string {
  return base.slice(0, MAX_SLUG_LENGTH - 9);
}

/** Appends -2, -3, and so on until the slug is not in `taken`, keeping the result within 63 characters. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;

  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    const candidate = base.slice(0, MAX_SLUG_LENGTH - suffix.length).replace(/-+$/, '') + suffix;
    if (!used.has(candidate)) return candidate;
  }
}
