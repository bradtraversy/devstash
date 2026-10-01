import { NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { SHORT_ID_PATTERN } from '@/lib/short-id';
import { resolveShortLink } from '@/lib/db/public';
import { commandCopyText } from '@/lib/public/copy';
import { publicRawPath, publicShortRawPath } from '@/lib/public/paths';

const TEXT_TYPES = new Set(['snippet', 'command', 'note', 'prompt']);

/** A shared text item as plain text, so a command can be piped into a shell; collections go to their markdown. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ shortId: string }> }
) {
  const { shortId: raw } = await params;
  const id = raw.toLowerCase();

  if (!SHORT_ID_PATTERN.test(id)) {
    notFound();
  }

  if (raw !== id) {
    return NextResponse.redirect(new URL(publicShortRawPath(id), request.url), 301);
  }

  const target = await resolveShortLink(id);

  if (!target) {
    notFound();
  }

  if (target.kind === 'collection') {
    return NextResponse.redirect(
      new URL(publicRawPath(target.handle, target.slug), request.url),
      301
    );
  }

  const { item } = target;

  if (!TEXT_TYPES.has(item.itemType.name)) {
    notFound();
  }

  const body =
    item.itemType.name === 'command' ? commandCopyText(item.content) : (item.content ?? '');

  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
