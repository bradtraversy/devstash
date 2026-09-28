import { z } from 'zod';
import { isValidSlug, RESERVED_HANDLES, RESERVED_SLUGS } from '@/lib/slugs';

const SLUG_FORMAT_MESSAGE = 'Use lowercase letters, numbers, and hyphens';
const RESERVED_MESSAGE = 'That name is reserved';

/** A collection slug as typed by its owner: trimmed and lowercased, then checked for format and reserved words. */
export const collectionSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine(isValidSlug, SLUG_FORMAT_MESSAGE)
  .refine((value) => !RESERVED_SLUGS.has(value), RESERVED_MESSAGE);

/** A user handle as typed in settings, with the same rules against the reserved route list. */
export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine(isValidSlug, SLUG_FORMAT_MESSAGE)
  .refine((value) => !RESERVED_HANDLES.has(value), RESERVED_MESSAGE);

/**
 * Parse Zod validation errors into a field-keyed error map
 */
export function parseZodErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path[0]?.toString() || 'unknown';
    if (!fieldErrors[field]) {
      fieldErrors[field] = [];
    }
    fieldErrors[field].push(issue.message);
  }
  return fieldErrors;
}

/**
 * Validate URL uses http or https protocol only (prevents javascript:, data:, etc.)
 */
export function isValidUrlProtocol(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Zod schema for URLs that only allows http/https protocols
 */
export const safeUrlSchema = z
  .string()
  .url('Invalid URL')
  .refine(isValidUrlProtocol, 'URL must use http or https protocol')
  .nullable()
  .optional()
  .transform((val) => val || null);

/**
 * Validates that a string ID is non-empty.
 * Returns an error result if invalid, or null if valid.
 */
export function validateId(
  id: string,
  label: string
): { success: false; error: string } | null {
  if (!id || id.trim().length === 0) {
    return { success: false, error: `Invalid ${label}` };
  }
  return null;
}
