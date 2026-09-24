const BASE = 'http://redirect.invalid'

/**
 * Accepts only same-origin paths for post-auth redirects. The value is run
 * through the URL parser against a fixed base so parser quirks (tabs, backslashes,
 * protocol-relative forms) cannot smuggle in another origin.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/')) return fallback
  let parsed: URL
  try {
    parsed = new URL(value, BASE)
  } catch {
    return fallback
  }
  if (parsed.origin !== BASE) return fallback
  return parsed.pathname + parsed.search + parsed.hash
}
