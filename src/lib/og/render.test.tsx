import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/og', () => ({
  ImageResponse: vi.fn(function (this: Record<string, unknown>, element: unknown, options: unknown) {
    this.element = element;
    this.options = options;
  }),
}));

const fonts = [
  { name: 'Geist', data: Buffer.from('sans'), weight: 600, style: 'normal' },
  { name: 'Geist Mono', data: Buffer.from('mono'), weight: 400, style: 'normal' },
];

vi.mock('./fonts', () => ({ loadOgFonts: vi.fn(async () => fonts) }));

import { ImageResponse } from 'next/og';
import { renderOgImage, renderOwnerImage } from './render';

type Captured = { element: unknown; options: Record<string, unknown> };

describe('renderOgImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the element at the card size with both vendored fonts and a revalidating cache header', async () => {
    const element = <div>card</div>;

    const response = (await renderOgImage(element)) as unknown as Captured;

    expect(ImageResponse).toHaveBeenCalledTimes(1);
    expect(response.element).toBe(element);
    expect(response.options).toEqual({
      width: 1200,
      height: 630,
      fonts,
      headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
    });
  });

  it('takes another size for the full image', async () => {
    const response = (await renderOgImage(<div>image</div>, { width: 1800, height: 4000 })) as unknown as Captured;

    expect(response.options).toMatchObject({ width: 1800, height: 4000 });
  });
});

describe('renderOwnerImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is never cached and streams inline without a filename', async () => {
    const response = (await renderOwnerImage(<div>mine</div>, { width: 1200, height: 500 })) as unknown as Captured;

    expect(response.options).toEqual({
      width: 1200,
      height: 500,
      fonts,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  });

  it('becomes an attachment when a filename is given', async () => {
    const response = (await renderOwnerImage(<div>mine</div>, { width: 1200, height: 500 }, 'use-auth.png')) as unknown as Captured;

    expect(response.options.headers).toEqual({
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'attachment; filename="use-auth.png"',
    });
  });
});
