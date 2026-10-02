import type { Metadata } from 'next';
import type { PublicCollection, PublicSharedItem } from '@/lib/db/public';
import { defaultShareTitle } from '@/lib/languages';
import { OG_IMAGE_SIZE } from '@/lib/og/constants';
import { publicCollectionOgPath, publicShortOgPath, versionedPath } from '@/lib/public/paths';

export const SITE_NAME = 'DevStash';

const MAX_DESCRIPTION = 200;

function shorten(text: string): string {
  return text.length > MAX_DESCRIPTION
    ? `${text.slice(0, MAX_DESCRIPTION - 3).trimEnd()}...`
    : text;
}

function describe(collection: PublicCollection): string {
  if (collection.description) {
    return shorten(collection.description);
  }
  const noun = collection.itemCount === 1 ? 'item' : 'items';
  return `${collection.itemCount} ${noun} by @${collection.handle} on ${SITE_NAME}`;
}

function buildMetadata(
  title: string,
  description: string,
  canonicalPath: string,
  visibility: PublicCollection['visibility'],
  imageUrl: string
): Metadata {
  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: 'article',
      title,
      description,
      url: canonicalPath,
      siteName: SITE_NAME,
      images: [{ url: imageUrl, width: OG_IMAGE_SIZE.width, height: OG_IMAGE_SIZE.height, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [imageUrl] },
    ...(visibility === 'UNLISTED' ? { robots: { index: false, follow: false } } : {}),
  };
}

/** Page metadata for a public collection; canonicalPath is resolved against metadataBase. */
export function publicCollectionMetadata(
  collection: PublicCollection,
  canonicalPath: string
): Metadata {
  return buildMetadata(
    `${collection.name} by @${collection.handle}`,
    describe(collection),
    canonicalPath,
    collection.visibility,
    versionedPath(publicCollectionOgPath(collection.handle, collection.slug), collection.contentUpdatedAt)
  );
}

/** `JavaScript snippet`, `Command`, `Note`: the item's kind for a description. */
export function itemKindLabel(item: Pick<PublicSharedItem, 'itemType' | 'language'>): string {
  const name = item.itemType.name;
  if (name === 'snippet') return defaultShareTitle('snippet', item.language);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function describeItem(item: PublicSharedItem): string {
  if (item.description) {
    return shorten(item.description);
  }
  return `${itemKindLabel(item)} by @${item.handle} on ${SITE_NAME}`;
}

/** Page metadata for a shared item at its short link. */
export function publicItemMetadata(item: PublicSharedItem, canonicalPath: string): Metadata {
  return buildMetadata(
    `${item.title} by @${item.handle}`,
    describeItem(item),
    canonicalPath,
    item.visibility,
    versionedPath(publicShortOgPath(item.shortId), item.updatedAt)
  );
}
