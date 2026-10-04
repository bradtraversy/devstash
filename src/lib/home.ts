export const HOME_FILTERS = ['all', 'shared', 'pinned'] as const;

export type HomeFilter = (typeof HOME_FILTERS)[number];

export function parseHomeFilter(value: string | string[] | undefined): HomeFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return (HOME_FILTERS as readonly string[]).includes(raw ?? '') ? (raw as HomeFilter) : 'all';
}

/** The Home URL for a filter, leaving out the default so the plain path stays canonical. */
export function homeFilterPath(filter: HomeFilter): string {
  return filter === 'all' ? '/dashboard' : `/dashboard?show=${filter}`;
}
