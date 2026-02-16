import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ItemCard from '@/components/dashboard/item-card';
import ImageThumbnailCard from '@/components/items/image-thumbnail-card';
import FileListRow from '@/components/items/file-list-row';
import CollectionActions from '@/components/collections/collection-actions';
import Pagination from '@/components/shared/pagination';
import { getSidebarCollections, getCollectionById } from '@/lib/db/collections';
import { getItemTypesWithCounts, getItemsByCollection } from '@/lib/db/items';
import { getUserById, getEditorPreferences } from '@/lib/db/users';
import { getItemTypeIcon } from '@/lib/constants/item-types';
import { ITEMS_PER_PAGE } from '@/lib/constants/pagination';
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

  const [paginatedItems, itemTypes, sidebarCollections, editorPreferences] = await Promise.all([
    getItemsByCollection(user.id, collectionId, currentPage, ITEMS_PER_PAGE),
    getItemTypesWithCounts(user.id),
    getSidebarCollections(user.id),
    getEditorPreferences(user.id),
  ]);

  const { items, totalPages } = paginatedItems;

  // Separate items by type for different rendering
  const fileItems = items.filter((item) => item.itemType.name === 'file');
  const imageItems = items.filter((item) => item.itemType.name === 'image');
  const otherItems = items.filter(
    (item) => item.itemType.name !== 'file' && item.itemType.name !== 'image'
  );

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

        {/* Items */}
        {items.length > 0 ? (
          <div className="space-y-8">
            {/* Regular items grid */}
            {otherItems.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {otherItems.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            )}

            {/* Image gallery */}
            {imageItems.length > 0 && (
              <div>
                {otherItems.length > 0 && (
                  <h2 className="mb-4 text-lg font-medium text-foreground">Images</h2>
                )}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {imageItems.map((item) => (
                    <ImageThumbnailCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* File list */}
            {fileItems.length > 0 && (
              <div>
                {(otherItems.length > 0 || imageItems.length > 0) && (
                  <h2 className="mb-4 text-lg font-medium text-foreground">Files</h2>
                )}
                <div className="flex flex-col gap-2">
                  {fileItems.map((item) => (
                    <FileListRow key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}
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
