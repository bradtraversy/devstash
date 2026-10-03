// Run: npx tsx --tsconfig tsconfig.json scripts/render-homepage-images.tsx
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SAMPLE_ITEM } from '@/components/homepage/samples';
import { ItemCard } from '@/lib/og/cards';
import { itemImage, itemPreview } from '@/lib/og/preview';
import { renderOgImage } from '@/lib/og/render';
import { SnippetImage, snippetImageSize } from '@/lib/og/snippet-image';

const OUT_DIR = join(process.cwd(), 'public/homepage');

async function save(name: string, response: Response) {
  const path = join(OUT_DIR, name);
  await writeFile(path, Buffer.from(await response.arrayBuffer()));
  console.log(`Wrote ${path}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const preview = await itemPreview(SAMPLE_ITEM);
  await save('sample-card.png', await renderOgImage(<ItemCard item={SAMPLE_ITEM} {...preview} />));

  const { lines, hidden } = await itemImage(SAMPLE_ITEM);
  const size = snippetImageSize(lines, hidden);
  const image = { ...SAMPLE_ITEM, shared: true };
  await save('sample-image.png', await renderOgImage(<SnippetImage item={image} lines={lines} hidden={hidden} />, size));
  console.log(`sample-image.png is ${size.width}x${size.height}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
