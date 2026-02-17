"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Star, LogOut, User, Settings } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getItemTypeIcon } from "@/lib/constants/item-types";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { ItemTypeWithCount } from "@/lib/db/items";
import type { SidebarCollections } from "@/lib/db/collections";

interface User {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
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
  const pathname = usePathname();

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
                const isActive = pathname === `/items/${type.name}s`;

                return (
                  <Link
                    key={type.name}
                    href={`/items/${type.name}s`}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent",
                      isActive && "bg-accent text-accent-foreground font-medium"
                    )}
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
                      onClick={onClose}
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
                onClick={onClose}
                className={cn(
                  "mt-2 flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  pathname === "/collections" && "bg-accent text-accent-foreground font-medium"
                )}
              >
                View all collections
              </Link>
            </div>
          </div>

          {/* User section at bottom */}
          <div className="border-t border-border p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-md p-1 hover:bg-accent">
                  <UserAvatar name={user?.name} image={user?.image} />
                  <div className="flex-1 overflow-hidden text-left">
                    <p className="truncate text-sm font-medium">
                      {user?.name || "Guest"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user?.email || ""}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/profile" onClick={onClose} className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" onClick={onClose} className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/sign-in" })}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
