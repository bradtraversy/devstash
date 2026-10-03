import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ItemList from '@/components/items/item-list';
import ImageThumbnailCard from '@/components/items/image-thumbnail-card';
import FileListRow from '@/components/items/file-list-row';
import ItemsPageHeader from '@/components/items/items-page-header';
import Pagination from '@/components/shared/pagination';
import { getSidebarCollections } from '@/lib/db/collections';
import { getItemsByType, getItemTypesWithCounts, VALID_ITEM_TYPES } from '@/lib/db/items';
import { getEditorPreferences } from '@/lib/db/users';
import { ITEMS_PER_PAGE } from '@/lib/constants/pagination';
import { isProEnabled } from '@/lib/plans';
import { LIST_LAYOUT_COOKIE, parseListLayout } from '@/lib/list-layout';
import { getCodePreviews } from '@/lib/item-previews';

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

  // With Pro off these pages list existing file and image items read only.
  const isProType = typeName === 'file' || typeName === 'image';

  if (isProType && isProEnabled() && !user.isPro) {
    redirect('/upgrade');
  }

  const [paginatedItems, itemTypes, sidebarCollections, editorPreferences, cookieStore] = await Promise.all([
    getItemsByType(user.id, typeName, currentPage, ITEMS_PER_PAGE),
    getItemTypesWithCounts(user.id),
    getSidebarCollections(user.id),
    getEditorPreferences(user.id),
    cookies(),
  ]);

  const { items, totalCount, totalPages } = paginatedItems;
  const layout = parseListLayout(cookieStore.get(LIST_LAYOUT_COOKIE)?.value);
  const previews = !isProType && layout === 'cards' ? await getCodePreviews(items) : undefined;
  const displayName = typeName.charAt(0).toUpperCase() + typeName.slice(1) + 's';

  return (
    <DashboardLayout
      itemTypes={itemTypes}
      sidebarCollections={sidebarCollections}
      user={user}
      editorPreferences={editorPreferences}
      isPro={user.isPro}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <ItemsPageHeader
          typeName={typeName}
          displayName={displayName}
          itemCount={totalCount}
          isPro={user.isPro}
          layout={isProType ? undefined : layout}
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
          ) : typeName === 'image' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <ImageThumbnailCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <ItemList items={items} layout={layout} previews={previews} />
          )
        ) : (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              {isProType && !isProEnabled()
                ? `No ${typeName}s here. New ${typeName} uploads are not available right now.`
                : `No ${typeName}s yet. Create your first one!`}
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
