import type { Metadata } from 'next';
import type { PublicCollection } from '@/lib/db/public';

export const SITE_NAME = 'DevStash';

const MAX_DESCRIPTION = 200;

function describe(collection: PublicCollection): string {
  if (collection.description) {
    return collection.description.length > MAX_DESCRIPTION
      ? `${collection.description.slice(0, MAX_DESCRIPTION - 3).trimEnd()}...`
      : collection.description;
  }
  const noun = collection.itemCount === 1 ? 'item' : 'items';
  return `${collection.itemCount} ${noun} by @${collection.handle} on ${SITE_NAME}`;
}

/** Page metadata for a public collection; canonicalPath is resolved against metadataBase. */
export function publicCollectionMetadata(
  collection: PublicCollection,
  canonicalPath: string
): Metadata {
  const title = `${collection.name} by @${collection.handle}`;
  const description = describe(collection);

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
    },
    twitter: { card: 'summary_large_image', title, description },
    ...(collection.visibility === 'UNLISTED' ? { robots: { index: false, follow: false } } : {}),
  };
}
