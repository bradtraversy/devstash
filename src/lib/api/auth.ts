import { hashApiToken, parseBearerToken } from '@/lib/api/tokens';
import { findApiTokenOwner, touchApiToken } from '@/lib/db/api-tokens';
import { checkRateLimit } from '@/lib/rate-limit';
import { rateLimitedResponse, unauthorizedResponse } from '@/lib/api/respond';

export interface ApiUser {
  id: string;
  isPro: boolean;
}

export type ApiAuth = { user: ApiUser; response?: never } | { user?: never; response: Response };

/** Checks the bearer token, records its use, and applies the per-user request limit, in that order. */
export async function authenticateApiRequest(request: Request): Promise<ApiAuth> {
  const token = parseBearerToken(request.headers.get('authorization'));
  const owner = token ? await findApiTokenOwner(hashApiToken(token)) : null;
  if (!owner) return { response: unauthorizedResponse() };

  try {
    await touchApiToken(owner.tokenId);
  } catch (error) {
    console.error('Failed to record API token use', error);
  }

  const limit = await checkRateLimit('api', owner.userId);
  if (!limit.success) return { response: rateLimitedResponse(limit.retryAfter) };

  return { user: { id: owner.userId, isPro: owner.isPro } };
}
