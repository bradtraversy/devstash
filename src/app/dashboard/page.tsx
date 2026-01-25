import DashboardLayout from '@/components/layout/dashboard-layout';
import StatsCards from '@/components/dashboard/stats-cards';
import CollectionsSection from '@/components/dashboard/collections-section';
import PinnedItems from '@/components/dashboard/pinned-items';
import RecentItems from '@/components/dashboard/recent-items';
import { getDemoUser, getRecentCollections } from '@/lib/db/collections';
import { getPinnedItems, getRecentItems } from '@/lib/db/items';

export default async function DashboardPage() {
  const user = await getDemoUser();

  const [collections, pinnedItems, recentItems] = user
    ? await Promise.all([
        getRecentCollections(user.id, 6),
        getPinnedItems(user.id),
        getRecentItems(user.id, 10),
      ])
    : [[], [], []];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Your developer knowledge hub</p>
        </div>

        {/* Stats Cards */}
        <StatsCards />

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
