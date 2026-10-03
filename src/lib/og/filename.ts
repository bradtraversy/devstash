import { slugify } from '@/lib/slugs';

/** `use-auth-hook.png`: the suggested name for a downloaded snippet image. */
export function imageFilename(title: string): string {
  return `${slugify(title) || 'snippet'}.png`;
}
