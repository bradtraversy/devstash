import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import DashboardLayout from '@/components/layout/dashboard-layout';
import AccountSettings from '@/components/settings/account-settings';
import BillingSettings from '@/components/settings/billing-settings';
import EditorSettings from '@/components/settings/editor-settings';
import { getSidebarCollections } from '@/lib/db/collections';
import { getItemTypesWithCounts } from '@/lib/db/items';
import { getUserWithSettings } from '@/lib/db/users';
import { getUserUsage } from '@/lib/usage';

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const user = await getUserWithSettings(session.user.id);

  if (!user) {
    redirect('/sign-in');
  }

  const isPro = session.user.isPro ?? false;

  // Get sidebar data and usage stats for layout
  const [itemTypesWithCounts, sidebarCollections, usage] = await Promise.all([
    getItemTypesWithCounts(user.id),
    getSidebarCollections(user.id),
    getUserUsage(user.id, isPro),
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
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>

        {/* Editor Settings */}
        <EditorSettings />

        {/* Billing Settings */}
        <BillingSettings
          isPro={isPro}
          itemCount={usage.itemCount}
          collectionCount={usage.collectionCount}
        />

        {/* Account Settings */}
        <AccountSettings hasPassword={user.hasPassword} />
      </div>
    </DashboardLayout>
  );
}
