import { authenticateApiRequest } from '@/lib/api/auth';
import { apiPatchItemSchema, fromApiVisibility, toApiItem, toUpdateItemData } from '@/lib/api/items';
import {
  apiError,
  apiJson,
  notFoundResponse,
  readJsonBody,
  serverErrorResponse,
  validationResponse,
  writeFailureResponse,
} from '@/lib/api/respond';
import { findOwnedItems, getItemByRef } from '@/lib/db/items';
import { deleteItemForUser, setItemVisibilityForUser, updateItemForUser } from '@/lib/item-writes';

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

    const parsed = apiPatchItemSchema.safeParse(json.body);
    if (!parsed.success) {
      return validationResponse(parsed.error);
    }

    const { id } = await params;
    const item = await getItemByRef(auth.user.id, id);
    if (!item) return notFoundResponse();

    if (parsed.data.visibility !== undefined) {
      const result = await setItemVisibilityForUser(
        auth.user.id,
        item.id,
        fromApiVisibility(parsed.data.visibility)
      );
      if (!result.success) return writeFailureResponse(result);

      const updated = await getItemByRef(auth.user.id, item.id);
      if (!updated) return notFoundResponse();
      return apiJson({ item: toApiItem(updated) });
    }

    const built = toUpdateItemData(item, parsed.data);
    if (built.fieldErrors) return apiError(400, 'Validation failed', built.fieldErrors);

    const result = await updateItemForUser(auth.user.id, item.id, built.data);
    if (!result.success || !result.data) return writeFailureResponse(result);

    return apiJson({ item: toApiItem(result.data) });
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
