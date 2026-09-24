/**
 * Accepts only same-origin paths for post-auth redirects. Anything absolute,
 * protocol-relative, or backslash-tricked falls back to the default.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value) return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (/[\r\n]/.test(value)) return fallback;
  return value;
}
