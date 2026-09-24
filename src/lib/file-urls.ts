/**
 * The configured R2 public URL without trailing slashes, so every place that
 * builds or checks a file URL agrees on the prefix.
 */
export function r2PublicUrl(): string | null {
  const value = process.env.R2_PUBLIC_URL?.replace(/\/+$/, '');
  return value || null;
}

// Uploaded keys are `${userId}/${timestamp}-${sanitized name}` and never contain
// separators or percent signs, so anything else in a segment is a smuggling attempt
// (the URL parser would turn %2e%2e or a backslash into a dot segment later).
function isSafeSegment(segment: string): boolean {
  return segment !== '' && segment !== '.' && segment !== '..' && !/[\\/%]/.test(segment);
}

/**
 * Returns the R2 object key for a URL inside the caller's own namespace
 * (`${R2_PUBLIC_URL}/${userId}/...`), or null for any other URL.
 */
export function ownedFileKey(
  fileUrl: string | null | undefined,
  userId: string
): string | null {
  const publicUrl = r2PublicUrl();
  if (!fileUrl || !publicUrl || !userId) return null;

  const prefix = `${publicUrl}/${userId}/`;
  if (!fileUrl.startsWith(prefix)) return null;

  const rest = fileUrl.slice(prefix.length);
  if (!rest || /[?#]/.test(rest)) return null;
  if (!rest.split('/').every(isSafeSegment)) return null;

  return `${userId}/${rest}`;
}

export function isOwnedFileUrl(fileUrl: string | null | undefined, userId: string): boolean {
  return ownedFileKey(fileUrl, userId) !== null;
}

/**
 * Resolves the catch-all segments of a download request to an R2 key inside the
 * caller's namespace. Segments are decoded once more (Next already decoded once)
 * so encoded dot segments cannot slip past the prefix check.
 */
export function ownedDownloadKey(segments: string[], userId: string): string | null {
  if (!userId || segments.length < 2) return null;

  const decoded: string[] = [];
  for (const raw of segments) {
    let segment = raw;
    try {
      segment = decodeURIComponent(raw);
    } catch {
      return null;
    }
    if (!isSafeSegment(segment)) return null;
    decoded.push(segment);
  }

  if (decoded[0] !== userId) return null;
  return decoded.join('/');
}
