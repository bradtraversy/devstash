import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import DashboardLayout from '@/components/layout/dashboard-layout';
import CollectionActions from '@/components/collections/collection-actions';
import CollectionItemList from '@/components/collections/collection-item-list';
import ListLayoutSwitch from '@/components/items/list-layout-switch';
import VisibilityControl from '@/components/collections/visibility-control';
import Pagination from '@/components/shared/pagination';
import { getSidebarCollections, getCollectionById } from '@/lib/db/collections';
import { getItemTypesWithCounts, getItemsByCollection } from '@/lib/db/items';
import { getUserById, getEditorPreferences } from '@/lib/db/users';
import { getItemTypeIcon } from '@/lib/constants/item-types';
import { ITEMS_PER_PAGE } from '@/lib/constants/pagination';
import { LIST_LAYOUT_COOKIE, parseListLayout } from '@/lib/list-layout';
import { getCodePreviews } from '@/lib/item-previews';
import { Star } from 'lucide-react';

interface CollectionDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function CollectionDetailPage({ params, searchParams }: CollectionDetailPageProps) {
  const { id: collectionId } = await params;
  const { page: pageParam } = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const user = await getUserById(session.user.id);

  if (!user) {
    redirect('/sign-in');
  }

  const collection = await getCollectionById(collectionId, user.id);

  if (!collection) {
    notFound();
  }

  // Parse page number (default to 1)
  const currentPage = Math.max(1, parseInt(pageParam || '1', 10) || 1);

  const [paginatedItems, itemTypes, sidebarCollections, editorPreferences, cookieStore] = await Promise.all([
    getItemsByCollection(user.id, collectionId, currentPage, ITEMS_PER_PAGE),
    getItemTypesWithCounts(user.id),
    getSidebarCollections(user.id),
    getEditorPreferences(user.id),
    cookies(),
  ]);

  const { items, totalPages } = paginatedItems;
  const layout = parseListLayout(cookieStore.get(LIST_LAYOUT_COOKIE)?.value);
  const previews = layout === 'cards' ? await getCodePreviews(items) : undefined;

  return (
    <DashboardLayout
      itemTypes={itemTypes}
      sidebarCollections={sidebarCollections}
      user={user}
      editorPreferences={editorPreferences}
      isPro={session.user.isPro}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">{collection.name}</h1>
              {collection.isFavorite && (
                <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
              )}
              <span className="text-muted-foreground">
                ({collection.itemCount} {collection.itemCount === 1 ? 'item' : 'items'})
              </span>
            </div>
            <CollectionActions collection={collection} />
          </div>
          {collection.description && (
            <p className="text-muted-foreground">{collection.description}</p>
          )}
          {collection.itemTypes.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              {collection.itemTypes.map((itemType) => {
                const IconComponent = getItemTypeIcon(itemType.icon);
                return (
                  <div key={itemType.name} className="flex items-center gap-1">
                    <IconComponent
                      className="h-4 w-4"
                      style={{ color: itemType.color }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {itemType.count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sharing */}
        <VisibilityControl
          key={collection.id}
          collection={collection}
          handle={collection.ownerHandle}
        />

        {/* Items in position order */}
        {items.length > 0 ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <ListLayoutSwitch layout={layout} />
            </div>
            <CollectionItemList
              items={items}
              collectionId={collectionId}
              layout={layout}
              previews={previews}
              currentPage={currentPage}
              totalPages={totalPages}
            />
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              This collection is empty. Add items to get started!
            </p>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          baseUrl={`/collections/${collectionId}`}
        />
      </div>
    </DashboardLayout>
  );
}
