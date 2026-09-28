import { revalidatePath } from 'next/cache';

export type PathLookup = () => Promise<string[]>;

/** Clears the cached public page at each path once; an empty list is a no-op. */
export function revalidatePublicPaths(paths: Iterable<string>): void {
  for (const path of new Set(paths)) {
    try {
      revalidatePath(path);
    } catch (error) {
      console.error('Failed to revalidate public path', path, error);
    }
  }
}

/** Runs a path lookup for revalidation; a failure is logged and counts as no paths so the caller's result stands. */
export async function lookupPublicPaths(lookup: PathLookup): Promise<string[]> {
  try {
    return await lookup();
  } catch (error) {
    console.error('Failed to look up public paths', error);
    return [];
  }
}

/** Revalidates the paths from before a write together with the paths the lookup returns now. */
export async function revalidateAfterWrite(before: string[], after: PathLookup): Promise<void> {
  revalidatePublicPaths([...before, ...(await lookupPublicPaths(after))]);
}
