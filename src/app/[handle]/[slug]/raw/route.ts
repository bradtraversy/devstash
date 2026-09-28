import { NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { getPublicCollection, resolveSlugHistory } from '@/lib/db/public';
import { collectionToMarkdown } from '@/lib/public/markdown';
import { normalizePublicSegment, publicCollectionPath, publicRawPath, siteOrigin } from '@/lib/public/paths';

/** The collection as markdown; `/{handle}/{slug}.md` rewrites here (next.config.ts). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string; slug: string }> }
) {
  const { handle: rawHandle, slug: rawSlug } = await params;
  const handle = normalizePublicSegment(rawHandle);
  const slug = normalizePublicSegment(rawSlug);

  if (!handle || !slug) {
    notFound();
  }

  if (rawHandle !== handle || rawSlug !== slug) {
    return NextResponse.redirect(new URL(publicRawPath(handle, slug), request.url), 301);
  }

  const collection = await getPublicCollection(handle, slug);

  if (!collection) {
    const moved = await resolveSlugHistory(handle, slug);
    if (moved) {
      return NextResponse.redirect(new URL(publicRawPath(moved.handle, moved.slug), request.url), 301);
    }
    notFound();
  }

  // The configured origin, not the request host, so this matches the page's Copy as markdown output.
  const canonicalUrl = `${siteOrigin()}${publicCollectionPath(handle, slug)}`;

  return new NextResponse(collectionToMarkdown(collection, canonicalUrl), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
