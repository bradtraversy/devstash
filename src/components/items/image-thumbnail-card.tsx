"use client";

import { Card } from '@/components/ui/card';
import { Star, Pin } from 'lucide-react';
import { useItemDrawer } from '@/components/items/item-drawer-provider';
import type { ItemWithType } from '@/lib/db/items';

interface ImageThumbnailCardProps {
  item: ItemWithType;
}

export default function ImageThumbnailCard({ item }: ImageThumbnailCardProps) {
  const { openDrawer } = useItemDrawer();

  return (
    <Card
      className="group overflow-hidden bg-card border-border hover:border-muted-foreground/50 transition-colors cursor-pointer"
      onClick={() => openDrawer(item.id)}
    >
      {/* Image Container with 16:9 aspect ratio */}
      <div className="aspect-video overflow-hidden bg-muted">
        {item.fileUrl ? (
          <img
            src={item.fileUrl}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            No image
          </div>
        )}
      </div>

      {/* Title and badges */}
      <div className="p-3">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground truncate flex-1">
            {item.title}
          </h3>
          {item.isFavorite && (
            <Star className="h-4 w-4 shrink-0 fill-yellow-500 text-yellow-500" />
          )}
          {item.isPinned && (
            <Pin className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </div>
      </div>
    </Card>
  );
}
