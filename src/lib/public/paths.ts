import { SLUG_PATTERN } from '@/lib/slugs';

/** Absolute origin for canonical links, from NEXT_PUBLIC_APP_URL with the local fallback the email code uses. */
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
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

export function publicShortRawPath(shortId: string): string {
  return `/s/${shortId}/raw`;
}

/** Lowercases a handle or slug from a URL, or null when it could never match a stored value. */
export function normalizePublicSegment(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = raw.toLowerCase();
  return SLUG_PATTERN.test(value) ? value : null;
}
