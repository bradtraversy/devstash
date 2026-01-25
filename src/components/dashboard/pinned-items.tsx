import { Pin } from 'lucide-react';
import ItemCard from './item-card';
import type { ItemWithType } from '@/lib/db/items';

interface PinnedItemsProps {
  items: ItemWithType[];
}

export default function PinnedItems({ items }: PinnedItemsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Pin className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Pinned</h2>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
