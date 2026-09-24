import { describe, it, expect } from 'vitest';
import { isLocalDatabaseUrl } from './local-db';

describe('isLocalDatabaseUrl', () => {
  it('accepts localhost, loopback, and the docker container name', () => {
    expect(isLocalDatabaseUrl('postgresql://postgres:x@localhost:5432/neondb')).toBe(true);
    expect(isLocalDatabaseUrl('postgresql://postgres:x@127.0.0.1:5432/neondb')).toBe(true);
    expect(isLocalDatabaseUrl('postgresql://postgres:x@[::1]:5432/neondb')).toBe(true);
    expect(isLocalDatabaseUrl('postgresql://postgres:x@devstash-db:5432/neondb')).toBe(true);
  });

  it('rejects hosted databases and junk', () => {
    expect(isLocalDatabaseUrl('postgresql://u:p@ep-abc-123-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require')).toBe(false);
    expect(isLocalDatabaseUrl('postgresql://u:p@localhost.evil.example/db')).toBe(false);
    expect(isLocalDatabaseUrl('not a url')).toBe(false);
    expect(isLocalDatabaseUrl(undefined)).toBe(false);
    expect(isLocalDatabaseUrl('')).toBe(false);
  });
});
