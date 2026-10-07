import { authenticateApiRequest } from '@/lib/api/auth';
import { apiUpdateItemSchema, fromApiVisibility, toApiItem } from '@/lib/api/items';
import {
  apiJson,
  notFoundResponse,
  readJsonBody,
  serverErrorResponse,
  validationResponse,
  writeFailureResponse,
} from '@/lib/api/respond';
import { findOwnedItems, getItemByRef } from '@/lib/db/items';
import { deleteItemForUser, setItemVisibilityForUser } from '@/lib/item-writes';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const auth = await authenticateApiRequest(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const item = await getItemByRef(auth.user.id, id);
    if (!item) return notFoundResponse();

    return apiJson({ item: toApiItem(item) });
  } catch (error) {
    return serverErrorResponse('API get item failed', error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const auth = await authenticateApiRequest(request);
    if (auth.response) return auth.response;

    const json = await readJsonBody(request);
    if (json.response) return json.response;

    const parsed = apiUpdateItemSchema.safeParse(json.body);
    if (!parsed.success) {
      return validationResponse(parsed.error, 'Only visibility can be changed through the API');
    }

    const { id } = await params;
    const item = await getItemByRef(auth.user.id, id);
    if (!item) return notFoundResponse();

    const result = await setItemVisibilityForUser(
      auth.user.id,
      item.id,
      fromApiVisibility(parsed.data.visibility)
    );
    if (!result.success) return writeFailureResponse(result);

    const updated = await getItemByRef(auth.user.id, item.id);
    if (!updated) return notFoundResponse();

    return apiJson({ item: toApiItem(updated) });
  } catch (error) {
    return serverErrorResponse('API update item failed', error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const auth = await authenticateApiRequest(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const [item] = await findOwnedItems(auth.user.id, [id]);
    if (!item) return notFoundResponse();

    const result = await deleteItemForUser(auth.user.id, item.id);
    if (!result.success) return writeFailureResponse(result);

    return apiJson({ deleted: { id: item.id, title: item.title } });
  } catch (error) {
    return serverErrorResponse('API delete item failed', error);
  }
}
