"use client";

import { Clock } from "lucide-react";
import ItemCard from "./item-card";
import { mockItems } from "@/lib/mock-data";

export default function RecentItems() {
  // Get 10 most recent items sorted by updatedAt, excluding pinned items
  const recentItems = [...mockItems]
    .filter((item) => !item.isPinned)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 10);

  if (recentItems.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Recent Items</h2>
      </div>
      <div className="space-y-3">
        {recentItems.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
