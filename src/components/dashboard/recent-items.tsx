import { Clock } from 'lucide-react';
import ItemCard from './item-card';
import type { ItemWithType } from '@/lib/db/items';

interface RecentItemsProps {
  items: ItemWithType[];
}

export default function RecentItems({ items }: RecentItemsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Recent Items</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
