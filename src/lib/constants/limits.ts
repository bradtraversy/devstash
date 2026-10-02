export const MAX_ITEMS = 50;
export const MAX_COLLECTIONS = 3;

export const ITEM_LIMIT_ERROR = `You have reached the free tier limit of ${MAX_ITEMS} items. Upgrade to Pro for unlimited items.`;
export const COLLECTION_LIMIT_ERROR = `You have reached the free tier limit of ${MAX_COLLECTIONS} collections. Upgrade to Pro for unlimited collections.`;

/** Largest collection a viewer can save in one go; the copy runs as one transaction. */
export const SAVE_COLLECTION_ITEM_LIMIT = 200;
