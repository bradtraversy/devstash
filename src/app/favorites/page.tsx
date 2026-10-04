import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import DashboardLayout from "@/components/layout/dashboard-layout";
import FavoritesItemList from "@/components/favorites/favorites-item-list";
import FavoritesCollectionList from "@/components/favorites/favorites-collection-list";
import { getSidebarCollections, getFavoriteCollections } from "@/lib/db/collections";
import { getItemTypesWithCounts, getFavoriteItems } from "@/lib/db/items";
import { getUserById, getEditorPreferences } from "@/lib/db/users";
import { LIST_LAYOUT_COOKIE, parseListLayout } from "@/lib/list-layout";
import { PAGE_SIZE_COOKIE, parsePageParam, parsePageSize } from "@/lib/page-size";
import { favoritesPath, parseFavoriteSort } from "@/lib/favorites-sort";
import { getCodePreviews } from "@/lib/item-previews";
import ListFooter from "@/components/shared/list-footer";
import { Star } from "lucide-react";

interface FavoritesPageProps {
  searchParams: Promise<{ sort?: string | string[]; page?: string | string[] }>;
}

export default async function FavoritesPage({ searchParams }: FavoritesPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const user = await getUserById(session.user.id);

  if (!user) {
    redirect("/sign-in");
  }

  const { sort: sortParam, page: pageParam } = await searchParams;
  const sort = parseFavoriteSort(sortParam);
  const currentPage = parsePageParam(pageParam);
  const cookieStore = await cookies();
  const pageSize = parsePageSize(cookieStore.get(PAGE_SIZE_COOKIE)?.value);

  const [
    favoriteItems,
    favoriteCollections,
    itemTypes,
    sidebarCollections,
    editorPreferences,
  ] = await Promise.all([
    getFavoriteItems(user.id, sort, currentPage, pageSize),
    getFavoriteCollections(user.id),
    getItemTypesWithCounts(user.id),
    getSidebarCollections(user.id),
    getEditorPreferences(user.id),
  ]);

  if (currentPage > 1 && currentPage > favoriteItems.totalPages) {
    redirect(favoritesPath(sort));
  }

  const layout = parseListLayout(cookieStore.get(LIST_LAYOUT_COOKIE)?.value);
  const previews = layout === "cards" ? await getCodePreviews(favoriteItems.items) : undefined;

  const totalFavorites = favoriteItems.totalCount + favoriteCollections.length;
  const hasNoFavorites = totalFavorites === 0;

  return (
    <DashboardLayout
      itemTypes={itemTypes}
      sidebarCollections={sidebarCollections}
      user={user}
      editorPreferences={editorPreferences}
      isPro={session.user.isPro}
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
            {favoriteItems.totalCount > 0 && (
              <div className="space-y-4">
                <FavoritesItemList
                  items={favoriteItems.items}
                  totalCount={favoriteItems.totalCount}
                  sort={sort}
                  layout={layout}
                  previews={previews}
                />
                <ListFooter
                  currentPage={currentPage}
                  totalPages={favoriteItems.totalPages}
                  totalCount={favoriteItems.totalCount}
                  pageSize={pageSize}
                  baseUrl={favoritesPath(sort)}
                />
              </div>
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
