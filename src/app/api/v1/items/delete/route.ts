import { authenticateApiRequest } from '@/lib/api/auth';
import { deleteItemsForUser } from '@/lib/api/bulk-delete';
import { apiBulkDeleteSchema } from '@/lib/api/items';
import { apiJson, readJsonBody, serverErrorResponse, validationResponse } from '@/lib/api/respond';

export async function POST(request: Request) {
  try {
    const auth = await authenticateApiRequest(request);
    if (auth.response) return auth.response;

    const json = await readJsonBody(request);
    if (json.response) return json.response;

    const parsed = apiBulkDeleteSchema.safeParse(json.body);
    if (!parsed.success) return validationResponse(parsed.error);

    const result = await deleteItemsForUser(auth.user.id, parsed.data.ids);
    if (result.failedPartway) {
      return apiJson({ error: 'Something went wrong partway through', deleted: result.deleted }, 500);
    }

    return apiJson({ deleted: result.deleted, notFound: result.notFound });
  } catch (error) {
    return serverErrorResponse('API bulk delete failed', error);
  }
}
