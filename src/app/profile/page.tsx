import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProfileInfo from '@/components/profile/profile-info';
import ProfileStats from '@/components/profile/profile-stats';
import { getSidebarCollections } from '@/lib/db/collections';
import { getItemTypesWithCounts } from '@/lib/db/items';
import { getUserWithSettings } from '@/lib/db/users';

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const user = await getUserWithSettings(session.user.id);

  if (!user) {
    redirect('/sign-in');
  }

  // Get item counts by type
  const itemCounts = await prisma.item.groupBy({
    by: ['itemTypeId'],
    where: { userId: user.id },
    _count: { id: true },
  });

  // Get item types to map IDs to names
  const itemTypes = await prisma.itemType.findMany({
    where: { isSystem: true },
  });

  const typeCountMap = new Map(itemCounts.map((c) => [c.itemTypeId, c._count.id]));
  const itemTypeBreakdown = itemTypes.map((type) => ({
    name: type.name,
    icon: type.icon,
    color: type.color,
    count: typeCountMap.get(type.id) || 0,
  }));

  // Get totals
  const [totalItems, totalCollections] = await Promise.all([
    prisma.item.count({ where: { userId: user.id } }),
    prisma.collection.count({ where: { userId: user.id } }),
  ]);

  // Get sidebar data for layout
  const [itemTypesWithCounts, sidebarCollections] = await Promise.all([
    getItemTypesWithCounts(user.id),
    getSidebarCollections(user.id),
  ]);

  return (
    <DashboardLayout
      itemTypes={itemTypesWithCounts}
      sidebarCollections={sidebarCollections}
      user={{ id: user.id, name: user.name, email: user.email, image: user.image }}
      editorPreferences={user.editorPreferences}
      isPro={session.user.isPro}
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground">View your account information and usage</p>
        </div>

        {/* Profile Info */}
        <ProfileInfo
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            createdAt: user.createdAt,
          }}
        />

        {/* Usage Stats */}
        <ProfileStats
          totalItems={totalItems}
          totalCollections={totalCollections}
          itemTypeBreakdown={itemTypeBreakdown}
        />
      </div>
    </DashboardLayout>
  );
}
