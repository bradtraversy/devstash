import { Card, CardContent } from '@/components/ui/card';
import { Star, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getItemTypeIcon } from '@/lib/constants/item-types';
import type { CollectionItemType } from '@/lib/db/collections';

interface CollectionCardProps {
  collection: {
    id: string;
    name: string;
    description: string | null;
    isFavorite: boolean;
    itemCount: number;
    itemTypes: CollectionItemType[];
    dominantColor: string | null;
  };
}

export default function CollectionCard({ collection }: CollectionCardProps) {
  const borderStyle = collection.dominantColor
    ? { borderLeftColor: collection.dominantColor, borderLeftWidth: '3px' }
    : {};

  return (
    <Card
      className="group relative bg-card border-border hover:border-muted-foreground/50 transition-colors"
      style={borderStyle}
    >
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
          {collection.itemCount} {collection.itemCount === 1 ? 'item' : 'items'}
        </p>
        {collection.description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {collection.description}
          </p>
        )}
        {collection.itemTypes.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            {collection.itemTypes.map((itemType) => {
              const IconComponent = getItemTypeIcon(itemType.icon);
              return (
                <IconComponent
                  key={itemType.name}
                  className="h-4 w-4"
                  style={{ color: itemType.color }}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
