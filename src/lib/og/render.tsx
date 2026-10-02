import { ImageResponse } from 'next/og';
import type { ReactElement } from 'react';
import { OG_IMAGE_SIZE } from './constants';
import { loadOgFonts } from './fonts';

// The renderer's own default is a year of immutable caching; these images change with their pages.
export const OG_CACHE_CONTROL = 'public, max-age=0, must-revalidate';

/** A 1200x630 PNG response for a card element, in the app's own fonts. */
export async function renderOgImage(element: ReactElement): Promise<ImageResponse> {
  const fonts = await loadOgFonts();
  return new ImageResponse(element, {
    ...OG_IMAGE_SIZE,
    fonts,
    headers: { 'Cache-Control': OG_CACHE_CONTROL },
  });
}
