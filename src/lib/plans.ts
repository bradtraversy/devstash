/** Pro is off unless NEXT_PUBLIC_PRO_ENABLED is "true"; read per call so tests can stub it. */
export function isProEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PRO_ENABLED === 'true';
}

export function isProUser(isPro: boolean | undefined): boolean {
  return isProEnabled() && Boolean(isPro);
}

export function hasAiAccess(isPro: boolean | undefined): boolean {
  return !isProEnabled() || Boolean(isPro);
}

export function hasFileAccess(isPro: boolean | undefined): boolean {
  return isProUser(isPro);
}

const FILE_TYPE_NAMES = ['file', 'image'];

/** While Pro is off, Files and Images stay in the sidebar only for users who already have some. */
export function isTypeListed(type: { name: string; count: number }): boolean {
  return isProEnabled() || !FILE_TYPE_NAMES.includes(type.name) || type.count > 0;
}

export function showsProBadge(typeName: string): boolean {
  return isProEnabled() && FILE_TYPE_NAMES.includes(typeName);
}
