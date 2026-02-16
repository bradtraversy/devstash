import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ItemCard from '@/components/dashboard/item-card';
import ImageThumbnailCard from '@/components/items/image-thumbnail-card';
import FileListRow from '@/components/items/file-list-row';
import ItemsPageHeader from '@/components/items/items-page-header';
import Pagination from '@/components/shared/pagination';
import { getSidebarCollections } from '@/lib/db/collections';
import { getItemsByType, getItemTypesWithCounts, VALID_ITEM_TYPES } from '@/lib/db/items';
import { getEditorPreferences } from '@/lib/db/users';
import { ITEMS_PER_PAGE } from '@/lib/constants/pagination';

interface ItemsPageProps {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function ItemsPage({ params, searchParams }: ItemsPageProps) {
  const { type: typeParam } = await params;
  const { page: pageParam } = await searchParams;

  // Convert plural route param to singular type name (e.g., "snippets" -> "snippet")
  const typeName = typeParam.endsWith('s') ? typeParam.slice(0, -1) : typeParam;

  // Validate the type
  if (!VALID_ITEM_TYPES.includes(typeName as typeof VALID_ITEM_TYPES[number])) {
    notFound();
  }

  // Parse page number (default to 1)
  const currentPage = Math.max(1, parseInt(pageParam || '1', 10) || 1);

  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, isPro: true },
  });

  if (!user) {
    redirect('/sign-in');
  }

  // Pro-only types: file and image require a Pro subscription
  const isProType = typeName === 'file' || typeName === 'image';

  if (isProType && !user.isPro) {
    redirect('/upgrade');
  }

  const [paginatedItems, itemTypes, sidebarCollections, editorPreferences] = await Promise.all([
    getItemsByType(user.id, typeName, currentPage, ITEMS_PER_PAGE),
    getItemTypesWithCounts(user.id),
    getSidebarCollections(user.id),
    getEditorPreferences(user.id),
  ]);

  const { items, totalCount, totalPages } = paginatedItems;
  const displayName = typeName.charAt(0).toUpperCase() + typeName.slice(1) + 's';

  return (
    <DashboardLayout
      itemTypes={itemTypes}
      sidebarCollections={sidebarCollections}
      user={user}
      editorPreferences={editorPreferences}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <ItemsPageHeader
          typeName={typeName}
          displayName={displayName}
          itemCount={totalCount}
        />

        {/* Items Grid/List */}
        {items.length > 0 ? (
          typeName === 'file' ? (
            // Single-column list for files
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <FileListRow key={item.id} item={item} />
              ))}
            </div>
          ) : (
            // Grid for images and other types
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) =>
                typeName === 'image' ? (
                  <ImageThumbnailCard key={item.id} item={item} />
                ) : (
                  <ItemCard key={item.id} item={item} />
                )
              )}
            </div>
          )
        ) : (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              No {typeName}s yet. Create your first one!
            </p>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          baseUrl={`/items/${typeParam}`}
        />
      </div>
    </DashboardLayout>
  );
}
