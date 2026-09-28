import Link from "next/link";
import { PUBLIC_PAGE_ITEM_LIMIT } from "@/lib/constants/pagination";
import { collectionToMarkdown } from "@/lib/public/markdown";
import { publicCollectionPath, siteOrigin } from "@/lib/public/paths";
import type { PublicCollection } from "@/lib/db/public";
import CollectionHeader from "./collection-header";
import ItemBlock from "./item-block";

interface PublicCollectionViewProps {
  collection: PublicCollection;
}

export default function PublicCollectionView({ collection }: PublicCollectionViewProps) {
  const canonicalUrl = `${siteOrigin()}${publicCollectionPath(collection.handle, collection.slug)}`;
  const markdown = collectionToMarkdown(collection, canonicalUrl);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6">
        <CollectionHeader collection={collection} markdown={markdown} />

        {collection.items.length > 0 ? (
          <div className="space-y-4">
            {collection.items.map((item, index) => (
              <ItemBlock key={item.id} item={item} position={index + 1} />
            ))}
            {collection.itemCount > PUBLIC_PAGE_ITEM_LIMIT && (
              <p className="text-center text-sm text-muted-foreground">
                Showing the first {PUBLIC_PAGE_ITEM_LIMIT} items
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">This collection has no items yet.</p>
          </div>
        )}

        <footer className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Published with{" "}
          <Link href="/" className="text-foreground hover:underline">
            DevStash
          </Link>
        </footer>
      </div>
    </main>
  );
}
