import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getPublicCollection, resolveSlugHistory } from '@/lib/db/public';
import { publicCollectionMetadata } from '@/lib/public/metadata';
import { normalizePublicSegment, publicCollectionPath } from '@/lib/public/paths';
import PublicCollectionView from '@/components/public/public-collection-view';

interface PublicCollectionPageProps {
  params: Promise<{ handle: string; slug: string }>;
}

// No params are known at build time; with this export each path renders on its first request
// and stays in the full route cache until an owner action revalidates it.
export async function generateStaticParams() {
  return [];
}

// generateMetadata and the page share one query per request.
const loadPublicCollection = cache(getPublicCollection);

async function resolveParams(params: PublicCollectionPageProps['params']) {
  const { handle: rawHandle, slug: rawSlug } = await params;
  return {
    rawHandle,
    rawSlug,
    handle: normalizePublicSegment(rawHandle),
    slug: normalizePublicSegment(rawSlug),
  };
}

export async function generateMetadata({ params }: PublicCollectionPageProps): Promise<Metadata> {
  const { handle, slug } = await resolveParams(params);
  if (!handle || !slug) return {};

  const collection = await loadPublicCollection(handle, slug);
  if (!collection) return {};

  return publicCollectionMetadata(collection, publicCollectionPath(handle, slug));
}

export default async function PublicCollectionPage({ params }: PublicCollectionPageProps) {
  const { rawHandle, rawSlug, handle, slug } = await resolveParams(params);

  if (!handle || !slug) {
    notFound();
  }

  // Before any lookup, so the cached response for a case variant depends on the URL alone.
  if (rawHandle !== handle || rawSlug !== slug) {
    permanentRedirect(publicCollectionPath(handle, slug));
  }

  const collection = await loadPublicCollection(handle, slug);

  if (!collection) {
    const moved = await resolveSlugHistory(handle, slug);
    if (moved) {
      permanentRedirect(publicCollectionPath(moved.handle, moved.slug));
    }
    notFound();
  }

  return <PublicCollectionView collection={collection} />;
}
