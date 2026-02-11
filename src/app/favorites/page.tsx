import { redirect } from "next/navigation";
import { auth } from "@/auth";
import DashboardLayout from "@/components/layout/dashboard-layout";
import FavoriteItemRow from "@/components/favorites/favorite-item-row";
import FavoriteCollectionRow from "@/components/favorites/favorite-collection-row";
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
            {/* Items Section */}
            {favoriteItems.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Items ({favoriteItems.length})
                </h2>
                <div className="border border-border rounded-md divide-y divide-border bg-card">
                  {favoriteItems.map((item) => (
                    <FavoriteItemRow key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* Collections Section */}
            {favoriteCollections.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Collections ({favoriteCollections.length})
                </h2>
                <div className="border border-border rounded-md divide-y divide-border bg-card">
                  {favoriteCollections.map((collection) => (
                    <FavoriteCollectionRow
                      key={collection.id}
                      collection={collection}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
