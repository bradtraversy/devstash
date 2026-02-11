import { redirect } from "next/navigation";
import { auth } from "@/auth";
import DashboardLayout from "@/components/layout/dashboard-layout";
import FavoritesItemList from "@/components/favorites/favorites-item-list";
import FavoritesCollectionList from "@/components/favorites/favorites-collection-list";
import { getSidebarCollections, getFavoriteCollections } from "@/lib/db/collections";
import { getItemTypesWithCounts, getFavoriteItems } from "@/lib/db/items";
import { getUserById, getEditorPreferences } from "@/lib/db/users";
import { Star } from "lucide-react";

export default async function FavoritesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const user = await getUserById(session.user.id);

  if (!user) {
    redirect("/sign-in");
  }

  const [
    favoriteItems,
    favoriteCollections,
    itemTypes,
    sidebarCollections,
    editorPreferences,
  ] = await Promise.all([
    getFavoriteItems(user.id),
    getFavoriteCollections(user.id),
    getItemTypesWithCounts(user.id),
    getSidebarCollections(user.id),
    getEditorPreferences(user.id),
  ]);

  const totalFavorites = favoriteItems.length + favoriteCollections.length;
  const hasNoFavorites = totalFavorites === 0;

  return (
    <DashboardLayout
      itemTypes={itemTypes}
      sidebarCollections={sidebarCollections}
      user={user}
      editorPreferences={editorPreferences}
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
          <h1 className="text-2xl font-semibold text-foreground">Favorites</h1>
          <span className="text-muted-foreground">({totalFavorites})</span>
        </div>

        {hasNoFavorites ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No favorites yet. Star items or collections to see them here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {favoriteItems.length > 0 && (
              <FavoritesItemList items={favoriteItems} />
            )}

            {favoriteCollections.length > 0 && (
              <FavoritesCollectionList collections={favoriteCollections} />
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
