'use server';

import { z } from 'zod';
import {
  ApiTokenLimitError,
  createApiToken as createApiTokenQuery,
  revokeApiToken as revokeApiTokenQuery,
  type CreatedApiToken,
} from '@/lib/db/api-tokens';
import { API_TOKEN_NAME_MAX } from '@/lib/constants/api-tokens';
import { getAuthedSession, type ActionResult } from '@/lib/action-utils';
import { parseZodErrors, validateId } from '@/lib/validation';

const createApiTokenSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the token a name')
    .max(API_TOKEN_NAME_MAX, `Keep the name to ${API_TOKEN_NAME_MAX} characters`),
});

export type CreateApiTokenInput = z.infer<typeof createApiTokenSchema>;

export async function createApiToken(
  input: CreateApiTokenInput
): Promise<ActionResult<CreatedApiToken>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const parsed = createApiTokenSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  try {
    const created = await createApiTokenQuery(session.user.id, parsed.data.name);
    return { success: true, data: created };
  } catch (error) {
    if (error instanceof ApiTokenLimitError) {
      return { success: false, error: error.message };
    }
    console.error('Failed to create API token', error);
    return { success: false, error: 'Failed to create token' };
  }
}

export async function revokeApiToken(tokenId: string): Promise<ActionResult<null>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const idError = validateId(tokenId, 'token ID');
  if (idError) return idError;

  const revoked = await revokeApiTokenQuery(session.user.id, tokenId);
  if (!revoked) {
    return { success: false, error: 'Token not found' };
  }

  return { success: true };
}
