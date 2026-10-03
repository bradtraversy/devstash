import { auth } from '@/auth';
import { checkRateLimit, formatRetryTime } from '@/lib/rate-limit';
import { UNAUTHORIZED_ERROR } from '@/lib/constants/action-errors';
import { hasAiAccess } from '@/lib/plans';

/**
 * Standard server action result shape used across all actions.
 */
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

interface AuthedSession {
  user: {
    id: string;
    isPro?: boolean;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

/**
 * Retrieves the authenticated session or returns an Unauthorized result.
 */
export async function getAuthedSession(): Promise<
  { session: AuthedSession; unauthorized?: never } |
  { session?: never; unauthorized: ActionResult<never> }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { unauthorized: { success: false, error: UNAUTHORIZED_ERROR } };
  }
  return { session: session as AuthedSession };
}

/**
 * Checks if the user has Pro status. Returns an error result if not.
 */
export function requirePro(isPro: boolean | undefined): ActionResult<never> | null {
  if (!hasAiAccess(isPro)) {
    return { success: false, error: 'AI features require a Pro subscription' };
  }
  return null;
}

/**
 * Checks the AI rate limit for a given user.
 * Returns an error result if rate limited, or null if allowed.
 */
export async function checkAiRateLimit(
  userId: string
): Promise<ActionResult<never> | null> {
  const rateLimit = await checkRateLimit('ai', userId);
  if (!rateLimit.success) {
    const retryTime = formatRetryTime(rateLimit.retryAfter);
    return {
      success: false,
      error: `Too many AI requests. Please try again in ${retryTime}.`,
    };
  }
  return null;
}
