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
    description: 'Anyone can view it and search engines may index it',
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
