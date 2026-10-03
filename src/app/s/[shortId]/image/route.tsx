import { notFound } from 'next/navigation';
import { SHORT_ID_PATTERN } from '@/lib/short-id';
import { getPublicItem } from '@/lib/db/public';
import { isTextType } from '@/lib/constants/item-types';
import { itemImage } from '@/lib/og/preview';
import { renderOgImage } from '@/lib/og/render';
import { SnippetImage, snippetImageSize } from '@/lib/og/snippet-image';

interface ImageRouteContext {
  params: Promise<{ shortId: string }>;
}

// Cached by path like its page, so the owner writes that revalidate the page clear the image too.
export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [];
}

export async function GET(_request: Request, { params }: ImageRouteContext) {
  const { shortId } = await params;

  // The pattern is lowercase only, so a case variant is a 404 here; nothing links to it.
  if (!SHORT_ID_PATTERN.test(shortId)) {
    notFound();
  }

  const item = await getPublicItem(shortId);
  if (!item || !isTextType(item.itemType.name)) {
    notFound();
  }

  const { lines, hidden } = await itemImage(item);
  const image = {
    title: item.title,
    language: item.language,
    itemType: item.itemType,
    shortId: item.shortId,
    handle: item.handle,
    shared: true,
  };

  return renderOgImage(
    <SnippetImage item={image} lines={lines} hidden={hidden} />,
    snippetImageSize(lines, hidden)
  );
}
