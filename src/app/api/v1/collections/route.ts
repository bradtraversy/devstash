import { authenticateApiRequest } from '@/lib/api/auth';
import { toApiCollection } from '@/lib/api/items';
import { apiJson, serverErrorResponse } from '@/lib/api/respond';
import { getCollectionSummaries } from '@/lib/db/collections';

export async function GET(request: Request) {
  try {
    const auth = await authenticateApiRequest(request);
    if (auth.response) return auth.response;

    const collections = await getCollectionSummaries(auth.user.id);
    return apiJson({ collections: collections.map(toApiCollection) });
  } catch (error) {
    return serverErrorResponse('API list collections failed', error);
  }
}
