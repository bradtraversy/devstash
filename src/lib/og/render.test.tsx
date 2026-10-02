import { describe, it, expect, vi } from 'vitest';

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
import { renderOgImage } from './render';

describe('renderOgImage', () => {
  it('renders the element at 1200x630 with both vendored fonts', async () => {
    const element = <div>card</div>;

    const response = (await renderOgImage(element)) as unknown as { element: unknown; options: unknown };

    expect(ImageResponse).toHaveBeenCalledTimes(1);
    expect(response.element).toBe(element);
    expect(response.options).toEqual({
      width: 1200,
      height: 630,
      fonts,
      headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
    });
  });
});
