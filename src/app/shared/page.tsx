import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Share2, UserRound } from "lucide-react";
import { auth } from "@/auth";
import DashboardLayout from "@/components/layout/dashboard-layout";
import ListLayoutSwitch from "@/components/items/list-layout-switch";
import SharedItemList from "@/components/sharing/shared-item-list";
import SharedCollectionList from "@/components/sharing/shared-collection-list";
import { getSharedCollections, getSidebarCollections } from "@/lib/db/collections";
import { getItemTypesWithCounts, getSharedItems } from "@/lib/db/items";
import { getEditorPreferences, getUserById, getUserHandle, hasPublicProfile } from "@/lib/db/users";
import { LIST_LAYOUT_COOKIE, parseListLayout } from "@/lib/list-layout";
import { getCodePreviews } from "@/lib/item-previews";
import { publicProfilePath } from "@/lib/public/paths";
import { PAGE_SIZE_COOKIE, parsePageParam, parsePageSize } from "@/lib/page-size";
import ListFooter from "@/components/shared/list-footer";

export const metadata = {
  title: "Shared - DevStash",
};

interface SharedPageProps {
  searchParams: Promise<{ page?: string | string[] }>;
}

export default async function SharedPage({ searchParams }: SharedPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const user = await getUserById(session.user.id);

  if (!user) {
    redirect("/sign-in");
  }

  const currentPage = parsePageParam((await searchParams).page);
  const cookieStore = await cookies();
  const pageSize = parsePageSize(cookieStore.get(PAGE_SIZE_COOKIE)?.value);

  const [sharedItems, collections, handle, hasProfile, itemTypes, sidebarCollections, editorPreferences] =
    await Promise.all([
      getSharedItems(user.id, currentPage, pageSize),
      getSharedCollections(user.id),
      getUserHandle(user.id),
      hasPublicProfile(user.id),
      getItemTypesWithCounts(user.id),
      getSidebarCollections(user.id),
      getEditorPreferences(user.id),
    ]);

  if (currentPage > 1 && currentPage > sharedItems.totalPages) {
    redirect("/shared");
  }

  const { items, totalCount, totalPages } = sharedItems;
  const layout = parseListLayout(cookieStore.get(LIST_LAYOUT_COOKIE)?.value);
  const previews = layout === "cards" ? await getCodePreviews(items) : undefined;
  const hasNothing = totalCount === 0 && collections.length === 0;

  return (
    <DashboardLayout
      itemTypes={itemTypes}
      sidebarCollections={sidebarCollections}
      user={user}
      editorPreferences={editorPreferences}
      isPro={session.user.isPro}
    >
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Shared</h1>
            <p className="text-muted-foreground">
              Anyone with one of these links can open it. Public ones are also listed on your profile and can
              show up in search engines.
            </p>
          </div>
          {handle && hasProfile && (
            <Link
              href={publicProfilePath(handle)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <UserRound className="h-4 w-4" aria-hidden="true" />
              View profile
            </Link>
          )}
        </div>

        {hasNothing ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <Share2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Nothing shared yet</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Use Share on any item and it shows up here with its link. Collections share from their own page.
            </p>
            <Link href="/dashboard" className="mt-4 inline-block text-sm text-blue-300 hover:underline">
              Go to your stash
            </Link>
          </div>
        ) : (
          <>
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Items ({totalCount})
                </h2>
                {totalCount > 0 && <ListLayoutSwitch layout={layout} />}
              </div>
              {totalCount > 0 ? (
                <>
                  <SharedItemList items={items} layout={layout} previews={previews} />
                  <ListFooter
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    pageSize={pageSize}
                    baseUrl="/shared"
                  />
                </>
              ) : (
                <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                  No shared items. Share one from its row or its details.
                </p>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Collections ({collections.length})
              </h2>
              {collections.length > 0 ? (
                <SharedCollectionList collections={collections} handle={handle} />
              ) : (
                <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                  No shared collections. Open a collection and set it to Unlisted or Public.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
