const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'devstash-db']);

/**
 * True only for a Postgres URL that points at a local development database.
 * Destructive scripts refuse to run against anything else.
 */
export function isLocalDatabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return LOCAL_HOSTS.has(parsed.hostname.replace(/^\[|\]$/g, ''));
  } catch {
    return false;
  }
}
