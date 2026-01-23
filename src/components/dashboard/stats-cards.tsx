"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Code,
  FolderOpen,
  Star,
  Heart,
} from "lucide-react";
import { mockItems, mockCollections } from "@/lib/mock-data";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="flex items-center gap-4 p-4">
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

export default function StatsCards() {
  const totalItems = mockItems.length;
  const totalCollections = mockCollections.length;
  const favoriteItems = mockItems.filter((item) => item.isFavorite).length;
  const favoriteCollections = mockCollections.filter(
    (coll) => coll.isFavorite
  ).length;

  const stats = [
    {
      title: "Total Items",
      value: totalItems,
      icon: <Code className="h-5 w-5" />,
      color: "#3b82f6",
    },
    {
      title: "Collections",
      value: totalCollections,
      icon: <FolderOpen className="h-5 w-5" />,
      color: "#8b5cf6",
    },
    {
      title: "Favorite Items",
      value: favoriteItems,
      icon: <Star className="h-5 w-5" />,
      color: "#f97316",
    },
    {
      title: "Favorite Collections",
      value: favoriteCollections,
      icon: <Heart className="h-5 w-5" />,
      color: "#ec4899",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}
