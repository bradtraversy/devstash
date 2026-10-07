import { createHash, randomBytes } from 'node:crypto';
import { API_TOKEN_PREFIX } from '@/lib/constants/api-tokens';

// 32 random bytes in base64url are 43 characters with no padding.
const TOKEN_PATTERN = /^ds_[A-Za-z0-9_-]{43}$/;
const BEARER_PATTERN = /^Bearer +(\S+)$/i;

export interface GeneratedApiToken {
  token: string;
  tokenHash: string;
  lastFour: string;
}

export function hashApiToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateApiToken(): GeneratedApiToken {
  const token = `${API_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
  return { token, tokenHash: hashApiToken(token), lastFour: token.slice(-4) };
}

/** The token from an `Authorization: Bearer ds_...` header, or null for anything else. */
export function parseBearerToken(header: string | null): string | null {
  const token = header?.trim().match(BEARER_PATTERN)?.[1];
  return token && TOKEN_PATTERN.test(token) ? token : null;
}
