import type { z } from 'zod';
import { formatRetryTime } from '@/lib/rate-limit';
import type { WriteFailure, WriteResult } from '@/lib/item-writes';

type FieldErrors = Record<string, string[]>;

const FAILURE_STATUS: Record<WriteFailure, number> = {
  invalid: 400,
  forbidden: 403,
  'not-found': 404,
  error: 500,
};

export function apiJson(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

export function apiError(
  status: number,
  error: string,
  fieldErrors?: FieldErrors,
  headers?: Record<string, string>
): Response {
  return apiJson(fieldErrors ? { error, fieldErrors } : { error }, status, headers);
}

export function unauthorizedResponse(): Response {
  return apiError(401, 'Invalid or missing API token', undefined, { 'WWW-Authenticate': 'Bearer' });
}

export function rateLimitedResponse(retryAfter: number): Response {
  return apiError(429, `Too many requests. Try again in ${formatRetryTime(retryAfter)}.`, undefined, {
    'Retry-After': String(retryAfter),
  });
}

export function notFoundResponse(): Response {
  return apiError(404, 'Item not found');
}

export function serverErrorResponse(context: string, error: unknown): Response {
  console.error(context, error);
  return apiError(500, 'Something went wrong');
}

export function writeFailureResponse(result: WriteResult<unknown>): Response {
  return apiError(FAILURE_STATUS[result.failure ?? 'error'], result.error ?? 'Request failed', result.fieldErrors);
}

/** Field errors keyed by the field, with keys the schema does not know reported under their own name. */
export function apiFieldErrors(error: z.ZodError, unknownFieldMessage = 'Unknown field'): FieldErrors {
  const fieldErrors: FieldErrors = {};
  const add = (field: string, message: string) => (fieldErrors[field] ??= []).push(message);

  for (const issue of error.issues) {
    if (issue.code === 'unrecognized_keys') {
      issue.keys.forEach((key) => add(key, unknownFieldMessage));
    } else {
      add(issue.path[0]?.toString() ?? 'body', issue.message);
    }
  }
  return fieldErrors;
}

export function validationResponse(error: z.ZodError, unknownFieldMessage?: string): Response {
  return apiError(400, 'Validation failed', apiFieldErrors(error, unknownFieldMessage));
}

export async function readJsonBody(
  request: Request
): Promise<{ body: unknown; response?: never } | { body?: never; response: Response }> {
  try {
    return { body: await request.json() };
  } catch {
    return { response: apiError(400, 'Body must be valid JSON') };
  }
}
