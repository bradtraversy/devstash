import { notFound } from 'next/navigation';
import { SHORT_ID_PATTERN } from '@/lib/short-id';
import { getPublicItem } from '@/lib/db/public';
import { ItemCard } from '@/lib/og/cards';
import { itemPreview } from '@/lib/og/preview';
import { renderOgImage } from '@/lib/og/render';

interface OgRouteContext {
  params: Promise<{ shortId: string }>;
}

// Cached by path like its page, so the owner writes that revalidate the page clear the image too.
export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [];
}

export async function GET(_request: Request, { params }: OgRouteContext) {
  const { shortId } = await params;

  // The pattern is lowercase only, so a case variant is a 404 here; nothing links to it.
  if (!SHORT_ID_PATTERN.test(shortId)) {
    notFound();
  }

  const item = await getPublicItem(shortId);
  if (!item) {
    notFound();
  }

  const { lines, truncated } = await itemPreview(item);

  return renderOgImage(<ItemCard item={item} lines={lines} truncated={truncated} />);
}
