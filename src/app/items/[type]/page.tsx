import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ItemCard from '@/components/dashboard/item-card';
import ImageThumbnailCard from '@/components/items/image-thumbnail-card';
import ItemsPageHeader from '@/components/items/items-page-header';
import { getSidebarCollections } from '@/lib/db/collections';
import { getItemsByType, getItemTypesWithCounts, VALID_ITEM_TYPES } from '@/lib/db/items';

interface ItemsPageProps {
  params: Promise<{ type: string }>;
}

export default async function ItemsPage({ params }: ItemsPageProps) {
  const { type: typeParam } = await params;

  // Convert plural route param to singular type name (e.g., "snippets" -> "snippet")
  const typeName = typeParam.endsWith('s') ? typeParam.slice(0, -1) : typeParam;

  // Validate the type
  if (!VALID_ITEM_TYPES.includes(typeName as typeof VALID_ITEM_TYPES[number])) {
    notFound();
  }

  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true },
  });

  if (!user) {
    redirect('/sign-in');
  }

  const [items, itemTypes, sidebarCollections] = await Promise.all([
    getItemsByType(user.id, typeName),
    getItemTypesWithCounts(user.id),
    getSidebarCollections(user.id),
  ]);

  const displayName = typeName.charAt(0).toUpperCase() + typeName.slice(1) + 's';

  return (
    <DashboardLayout
      itemTypes={itemTypes}
      sidebarCollections={sidebarCollections}
      user={user}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <ItemsPageHeader
          typeName={typeName}
          displayName={displayName}
          itemCount={items.length}
        />

        {/* Items Grid */}
        {items.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) =>
              typeName === 'image' ? (
                <ImageThumbnailCard key={item.id} item={item} />
              ) : (
                <ItemCard key={item.id} item={item} />
              )
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              No {typeName}s yet. Create your first one!
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
