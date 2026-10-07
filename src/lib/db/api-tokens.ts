import { prisma } from '@/lib/prisma';
import { generateApiToken } from '@/lib/api/tokens';
import { API_TOKEN_LIMIT } from '@/lib/constants/api-tokens';

export interface ApiTokenSummary {
  id: string;
  name: string;
  lastFour: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface CreatedApiToken {
  token: string;
  apiToken: ApiTokenSummary;
}

export interface ApiTokenOwner {
  tokenId: string;
  userId: string;
  isPro: boolean;
}

const SUMMARY_SELECT = {
  id: true,
  name: true,
  lastFour: true,
  createdAt: true,
  lastUsedAt: true,
} as const;

const TOUCH_INTERVAL_MS = 10 * 60 * 1000;

export class ApiTokenLimitError extends Error {
  constructor() {
    super(`You can have up to ${API_TOKEN_LIMIT} tokens. Revoke one to make another.`);
    this.name = 'ApiTokenLimitError';
  }
}

export async function getApiTokens(userId: string): Promise<ApiTokenSummary[]> {
  return prisma.apiToken.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    select: SUMMARY_SELECT,
  });
}

/** Creates a token and returns the plain value, the only time it exists outside the caller's hands. */
export async function createApiToken(userId: string, name: string): Promise<CreatedApiToken> {
  const { token, tokenHash, lastFour } = generateApiToken();

  const apiToken = await prisma.$transaction(async (tx) => {
    // Holding the user's row lock makes the count and the insert one step, so parallel creates cannot pass the cap.
    await tx.$queryRaw`SELECT 1 FROM "users" WHERE "id" = ${userId} FOR UPDATE`;
    const count = await tx.apiToken.count({ where: { userId } });
    if (count >= API_TOKEN_LIMIT) throw new ApiTokenLimitError();

    return tx.apiToken.create({
      data: { userId, name, tokenHash, lastFour },
      select: SUMMARY_SELECT,
    });
  });

  return { token, apiToken };
}

export async function revokeApiToken(userId: string, tokenId: string): Promise<boolean> {
  const { count } = await prisma.apiToken.deleteMany({ where: { id: tokenId, userId } });
  return count > 0;
}

export async function findApiTokenOwner(tokenHash: string): Promise<ApiTokenOwner | null> {
  const row = await prisma.apiToken.findUnique({
    where: { tokenHash },
    select: { id: true, user: { select: { id: true, isPro: true } } },
  });

  return row ? { tokenId: row.id, userId: row.user.id, isPro: row.user.isPro } : null;
}

/** Records use at most once per interval, so a busy client costs one write every ten minutes. */
export async function touchApiToken(tokenId: string, now: Date = new Date()): Promise<void> {
  await prisma.apiToken.updateMany({
    where: {
      id: tokenId,
      OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: new Date(now.getTime() - TOUCH_INTERVAL_MS) } }],
    },
    data: { lastUsedAt: now },
  });
}
