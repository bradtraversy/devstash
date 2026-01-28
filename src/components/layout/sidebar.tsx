"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Star,
  ChevronDown,
  ChevronRight,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getItemTypeIcon } from "@/lib/constants/item-types";
import type { ItemTypeWithCount } from "@/lib/db/items";
import type { SidebarCollections } from "@/lib/db/collections";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  itemTypes: ItemTypeWithCount[];
  sidebarCollections: SidebarCollections;
  user: User | null;
}

export default function Sidebar({
  isCollapsed,
  onToggle,
  itemTypes,
  sidebarCollections,
  user,
}: SidebarProps) {
  const [collectionsExpanded, setCollectionsExpanded] = useState(true);

  const userInitials = user?.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("") || "?";

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
          {itemTypes.map((type) => {
            const Icon = getItemTypeIcon(type.icon);

            return (
              <Link
                key={type.name}
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
                  {sidebarCollections.favorites.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                        Favorites
                      </div>
                      {sidebarCollections.favorites.map((collection) => (
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
                  {sidebarCollections.recents.length > 0 && (
                    <>
                      <div className="mt-3 px-2 py-1 text-xs font-medium text-muted-foreground">
                        Recent
                      </div>
                      {sidebarCollections.recents.map((collection) => (
                        <Link
                          key={collection.id}
                          href={`/collections/${collection.id}`}
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
                    className="mt-2 flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    View all collections
                  </Link>
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
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </div>
        ) : (
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
        )}
      </div>
    </aside>
  );
}
