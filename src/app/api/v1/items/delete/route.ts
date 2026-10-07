import { authenticateApiRequest } from '@/lib/api/auth';
import { apiBulkDeleteSchema } from '@/lib/api/items';
import { apiJson, readJsonBody, serverErrorResponse, validationResponse } from '@/lib/api/respond';
import { findOwnedItems } from '@/lib/db/items';
import { deleteItemForUser } from '@/lib/item-writes';

export async function POST(request: Request) {
  try {
    const auth = await authenticateApiRequest(request);
    if (auth.response) return auth.response;

    const json = await readJsonBody(request);
    if (json.response) return json.response;

    const parsed = apiBulkDeleteSchema.safeParse(json.body);
    if (!parsed.success) return validationResponse(parsed.error);

    const refs = [...new Set(parsed.data.ids)];
    const owned = await findOwnedItems(auth.user.id, refs);
    const deleted: { id: string; title: string }[] = [];
    const removedRefs = new Set<string>();

    for (const item of owned) {
      try {
        const result = await deleteItemForUser(auth.user.id, item.id);
        if (!result.success) continue;
      } catch (error) {
        // Report what was already removed, since those deletes cannot be taken back.
        console.error('API bulk delete stopped partway', error);
        return apiJson({ error: 'Something went wrong partway through', deleted }, 500);
      }
      deleted.push({ id: item.id, title: item.title });
      removedRefs.add(item.id);
      removedRefs.add(item.shortId);
    }

    return apiJson({ deleted, notFound: refs.filter((ref) => !removedRefs.has(ref)) });
  } catch (error) {
    return serverErrorResponse('API bulk delete failed', error);
  }
}
