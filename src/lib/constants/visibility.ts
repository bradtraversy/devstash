export const COLLECTION_VISIBILITIES = ['PRIVATE', 'UNLISTED', 'PUBLIC'] as const;

export type CollectionVisibility = (typeof COLLECTION_VISIBILITIES)[number];

export interface VisibilityOption {
  value: CollectionVisibility;
  label: string;
  description: string;
}

export const VISIBILITY_OPTIONS: VisibilityOption[] = [
  { value: 'PRIVATE', label: 'Private', description: 'Only you can see this' },
  {
    value: 'UNLISTED',
    label: 'Unlisted',
    description: 'Anyone with the link can view it. It is not listed or indexed',
  },
  {
    value: 'PUBLIC',
    label: 'Public',
    description: 'Anyone can view it, it is listed on your profile, and search engines may index it',
  },
];

/** Result of a visibility write; handle is set when the write made the owner's handle. */
export interface VisibilityUpdate {
  visibility: CollectionVisibility;
  publishedAt: Date | null;
  handle: string | null;
}

export function getVisibilityOption(value: CollectionVisibility): VisibilityOption {
  return VISIBILITY_OPTIONS.find((option) => option.value === value) ?? VISIBILITY_OPTIONS[0];
}

/** Says plainly that sharing a collection exposes every item in it, whatever each item's own setting. */
export function collectionShareNotice(
  itemCount: number,
  privateItemCount: number,
  visibility: CollectionVisibility
): string | null {
  if (itemCount <= 0) return null;
  const all = itemCount === 1 ? 'its 1 item' : `all ${itemCount} of its items`;
  const privatePart =
    privateItemCount > 0 ? `, including ${privateItemCount} set to Private` : '';
  if (visibility === 'PRIVATE') {
    return `Sharing this collection makes ${all} visible to anyone with the link${privatePart}.`;
  }
  if (privateItemCount <= 0) return null;
  return `This collection is shared, so ${all} ${itemCount === 1 ? 'is' : 'are'} visible to anyone with the link${privatePart}.`;
}

export interface SharedViaCollection {
  id: string;
  name: string;
  visibility: CollectionVisibility;
}

/** Why a private item is visible anyway: the shared collections it sits in, or null when there are none. */
export function describeSharedVia(collections: Pick<SharedViaCollection, 'name' | 'visibility'>[]): string | null {
  const names = collections.filter((collection) => collection.visibility !== 'PRIVATE').map((collection) => collection.name);
  if (names.length === 0) return null;
  if (names.length === 1) return `Shared via the ${names[0]} collection, so anyone with its link can see it`;
  const list =
    names.length === 2
      ? `the ${names[0]} and ${names[1]} collections`
      : `${names.length} collections: ${names[0]}, ${names[1]}, and ${names.length - 2} more`;
  return `Shared via ${list}, so anyone with their links can see it`;
}
