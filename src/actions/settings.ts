'use server';

import { z } from 'zod';
import {
  updateEditorPreferences as updateEditorPreferencesQuery,
  updateUserHandle as updateUserHandleQuery,
} from '@/lib/db/users';
import {
  type EditorPreferences,
  EDITOR_THEMES,
  FONT_SIZES,
  TAB_SIZES,
} from '@/lib/constants/editor';
import { getAuthedSession, type ActionResult } from '@/lib/action-utils';
import { handleSchema, parseZodErrors } from '@/lib/validation';
import { isUniqueViolation } from '@/lib/db/errors';
import { publicPathsForUser } from '@/lib/db/public';
import { lookupPublicPaths, revalidateAfterWrite } from '@/lib/public/revalidate';

const editorPreferencesSchema = z.object({
  fontSize: z.number().refine((val) => FONT_SIZES.includes(val), {
    message: 'Invalid font size',
  }),
  tabSize: z.number().refine((val) => TAB_SIZES.includes(val), {
    message: 'Invalid tab size',
  }),
  wordWrap: z.boolean(),
  minimap: z.boolean(),
  theme: z.enum(EDITOR_THEMES.map((t) => t.value) as [string, ...string[]]),
});

export async function updateEditorPreferences(
  input: EditorPreferences
): Promise<ActionResult> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const parsed = editorPreferencesSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Invalid preferences' };
  }

  try {
    const updated = await updateEditorPreferencesQuery(session.user.id, parsed.data as EditorPreferences);

    if (!updated) {
      return { success: false, error: 'Failed to update preferences' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update preferences' };
  }
}

const updateHandleSchema = z.object({
  handle: handleSchema,
});

export type UpdateHandleInput = z.input<typeof updateHandleSchema>;

export async function updateHandle(
  input: UpdateHandleInput
): Promise<ActionResult<{ handle: string }>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const parsed = updateHandleSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  try {
    const before = await lookupPublicPaths(() => publicPathsForUser(session.user.id));
    await updateUserHandleQuery(session.user.id, parsed.data.handle);
    await revalidateAfterWrite(before, () => publicPathsForUser(session.user.id));
    return { success: true, data: { handle: parsed.data.handle } };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { success: false, error: 'Validation failed', fieldErrors: { handle: ['That handle is taken'] } };
    }
    return { success: false, error: 'Failed to update handle' };
  }
}
