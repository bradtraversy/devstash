"use client";

import Link from "next/link";
import { Star, Settings } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getItemTypeIcon } from "@/lib/constants/item-types";
import type { ItemTypeWithCount } from "@/lib/db/items";
import type { SidebarCollections } from "@/lib/db/collections";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  itemTypes: ItemTypeWithCount[];
  sidebarCollections: SidebarCollections;
  user: User | null;
}

export default function MobileSidebar({
  isOpen,
  onClose,
  itemTypes,
  sidebarCollections,
  user,
}: MobileSidebarProps) {
  const userInitials = user?.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("") || "?";

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-full flex-col">
          {/* Header */}
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle className="text-left text-sm font-medium text-muted-foreground">
              Navigation
            </SheetTitle>
          </SheetHeader>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Types Section */}
            <div className="space-y-1">
              <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Types
              </h3>
              {itemTypes.map((type) => {
                const Icon = getItemTypeIcon(type.icon);

                return (
                  <Link
                    key={type.name}
                    href={`/items/${type.name}s`}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    <Icon className="h-4 w-4" style={{ color: type.color }} />
                    <span className="capitalize">{type.name}s</span>
                    {(type.name === "file" || type.name === "image") && (
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
                      onClick={onClose}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent"
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
                      onClick={onClose}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent"
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
                onClick={onClose}
                className="mt-2 flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                View all collections
              </Link>
            </div>
          </div>

          {/* User section at bottom */}
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">{user?.name || "Guest"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email || ""}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
