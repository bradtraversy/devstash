import { SLUG_PATTERN } from '@/lib/slugs';

/** Absolute origin for canonical links, from NEXT_PUBLIC_APP_URL with the local fallback the email code uses. */
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001').replace(/\/+$/, '');
}

export function publicCollectionPath(handle: string, slug: string): string {
  return `/${handle}/${slug}`;
}

export function publicRawPath(handle: string, slug: string): string {
  return `/${handle}/${slug}/raw`;
}

export function publicMarkdownPath(handle: string, slug: string): string {
  return `/${handle}/${slug}.md`;
}

/** Short link: redirects to a collection's readable URL, serves an item directly. */
export function publicShortPath(shortId: string): string {
  return `/s/${shortId}`;
}

/** The short link without its protocol, for display; links stay full when copied. */
export function readableShortLink(origin: string, shortId: string): string {
  return `${origin}${publicShortPath(shortId)}`.replace(/^https?:\/\//, '');
}

export function publicShortRawPath(shortId: string): string {
  return `/s/${shortId}/raw`;
}

/** Generated Open Graph image for a shared item. */
export function publicShortOgPath(shortId: string): string {
  return `/s/${shortId}/og`;
}

/** The full snippet image route; what the cache and revalidation see. */
export function publicShortImagePath(shortId: string): string {
  return `/s/${shortId}/image`;
}

/** The full snippet image as people see it; next.config rewrites it to the route. */
export function publicShortPngPath(shortId: string): string {
  return `/s/${shortId}.png`;
}

/** Generated Open Graph image for a shared collection, at its live slug only. */
export function publicCollectionOgPath(handle: string, slug: string): string {
  return `/${handle}/${slug}/og`;
}

/** The path with a version query, so caches keyed by URL (social platforms) refetch after an edit. */
export function versionedPath(path: string, date: Date): string {
  return `${path}?v=${date.getTime()}`;
}

/** Lowercases a handle or slug from a URL, or null when it could never match a stored value. */
export function normalizePublicSegment(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = raw.toLowerCase();
  return SLUG_PATTERN.test(value) ? value : null;
}
