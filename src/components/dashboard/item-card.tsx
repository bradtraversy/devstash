"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Pin, Copy, Check } from 'lucide-react';
import { getItemTypeIcon } from '@/lib/constants/item-types';
import { formatRelativeDate } from '@/lib/utils/date';
import { useItemDrawer } from '@/components/items/item-drawer-provider';
import { useState } from 'react';
import type { ItemWithType } from '@/lib/db/items';

interface ItemCardProps {
  item: ItemWithType;
}

export default function ItemCard({ item }: ItemCardProps) {
  const { openDrawer } = useItemDrawer();
  const [copied, setCopied] = useState(false);
  const IconComponent = getItemTypeIcon(item.itemType.icon);
  const iconColor = item.itemType.color;
  const borderStyle = { borderLeftColor: iconColor, borderLeftWidth: '3px' };

  // Determine if item has copyable content
  const copyableContent = item.content || item.url;
  const canCopy = !!copyableContent;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!copyableContent) return;

    try {
      await navigator.clipboard.writeText(copyableContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Card
      className="group relative bg-card border-border hover:border-muted-foreground/50 transition-colors cursor-pointer"
      style={borderStyle}
      onClick={() => openDrawer(item.id)}
    >
      <CardContent className="flex items-start gap-4 p-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${iconColor}20` }}
        >
          <IconComponent className="h-5 w-5" style={{ color: iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground truncate">
              {item.title}
            </h3>
            {item.isFavorite && (
              <Star className="h-4 w-4 shrink-0 fill-yellow-500 text-yellow-500" />
            )}
            {item.isPinned && (
              <Pin className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </div>
          {item.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
              {item.description}
            </p>
          )}
          {item.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs bg-muted text-muted-foreground"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {formatRelativeDate(item.updatedAt)}
        </span>
      </CardContent>
      {canCopy && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      )}
    </Card>
  );
}
