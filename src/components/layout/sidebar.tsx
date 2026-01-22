"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Code,
  Sparkles,
  Terminal,
  StickyNote,
  File,
  Image,
  Link as LinkIcon,
  Star,
  ChevronDown,
  ChevronRight,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
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

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const [collectionsExpanded, setCollectionsExpanded] = useState(true);

  const favoriteCollections = mockCollections.filter((c) => c.isFavorite);
  const recentCollections = mockCollections
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 3);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-card transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header with toggle button */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        {!isCollapsed && (
          <span className="text-sm font-medium text-muted-foreground">
            Navigation
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
        >
          {isCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Types Section */}
        <div className="space-y-1">
          {!isCollapsed && (
            <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Types
            </h3>
          )}
          {mockItemTypes.map((type) => {
            const Icon = ICON_MAP[type.icon as keyof typeof ICON_MAP];
            const count = mockItemTypeCounts[
              type.name as keyof typeof mockItemTypeCounts
            ] || 0;

            return (
              <Link
                key={type.id}
                href={`/items/${type.name}s`}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? type.name : undefined}
              >
                <Icon className="h-4 w-4" style={{ color: type.color }} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 capitalize">{type.name}s</span>
                    <span className="text-xs text-muted-foreground">
                      {count}
                    </span>
                  </>
                )}
              </Link>
            );
          })}
        </div>

        {/* Collections Section */}
        {!isCollapsed && (
          <>
            <Separator className="my-4" />
            <div className="space-y-1">
              <button
                onClick={() => setCollectionsExpanded(!collectionsExpanded)}
                className="flex w-full items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
              >
                {collectionsExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                Collections
              </button>

              {collectionsExpanded && (
                <div className="mt-2 space-y-1">
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
                          className="flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent"
                        >
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          <span className="flex-1 truncate">
                            {collection.name}
                          </span>
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
              )}
            </div>
          </>
        )}
      </div>

      {/* User section at bottom */}
      <div className="border-t border-border p-4">
        {isCollapsed ? (
          <div className="flex justify-center">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                {mockUser.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
          </div>
        ) : (
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
        )}
      </div>
    </aside>
  );
}
