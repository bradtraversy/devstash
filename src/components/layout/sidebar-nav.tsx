"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getItemTypeIcon } from "@/lib/constants/item-types";
import { isTypeListed, showsProBadge } from "@/lib/plans";
import type { ItemTypeWithCount } from "@/lib/db/items";
import type { SidebarCollections } from "@/lib/db/collections";
import PrimaryNav from "./primary-nav";

interface SidebarNavProps {
  itemTypes: ItemTypeWithCount[];
  sidebarCollections: SidebarCollections;
  onLinkClick?: () => void;
}

export default function SidebarNav({
  itemTypes,
  sidebarCollections,
  onLinkClick,
}: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <>
      <PrimaryNav onLinkClick={onLinkClick} />
      <Separator className="my-4" />

      {/* Types Section */}
      <div className="space-y-1">
        <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Types
        </h3>
        {itemTypes.filter(isTypeListed).map((type) => {
          const Icon = getItemTypeIcon(type.icon);
          const isActive = pathname === `/items/${type.name}s`;

          return (
            <Link
              key={type.name}
              href={`/items/${type.name}s`}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent",
                isActive && "bg-accent text-accent-foreground font-medium"
              )}
            >
              <Icon className="h-4 w-4" style={{ color: type.color }} />
              <span className="capitalize">{type.name}s</span>
              {showsProBadge(type.name) && (
                <Badge
                  variant="secondary"
                  className="h-4 px-1 text-[10px] font-medium"
                >
                  PRO
                </Badge>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {type.count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Collections Section */}
      <Separator className="my-4" />
      <div className="space-y-1">
        <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Collections
        </h3>

        {/* Favorites */}
        {sidebarCollections.favorites.length > 0 && (
          <>
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
              Favorites
            </div>
            {sidebarCollections.favorites.map((collection) => (
              <Link
                key={collection.id}
                href={`/collections/${collection.id}`}
                onClick={onLinkClick}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent",
                  pathname === `/collections/${collection.id}` && "bg-accent text-accent-foreground font-medium"
                )}
              >
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                <span className="flex-1 truncate">{collection.name}</span>
                <span className="text-xs text-muted-foreground">
                  {collection.itemCount}
                </span>
              </Link>
            ))}
          </>
        )}

        {/* Recent */}
        {sidebarCollections.recents.length > 0 && (
          <>
            <div className="mt-3 px-2 py-1 text-xs font-medium text-muted-foreground">
              Recent
            </div>
            {sidebarCollections.recents.map((collection) => (
              <Link
                key={collection.id}
                href={`/collections/${collection.id}`}
                onClick={onLinkClick}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent",
                  pathname === `/collections/${collection.id}` && "bg-accent text-accent-foreground font-medium"
                )}
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: collection.dominantColor || "#6b7280",
                  }}
                />
                <span className="flex-1 truncate">{collection.name}</span>
                <span className="text-xs text-muted-foreground">
                  {collection.itemCount}
                </span>
              </Link>
            ))}
          </>
        )}

        {/* View all collections link */}
        <Link
          href="/collections"
          onClick={onLinkClick}
          className={cn(
            "mt-2 flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            pathname === "/collections" && "bg-accent text-accent-foreground font-medium"
          )}
        >
          View all collections
        </Link>
      </div>
    </>
  );
}
