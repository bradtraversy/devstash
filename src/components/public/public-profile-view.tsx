import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { PUBLIC_PROFILE_COLLECTION_LIMIT, PUBLIC_PROFILE_ITEM_LIMIT } from "@/lib/constants/pagination";
import { publicCollectionPath } from "@/lib/public/paths";
import { profileCountsLabel } from "@/lib/public/metadata";
import type { PublicProfile } from "@/lib/db/public";
import type { CodePreviews } from "@/lib/item-previews";
import PublicItemCard from "./public-item-card";

interface PublicProfileViewProps {
  profile: PublicProfile;
  previews: CodePreviews;
}

const GRID = "grid gap-3 sm:grid-cols-2 xl:grid-cols-3";
const SECTION_HEADING = "text-sm font-medium uppercase tracking-wider text-muted-foreground";

function CappedNote({ shown, total, limit, noun }: { shown: number; total: number; limit: number; noun: string }) {
  if (total <= limit) return null;
  return (
    <p className="text-center text-sm text-muted-foreground">
      Showing the {shown} most recently shared {noun}
    </p>
  );
}

export default function PublicProfileView({ profile, previews }: PublicProfileViewProps) {
  const { handle, collections, items } = profile;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-10 sm:px-6">
        <header className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-800 to-blue-600 text-2xl font-semibold uppercase text-white"
          >
            {handle.charAt(0)}
          </span>
          <div className="min-w-0 space-y-1">
            <h1 className="truncate text-3xl font-semibold tracking-tight text-foreground">@{handle}</h1>
            <p className="font-mono text-xs text-muted-foreground">{profileCountsLabel(profile)}</p>
          </div>
        </header>

        {collections.length > 0 && (
          <section className="space-y-3" aria-labelledby="profile-collections">
            <h2 id="profile-collections" className={SECTION_HEADING}>
              Collections ({profile.collectionCount})
            </h2>
            <div className={GRID}>
              {collections.map((collection) => (
                <Link
                  key={collection.id}
                  href={publicCollectionPath(handle, collection.slug)}
                  className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-muted-foreground/50"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate font-medium text-foreground">{collection.name}</span>
                  </span>
                  {collection.description && (
                    <span className="line-clamp-2 text-sm text-muted-foreground">{collection.description}</span>
                  )}
                  <span className="mt-auto font-mono text-xs text-muted-foreground">
                    {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
                  </span>
                </Link>
              ))}
            </div>
            <CappedNote
              shown={collections.length}
              total={profile.collectionCount}
              limit={PUBLIC_PROFILE_COLLECTION_LIMIT}
              noun="collections"
            />
          </section>
        )}

        {items.length > 0 && (
          <section className="space-y-3" aria-labelledby="profile-items">
            <h2 id="profile-items" className={SECTION_HEADING}>
              Items ({profile.itemCount})
            </h2>
            <div className={GRID}>
              {items.map((item) => (
                <PublicItemCard key={item.id} item={item} preview={previews[item.id]} />
              ))}
            </div>
            <CappedNote
              shown={items.length}
              total={profile.itemCount}
              limit={PUBLIC_PROFILE_ITEM_LIMIT}
              noun="items"
            />
          </section>
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
