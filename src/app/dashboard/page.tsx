import DashboardLayout from "@/components/layout/dashboard-layout";
import StatsCards from "@/components/dashboard/stats-cards";
import CollectionsSection from "@/components/dashboard/collections-section";
import PinnedItems from "@/components/dashboard/pinned-items";
import RecentItems from "@/components/dashboard/recent-items";

export default function DashboardPage() {
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
        <CollectionsSection />

        {/* Pinned Items */}
        <PinnedItems />

        {/* Recent Items */}
        <RecentItems />
      </div>
    </DashboardLayout>
  );
}
