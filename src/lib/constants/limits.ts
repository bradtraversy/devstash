import { isProEnabled } from '@/lib/plans';

const FREE_ITEMS = 50;
const FREE_COLLECTIONS = 3;
// With Pro off there is nothing to upgrade to, so the caps only stop runaway scripts.
const CEILING_ITEMS = 1000;
const CEILING_COLLECTIONS = 100;

export function maxItems(): number {
  return isProEnabled() ? FREE_ITEMS : CEILING_ITEMS;
}

export function maxCollections(): number {
  return isProEnabled() ? FREE_COLLECTIONS : CEILING_COLLECTIONS;
}

export function itemLimitError(): string {
  return isProEnabled()
    ? `You have reached the free tier limit of ${FREE_ITEMS} items. Upgrade to Pro for unlimited items.`
    : `You have reached the limit of ${CEILING_ITEMS.toLocaleString('en-US')} items. Delete some to add more.`;
}

export function collectionLimitError(): string {
  return isProEnabled()
    ? `You have reached the free tier limit of ${FREE_COLLECTIONS} collections. Upgrade to Pro for unlimited collections.`
    : `You have reached the limit of ${CEILING_COLLECTIONS} collections. Delete some to add more.`;
}

export function collectionSaveError(needed: number, left: number): string {
  return isProEnabled()
    ? `Saving this collection needs ${needed} item slots and your free plan has ${left} left. Upgrade to Pro for unlimited items.`
    : `Saving this collection needs ${needed} item slots and you have ${left} left of your ${CEILING_ITEMS.toLocaleString('en-US')}.`;
}

/** Largest collection a viewer can save in one go; the copy runs as one transaction. */
export const SAVE_COLLECTION_ITEM_LIMIT = 200;
