import { ImageResponse } from 'next/og';
import type { ReactElement } from 'react';
import { OG_IMAGE_SIZE } from './constants';
import { loadOgFonts } from './fonts';

export interface RenderSize {
  width: number;
  height: number;
}

// The renderer's own default is a year of immutable caching; these images change with their pages.
export const OG_CACHE_CONTROL = 'public, max-age=0, must-revalidate';

export const OWNER_CACHE_CONTROL = 'private, no-store';

/** A PNG response for a public card or image, in the app's own fonts, cached by path like its page. */
export async function renderOgImage(
  element: ReactElement,
  size: RenderSize = OG_IMAGE_SIZE
): Promise<ImageResponse> {
  const fonts = await loadOgFonts();
  return new ImageResponse(element, {
    ...size,
    fonts,
    headers: { 'Cache-Control': OG_CACHE_CONTROL },
  });
}

/** A PNG response for the owner's own item, never cached, as a download when a filename is given. */
export async function renderOwnerImage(
  element: ReactElement,
  size: RenderSize,
  filename?: string
): Promise<ImageResponse> {
  const fonts = await loadOgFonts();
  const headers: Record<string, string> = { 'Cache-Control': OWNER_CACHE_CONTROL };
  if (filename) {
    headers['Content-Disposition'] = `attachment; filename="${filename}"`;
  }
  return new ImageResponse(element, { ...size, fonts, headers });
}
