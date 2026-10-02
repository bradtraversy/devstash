import { notFound } from 'next/navigation';
import { getPublicCollection } from '@/lib/db/public';
import { normalizePublicSegment } from '@/lib/public/paths';
import { CollectionCard } from '@/lib/og/cards';
import { renderOgImage } from '@/lib/og/render';

interface OgRouteContext {
  params: Promise<{ handle: string; slug: string }>;
}

// Cached by path like its page, so the owner writes that revalidate the page clear the image too.
export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [];
}

export async function GET(_request: Request, { params }: OgRouteContext) {
  const { handle: rawHandle, slug: rawSlug } = await params;
  const handle = normalizePublicSegment(rawHandle);
  const slug = normalizePublicSegment(rawSlug);

  // Only the canonical lowercase URL has an image; the page's metadata is the only thing that links to it.
  if (!handle || !slug || handle !== rawHandle || slug !== rawSlug) {
    notFound();
  }

  const collection = await getPublicCollection(handle, slug);
  if (!collection) {
    notFound();
  }

  return renderOgImage(<CollectionCard collection={collection} />);
}
