/**
 * Returns the R2 object key for a URL inside the caller's own namespace
 * (`${R2_PUBLIC_URL}/${userId}/...`), or null for any other URL.
 */
export function ownedFileKey(
  fileUrl: string | null | undefined,
  userId: string
): string | null {
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/+$/, '');
  if (!fileUrl || !publicUrl || !userId) return null;

  const prefix = `${publicUrl}/${userId}/`;
  if (!fileUrl.startsWith(prefix)) return null;

  const rest = fileUrl.slice(prefix.length);
  if (!rest || /[?#]/.test(rest)) return null;
  if (rest.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')) {
    return null;
  }

  return `${userId}/${rest}`;
}

export function isOwnedFileUrl(fileUrl: string | null | undefined, userId: string): boolean {
  return ownedFileKey(fileUrl, userId) !== null;
}
