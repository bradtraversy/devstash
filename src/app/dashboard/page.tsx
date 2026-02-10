import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/dashboard-layout';
import StatsCards from '@/components/dashboard/stats-cards';
import CollectionsSection from '@/components/dashboard/collections-section';
import PinnedItems from '@/components/dashboard/pinned-items';
import RecentItems from '@/components/dashboard/recent-items';
import { getRecentCollections, getSidebarCollections } from '@/lib/db/collections';
import { getPinnedItems, getRecentItems, getDashboardStats, getItemTypesWithCounts } from '@/lib/db/items';
import { DASHBOARD_COLLECTIONS_LIMIT, DASHBOARD_RECENT_ITEMS_LIMIT } from '@/lib/constants/pagination';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true },
  });

  const [collections, pinnedItems, recentItems, stats, itemTypes, sidebarCollections] = user
    ? await Promise.all([
        getRecentCollections(user.id, DASHBOARD_COLLECTIONS_LIMIT),
        getPinnedItems(user.id),
        getRecentItems(user.id, DASHBOARD_RECENT_ITEMS_LIMIT),
        getDashboardStats(user.id),
        getItemTypesWithCounts(user.id),
        getSidebarCollections(user.id),
      ])
    : [[], [], [], { totalItems: 0, totalCollections: 0, favoriteItems: 0, favoriteCollections: 0 }, [], { favorites: [], recents: [] }];

  return (
    <DashboardLayout
      itemTypes={itemTypes}
      sidebarCollections={sidebarCollections}
      user={user}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Your developer knowledge hub</p>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={stats} />

        {/* Collections */}
        <CollectionsSection collections={collections} />

        {/* Pinned Items */}
        <PinnedItems items={pinnedItems} />

        {/* Recent Items */}
        <RecentItems items={recentItems} />
      </div>
    </DashboardLayout>
  );
}
