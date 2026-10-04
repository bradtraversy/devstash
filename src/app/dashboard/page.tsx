import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { Pin, Share2 } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/dashboard-layout';
import QuickCapture from '@/components/dashboard/quick-capture';
import ItemList from '@/components/items/item-list';
import ListLayoutSwitch from '@/components/items/list-layout-switch';
import ListFooter from '@/components/shared/list-footer';
import { cn } from '@/lib/utils';
import { getSidebarCollections } from '@/lib/db/collections';
import { getHomeCounts, getHomeItems, getItemTypesWithCounts } from '@/lib/db/items';
import { getEditorPreferences } from '@/lib/db/users';
import { PAGE_SIZE_COOKIE, parsePageParam, parsePageSize } from '@/lib/page-size';
import { HOME_FILTERS, homeFilterPath, parseHomeFilter, type HomeFilter } from '@/lib/home';
import { LIST_LAYOUT_COOKIE, parseListLayout } from '@/lib/list-layout';
import { getCodePreviews } from '@/lib/item-previews';

interface DashboardPageProps {
  searchParams: Promise<{ show?: string | string[]; page?: string }>;
}

const FILTER_LABELS: Record<HomeFilter, string> = { all: 'All', shared: 'Shared', pinned: 'Pinned' };

const FILTER_EMPTY: Record<HomeFilter, string> = {
  all: 'Nothing here yet.',
  shared: 'Nothing shared yet. Use Share on any row.',
  pinned: 'Nothing pinned yet. Pin an item from its details.',
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const { show, page: pageParam } = await searchParams;
  const filter = parseHomeFilter(show);
  const currentPage = parsePageParam(pageParam);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true },
  });

  if (!user) {
    redirect('/sign-in');
  }

  const cookieStore = await cookies();
  const pageSize = parsePageSize(cookieStore.get(PAGE_SIZE_COOKIE)?.value);

  const [counts, home, itemTypes, sidebarCollections, editorPreferences] = await Promise.all([
    getHomeCounts(user.id),
    getHomeItems(user.id, filter, currentPage, pageSize),
    getItemTypesWithCounts(user.id),
    getSidebarCollections(user.id),
    getEditorPreferences(user.id),
  ]);

  // A page past the end, from a stale link or a deletion, goes back to the filter's first page.
  if (currentPage > 1 && currentPage > home.totalPages) {
    redirect(homeFilterPath(filter));
  }

  const layout = parseListLayout(cookieStore.get(LIST_LAYOUT_COOKIE)?.value);
  const previews = layout === 'cards' ? await getCodePreviews(home.items) : undefined;
  const isNew = counts.total === 0;
  const chipCounts: Record<HomeFilter, number> = { all: counts.total, shared: counts.shared, pinned: counts.pinned };

  return (
    <DashboardLayout
      itemTypes={itemTypes}
      sidebarCollections={sidebarCollections}
      user={user}
      editorPreferences={editorPreferences}
      isPro={session.user.isPro}
    >
      <div className="mx-auto max-w-6xl space-y-8">
        {isNew ? (
          <div>
            <h1 className="text-2xl font-bold text-foreground">Start your stash</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              Paste code, a command, a note, or a link. Keep it to yourself, or share it with a link anyone can open.
            </p>
          </div>
        ) : (
          <h1 className="sr-only">Home</h1>
        )}

        <QuickCapture showSamples={isNew} />

        {!isNew && (
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">Your stash</h2>
              <span className="text-sm text-muted-foreground">
                {counts.total} {counts.total === 1 ? 'item' : 'items'}, {counts.shared} shared
              </span>
            </div>
            <div className="flex items-center gap-3">
              <nav aria-label="Filter your stash" className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none]">
                {HOME_FILTERS.map((option) => {
                  const active = option === filter;
                  return (
                    <Link
                      key={option}
                      href={homeFilterPath(option)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors',
                        active
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
                      )}
                    >
                      {option === 'shared' && <Share2 className="h-3.5 w-3.5" aria-hidden="true" />}
                      {option === 'pinned' && <Pin className="h-3.5 w-3.5" aria-hidden="true" />}
                      {FILTER_LABELS[option]}
                      <span className="opacity-70">{chipCounts[option]}</span>
                    </Link>
                  );
                })}
              </nav>
              <ListLayoutSwitch layout={layout} />
            </div>

            {home.items.length > 0 ? (
              <ItemList items={home.items} layout={layout} previews={previews} />
            ) : (
              <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                {FILTER_EMPTY[filter]}
              </p>
            )}

            <ListFooter
              currentPage={currentPage}
              totalPages={home.totalPages}
              totalCount={home.totalCount}
              pageSize={pageSize}
              baseUrl={homeFilterPath(filter)}
            />
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
