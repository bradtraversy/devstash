import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProfileInfo from '@/components/profile/profile-info';
import ProfileStats from '@/components/profile/profile-stats';
import { getSidebarCollections } from '@/lib/db/collections';
import { getItemTypesWithCounts } from '@/lib/db/items';

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      password: true,
      createdAt: true,
    },
  });

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
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>

        {/* Profile Info */}
        <ProfileInfo
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            hasPassword: !!user.password,
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
