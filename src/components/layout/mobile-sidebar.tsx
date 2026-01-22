"use client";

import Link from "next/link";
import {
  Code,
  Sparkles,
  Terminal,
  StickyNote,
  File,
  Image,
  Link as LinkIcon,
  Star,
  Settings,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  mockItemTypes,
  mockCollections,
  mockItemTypeCounts,
  mockUser,
} from "@/lib/mock-data";

const ICON_MAP = {
  Code,
  Sparkles,
  Terminal,
  StickyNote,
  File,
  Image,
  Link: LinkIcon,
};

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const favoriteCollections = mockCollections.filter((c) => c.isFavorite);
  const recentCollections = mockCollections
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 3);

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
              {mockItemTypes.map((type) => {
                const Icon = ICON_MAP[type.icon as keyof typeof ICON_MAP];
                const count =
                  mockItemTypeCounts[
                    type.name as keyof typeof mockItemTypeCounts
                  ] || 0;

                return (
                  <Link
                    key={type.id}
                    href={`/items/${type.name}s`}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    <Icon className="h-4 w-4" style={{ color: type.color }} />
                    <span className="flex-1 capitalize">{type.name}s</span>
                    <span className="text-xs text-muted-foreground">
                      {count}
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
              {favoriteCollections.length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    Favorites
                  </div>
                  {favoriteCollections.map((collection) => (
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
              <div className="mt-3 px-2 py-1 text-xs font-medium text-muted-foreground">
                Recent
              </div>
              {recentCollections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.id}`}
                  onClick={onClose}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent"
                >
                  <div className="h-4 w-4" />
                  <span className="flex-1 truncate">{collection.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {collection.itemCount}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* User section at bottom */}
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  {mockUser.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">{mockUser.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {mockUser.email}
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
