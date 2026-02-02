import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, FolderOpen } from "lucide-react";
import { getItemTypeIcon } from "@/lib/constants/item-types";

interface ItemTypeCount {
  name: string;
  icon: string;
  color: string;
  count: number;
}

interface ProfileStatsProps {
  totalItems: number;
  totalCollections: number;
  itemTypeBreakdown: ItemTypeCount[];
}

export default function ProfileStats({
  totalItems,
  totalCollections,
  itemTypeBreakdown,
}: ProfileStatsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 rounded-lg border border-border p-4">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#3b82f620" }}
            >
              <Code className="h-5 w-5" style={{ color: "#3b82f6" }} />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalItems}</p>
              <p className="text-sm text-muted-foreground">Total Items</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border p-4">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#8b5cf620" }}
            >
              <FolderOpen className="h-5 w-5" style={{ color: "#8b5cf6" }} />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCollections}</p>
              <p className="text-sm text-muted-foreground">Collections</p>
            </div>
          </div>
        </div>

        {/* Item Type Breakdown */}
        <div>
          <h4 className="mb-3 text-sm font-medium text-muted-foreground">
            Items by Type
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {itemTypeBreakdown.map((type) => {
              const Icon = getItemTypeIcon(type.icon);
              return (
                <div
                  key={type.name}
                  className="flex items-center gap-2 rounded-md border border-border p-3"
                >
                  <Icon className="h-4 w-4" style={{ color: type.color }} />
                  <span className="text-sm capitalize">{type.name}s</span>
                  <span className="ml-auto text-sm font-medium">
                    {type.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
