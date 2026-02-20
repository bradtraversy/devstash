import { Card, CardContent } from "@/components/ui/card";
import { Code, FolderOpen, Star, Heart } from "lucide-react";
import type { DashboardStats } from "@/lib/db/items";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <Card className="bg-card border-border py-0">
      <CardContent className="flex items-center gap-4 px-4 py-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatsCardsProps {
  stats: DashboardStats;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const statItems = [
    {
      title: "Total Items",
      value: stats.totalItems,
      icon: <Code className="h-5 w-5" />,
      color: "#3b82f6",
    },
    {
      title: "Collections",
      value: stats.totalCollections,
      icon: <FolderOpen className="h-5 w-5" />,
      color: "#8b5cf6",
    },
    {
      title: "Favorite Items",
      value: stats.favoriteItems,
      icon: <Star className="h-5 w-5" />,
      color: "#f97316",
    },
    {
      title: "Favorite Collections",
      value: stats.favoriteCollections,
      icon: <Heart className="h-5 w-5" />,
      color: "#ec4899",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statItems.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}
