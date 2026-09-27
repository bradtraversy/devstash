export const MAX_SLUG_LENGTH = 63;

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;

// Every top-level route segment under src/app (route groups flattened) plus the names the public
// routes will need. slugs.test.ts fails when a new app route is missing here.
export const RESERVED_HANDLES = new Set([
  'api',
  'collections',
  'dashboard',
  'favorites',
  'items',
  'profile',
  'settings',
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
