import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getPublicProfile } from '@/lib/db/public';
import { getCodePreviews } from '@/lib/item-previews';
import { publicProfileMetadata } from '@/lib/public/metadata';
import { normalizePublicSegment, publicProfilePath } from '@/lib/public/paths';
import PublicProfileView from '@/components/public/public-profile-view';

interface PublicProfilePageProps {
  params: Promise<{ handle: string }>;
}

// Rendered on first request and cached until an owner write revalidates it, like the collection page.
export async function generateStaticParams() {
  return [];
}

const loadPublicProfile = cache(getPublicProfile);

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const handle = normalizePublicSegment((await params).handle);
  if (!handle) return {};

  const profile = await loadPublicProfile(handle);
  if (!profile) return {};

  return publicProfileMetadata(profile, publicProfilePath(handle));
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const rawHandle = (await params).handle;
  const handle = normalizePublicSegment(rawHandle);

  if (!handle) {
    notFound();
  }

  // Before any lookup, so the cached response for a case variant depends on the URL alone.
  if (rawHandle !== handle) {
    permanentRedirect(publicProfilePath(handle));
  }

  const profile = await loadPublicProfile(handle);

  if (!profile) {
    notFound();
  }

  const previews = await getCodePreviews(profile.items);

  return <PublicProfileView profile={profile} previews={previews} />;
}
