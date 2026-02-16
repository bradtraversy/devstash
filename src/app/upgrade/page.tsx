import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/dashboard-layout';
import UpgradePricing from '@/components/settings/upgrade-pricing';
import { getItemTypesWithCounts } from '@/lib/db/items';
import { getSidebarCollections } from '@/lib/db/collections';
import { getEditorPreferences } from '@/lib/db/users';
import { getUserUsage } from '@/lib/usage';

export default async function UpgradePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  if (session.user.isPro) {
    redirect('/settings');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, isPro: true },
  });

  if (!user) {
    redirect('/sign-in');
  }

  const [itemTypes, sidebarCollections, editorPreferences, usage] = await Promise.all([
    getItemTypesWithCounts(user.id),
    getSidebarCollections(user.id),
    getEditorPreferences(user.id),
    getUserUsage(user.id, user.isPro),
  ]);

  return (
    <DashboardLayout
      itemTypes={itemTypes}
      sidebarCollections={sidebarCollections}
      user={user}
      editorPreferences={editorPreferences}
      isPro={session.user.isPro}
    >
      <UpgradePricing
        itemCount={usage.itemCount}
        collectionCount={usage.collectionCount}
      />
    </DashboardLayout>
  );
}
