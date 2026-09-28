import { NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { SHORT_ID_PATTERN } from '@/lib/short-id';
import { resolveShortId } from '@/lib/db/public';
import { publicCollectionPath } from '@/lib/public/paths';

/** Permanent short link: sends the visitor to the collection's current readable URL. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ shortId: string }> }
) {
  const { shortId } = await params;
  const id = shortId.toLowerCase();

  if (!SHORT_ID_PATTERN.test(id)) {
    notFound();
  }

  const target = await resolveShortId(id);

  if (!target) {
    notFound();
  }

  return NextResponse.redirect(
    new URL(publicCollectionPath(target.handle, target.slug), request.url),
    302
  );
}
