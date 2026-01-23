"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Star, Code, FileText, Terminal, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Collection {
  id: string;
  name: string;
  description: string;
  isFavorite: boolean;
  itemCount: number;
}

interface CollectionCardProps {
  collection: Collection;
}

export default function CollectionCard({ collection }: CollectionCardProps) {
  return (
    <Card className="group relative bg-card border-border hover:border-muted-foreground/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{collection.name}</h3>
            {collection.isFavorite && (
              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {collection.itemCount} items
        </p>
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
          {collection.description}
        </p>
        <div className="mt-3 flex items-center gap-2 text-muted-foreground">
          <Code className="h-4 w-4 text-blue-500" />
          <FileText className="h-4 w-4 text-yellow-500" />
          <Terminal className="h-4 w-4 text-orange-500" />
        </div>
      </CardContent>
    </Card>
  );
}
