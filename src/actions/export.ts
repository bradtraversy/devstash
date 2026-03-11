'use server';

import { getUserExportData, type ExportData } from '@/lib/db/export';
import { getAuthedSession, type ActionResult } from '@/lib/action-utils';

export async function exportData(): Promise<ActionResult<ExportData>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const data = await getUserExportData(session.user.id);

  return { success: true, data };
}
