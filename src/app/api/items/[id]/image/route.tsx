import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getItemById } from '@/lib/db/items';
import { getUserHandle } from '@/lib/db/users';
import { isTextType } from '@/lib/constants/item-types';
import { imageFilename } from '@/lib/og/filename';
import { itemImage } from '@/lib/og/preview';
import { renderOwnerImage } from '@/lib/og/render';
import { SnippetImage, snippetImageSize } from '@/lib/og/snippet-image';

interface OwnerImageContext {
  params: Promise<{ id: string }>;
}

/** The owner's own item as a PNG, shared or not; `?download=1` makes it an attachment. */
export async function GET(request: Request, { params }: OwnerImageContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const item = await getItemById(session.user.id, id);
    if (!item || !isTextType(item.itemType.name)) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const [handle, { lines, hidden }] = await Promise.all([
      getUserHandle(session.user.id),
      itemImage(item),
    ]);
    const image = {
      title: item.title,
      language: item.language,
      itemType: item.itemType,
      shortId: item.shortId,
      handle,
      shared: item.visibility !== 'PRIVATE',
    };
    const download = new URL(request.url).searchParams.get('download') === '1';

    // Awaited so a renderer failure lands in the catch below instead of escaping as a rejected promise.
    return await renderOwnerImage(
      <SnippetImage item={image} lines={lines} hidden={hidden} />,
      snippetImageSize(lines, hidden),
      download ? imageFilename(item.title) : undefined
    );
  } catch (error) {
    console.error('Item image error:', error);
    return NextResponse.json({ error: 'An error occurred while rendering the image' }, { status: 500 });
  }
}
