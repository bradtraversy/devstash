import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Pin } from 'lucide-react';
import { getItemTypeIcon } from '@/lib/constants/item-types';
import { formatRelativeDate } from '@/lib/utils/date';
import type { ItemWithType } from '@/lib/db/items';

interface ItemCardProps {
  item: ItemWithType;
}

export default function ItemCard({ item }: ItemCardProps) {
  const IconComponent = getItemTypeIcon(item.itemType.icon);
  const iconColor = item.itemType.color;

  return (
    <Card className="bg-card border-border hover:border-muted-foreground/50 transition-colors">
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
    </Card>
  );
}
