import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { SHORT_ID_PATTERN } from '@/lib/short-id';
import { resolveShortLink } from '@/lib/db/public';
import { publicItemMetadata } from '@/lib/public/metadata';
import { publicCollectionPath, publicShortPath } from '@/lib/public/paths';
import PublicItemView from '@/components/public/public-item-view';

interface ShortLinkPageProps {
  params: Promise<{ shortId: string }>;
}

// No params are known at build time; each short link renders on its first request and stays in
// the full route cache (an item page, a collection redirect, or a 404) until an owner action
// revalidates it.
export async function generateStaticParams() {
  return [];
}

// generateMetadata and the page share one lookup per request.
const loadShortLink = cache(resolveShortLink);

async function resolveParams(params: ShortLinkPageProps['params']) {
  const { shortId: raw } = await params;
  const id = raw.toLowerCase();
  return { raw, id: SHORT_ID_PATTERN.test(id) ? id : null };
}

export async function generateMetadata({ params }: ShortLinkPageProps): Promise<Metadata> {
  const { id } = await resolveParams(params);
  if (!id) return {};

  const target = await loadShortLink(id);
  if (target?.kind !== 'item') return {};

  return publicItemMetadata(target.item, publicShortPath(id));
}

export default async function ShortLinkPage({ params }: ShortLinkPageProps) {
  const { raw, id } = await resolveParams(params);

  if (!id) {
    notFound();
  }

  // Before any lookup, so the cached response for a case variant depends on the URL alone.
  if (raw !== id) {
    permanentRedirect(publicShortPath(id));
  }

  const target = await loadShortLink(id);

  if (!target) {
    notFound();
  }

  if (target.kind === 'collection') {
    redirect(publicCollectionPath(target.handle, target.slug));
  }

  return <PublicItemView item={target.item} />;
}
