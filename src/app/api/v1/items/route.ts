import { authenticateApiRequest } from '@/lib/api/auth';
import {
  apiCreateItemSchema,
  apiListQuerySchema,
  toApiItem,
  toApiListItem,
  toCreateItemData,
} from '@/lib/api/items';
import {
  apiError,
  apiJson,
  rateLimitedResponse,
  readJsonBody,
  serverErrorResponse,
  validationResponse,
  writeFailureResponse,
} from '@/lib/api/respond';
import { searchItems } from '@/lib/db/items';
import { createItemForUser } from '@/lib/item-writes';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(request: Request) {
  try {
    const auth = await authenticateApiRequest(request);
    if (auth.response) return auth.response;

    const parsed = apiListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return validationResponse(parsed.error);

    const { q, type, page, limit } = parsed.data;
    const result = await searchItems(auth.user.id, { query: q || undefined, typeName: type, page, limit });

    return apiJson({
      items: result.items.map(toApiListItem),
      page: result.currentPage,
      totalPages: result.totalPages,
      totalCount: result.totalCount,
    });
  } catch (error) {
    return serverErrorResponse('API list items failed', error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateApiRequest(request);
    if (auth.response) return auth.response;

    const createLimit = await checkRateLimit('apiCreate', auth.user.id);
    if (!createLimit.success) return rateLimitedResponse(createLimit.retryAfter);

    const json = await readJsonBody(request);
    if (json.response) return json.response;

    const parsed = apiCreateItemSchema.safeParse(json.body);
    if (!parsed.success) return validationResponse(parsed.error);

    const built = toCreateItemData(parsed.data);
    if (built.fieldErrors) return apiError(400, 'Validation failed', built.fieldErrors);

    const result = await createItemForUser(auth.user, built.data);
    if (!result.success || !result.data) return writeFailureResponse(result);

    return apiJson({ item: toApiItem(result.data) }, 201);
  } catch (error) {
    return serverErrorResponse('API create item failed', error);
  }
}
