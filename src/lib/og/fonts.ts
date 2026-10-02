import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface OgFont {
  name: string;
  data: Buffer;
  weight: 400 | 600;
  style: 'normal';
}

let fontsPromise: Promise<OgFont[]> | null = null;

// Literal paths joined onto process.cwd() are what output file tracing follows, so the files ship with the function.
function loadSans() {
  return readFile(join(process.cwd(), 'src/lib/og/fonts/Geist-SemiBold.ttf'));
}

function loadMono() {
  return readFile(join(process.cwd(), 'src/lib/og/fonts/GeistMono-Regular.ttf'));
}

/** The two vendored Geist faces (OFL 1.1), read once per process. */
export function loadOgFonts(): Promise<OgFont[]> {
  fontsPromise ??= Promise.all([loadSans(), loadMono()])
    .then(([sans, mono]): OgFont[] => [
      { name: 'Geist', data: sans, weight: 600, style: 'normal' },
      { name: 'Geist Mono', data: mono, weight: 400, style: 'normal' },
    ])
    .catch((error: unknown) => {
      fontsPromise = null;
      throw error;
    });
  return fontsPromise;
}
