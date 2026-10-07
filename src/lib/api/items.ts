import { z } from 'zod';
import { VALID_ITEM_TYPES, type CreateItemData, type ItemDetail, type ItemWithType } from '@/lib/db/items';
import type { CollectionSummary } from '@/lib/db/collections';
import type { CollectionVisibility } from '@/lib/constants/visibility';
import { LANGUAGES } from '@/lib/constants/editor';
import { MAX_PAGE } from '@/lib/page-size';
import { PASTE_TYPES, detectPasteType, pasteAs, type PasteGuess, type PasteType } from '@/lib/paste';
import { publicShortPath, siteOrigin } from '@/lib/public/paths';

export const API_VISIBILITIES = ['private', 'unlisted', 'public'] as const;
export type ApiVisibility = (typeof API_VISIBILITIES)[number];

export const BULK_DELETE_LIMIT = 100;
const PREVIEW_LENGTH = 200;
const LANGUAGE_VALUES = LANGUAGES.map((language) => language.value);
const VISIBILITY_MESSAGE = 'visibility must be private, unlisted, or public';

export function toApiVisibility(visibility: CollectionVisibility): ApiVisibility {
  return visibility.toLowerCase() as ApiVisibility;
}

export function fromApiVisibility(visibility: ApiVisibility): CollectionVisibility {
  return visibility.toUpperCase() as CollectionVisibility;
}

/** The short link anyone can open, or null while the thing is private. */
export function shareLink(shortId: string, visibility: CollectionVisibility): string | null {
  return visibility === 'PRIVATE' ? null : `${siteOrigin()}${publicShortPath(shortId)}`;
}

interface ApiItemBase {
  id: string;
  shortId: string;
  type: string;
  title: string;
  url: string | null;
  language: string | null;
  tags: string[];
  visibility: ApiVisibility;
  link: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  fileName: string | null;
  fileSize: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiItem extends ApiItemBase {
  description: string | null;
  content: string | null;
  collections: { id: string; name: string }[];
}

export interface ApiListItem extends ApiItemBase {
  preview: string | null;
}

export interface ApiCollection {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
  visibility: ApiVisibility;
  link: string | null;
}

function toApiItemBase(item: ItemDetail | ItemWithType): ApiItemBase {
  return {
    id: item.id,
    shortId: item.shortId,
    type: item.itemType.name,
    title: item.title,
    url: item.url,
    language: item.language,
    tags: item.tags,
    visibility: toApiVisibility(item.visibility),
    link: shareLink(item.shortId, item.visibility),
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    fileName: item.fileName,
    fileSize: item.fileSize,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function toApiItem(item: ItemDetail): ApiItem {
  return {
    ...toApiItemBase(item),
    description: item.description,
    content: item.content,
    collections: item.collections.map(({ id, name }) => ({ id, name })),
  };
}

export function toApiListItem(item: ItemWithType): ApiListItem {
  return {
    ...toApiItemBase(item),
    preview: item.content ? item.content.slice(0, PREVIEW_LENGTH) : item.url,
  };
}

export function toApiCollection(collection: CollectionSummary): ApiCollection {
  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    itemCount: collection.itemCount,
    visibility: toApiVisibility(collection.visibility),
    link: shareLink(collection.shortId, collection.visibility),
  };
}

export const apiListQuerySchema = z.object({
  q: z.string().trim().max(200, 'q is limited to 200 characters').optional(),
  type: z.enum(VALID_ITEM_TYPES, { message: `type must be one of ${VALID_ITEM_TYPES.join(', ')}` }).optional(),
  page: z.coerce.number().int('page must be a whole number').min(1, 'page starts at 1').max(MAX_PAGE).default(1),
  limit: z.coerce.number().int('limit must be a whole number').min(1, 'limit is 1 to 100').max(100, 'limit is 1 to 100').default(20),
});

export const apiCreateItemSchema = z.strictObject({
  content: z.string().max(500_000, 'content is limited to 500,000 characters').nullish(),
  url: z.string().trim().max(2048, 'url is limited to 2,048 characters').nullish(),
  type: z
    .enum(PASTE_TYPES, {
      message: 'type must be snippet, prompt, command, note, or link. Files and images need an upload, which the API does not do',
    })
    .nullish(),
  title: z.string().trim().min(1, 'title cannot be empty').max(200, 'title is limited to 200 characters').nullish(),
  language: z
    .string()
    .refine((value) => LANGUAGE_VALUES.includes(value), `Unknown language. Use one of: ${LANGUAGE_VALUES.join(', ')}`)
    .nullish(),
  description: z.string().trim().max(2000, 'description is limited to 2,000 characters').nullish(),
  tags: z
    .array(z.string().trim().min(1, 'tags cannot be empty').max(50, 'tags are limited to 50 characters'))
    .max(20, 'Up to 20 tags')
    .nullish(),
  collectionIds: z.array(z.string().min(1)).max(20, 'Up to 20 collections').nullish(),
  visibility: z.enum(API_VISIBILITIES, { message: VISIBILITY_MESSAGE }).nullish(),
});

export type ApiCreateItemInput = z.infer<typeof apiCreateItemSchema>;

export const apiUpdateItemSchema = z.strictObject({
  visibility: z.enum(API_VISIBILITIES, { message: VISIBILITY_MESSAGE }),
});

export const apiBulkDeleteSchema = z.strictObject({
  ids: z
    .array(z.string().trim().min(1, 'ids cannot be empty'))
    .min(1, 'Send at least one id')
    .max(BULK_DELETE_LIMIT, `Up to ${BULK_DELETE_LIMIT} ids at a time`),
});

type CreateItemBuild =
  | { data: CreateItemData; fieldErrors?: never }
  | { data?: never; fieldErrors: Record<string, string[]> };

/** A missing type is detected like the Home paste box, and every field the caller sent wins over the guess. */
export function toCreateItemData(input: ApiCreateItemInput): CreateItemBuild {
  const content = input.content ?? null;
  const url = input.url || null;
  const typeName: PasteType | null = input.type ?? (url ? 'link' : content ? detectPasteType(content) : null);

  if (!typeName) {
    return { fieldErrors: { content: ['Send content, or a url for a link'] } };
  }

  let guess: PasteGuess | null;
  if (typeName === 'link') {
    if (url && content?.trim()) {
      return { fieldErrors: { content: ['A link takes a url and no content'] } };
    }
    guess = pasteAs(url ?? content ?? '', 'link');
    if (!guess) return { fieldErrors: { url: ['A link needs one http or https URL'] } };
  } else {
    if (url) return { fieldErrors: { url: ['Only links take a url'] } };
    guess = content ? pasteAs(content, typeName) : null;
    if (!guess) return { fieldErrors: { content: [`A ${typeName} needs content`] } };
  }

  if (input.language && typeName !== 'snippet' && typeName !== 'command') {
    return { fieldErrors: { language: ['Only snippets and commands take a language'] } };
  }

  return {
    data: {
      typeName,
      title: input.title ?? guess.title,
      description: input.description || null,
      content: guess.content,
      url: guess.url,
      language: input.language ?? guess.language,
      tags: [...new Set(input.tags ?? [])],
      collectionIds: [...new Set(input.collectionIds ?? [])],
      visibility: fromApiVisibility(input.visibility ?? 'private'),
    },
  };
}
