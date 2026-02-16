"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Menu, Star, Plus, FolderPlus, FilePlus, FolderOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NewItemDialog from "@/components/items/new-item-dialog";
import NewCollectionDialog from "@/components/collections/new-collection-dialog";
import { useSearch } from "@/components/search/search-provider";

interface TopBarProps {
  onMenuClick?: () => void;
  isPro?: boolean;
}

export default function TopBar({ onMenuClick, isPro }: TopBarProps) {
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const { openSearch } = useSearch();

  return (
    <header className="flex h-14 items-center gap-2 sm:gap-4 border-b border-border px-3 sm:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden shrink-0"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
        <FolderOpen className="h-6 w-6 text-primary" />
        <span className="hidden sm:inline text-lg font-semibold">DevStash</span>
      </Link>

      {/* Search trigger - full bar on sm+, icon-only on mobile */}
      <button
        type="button"
        onClick={openSearch}
        className="relative mx-auto hidden sm:flex max-w-md flex-1 items-center h-9 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="flex-1 text-left">Search items...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium sm:flex">
          ⌘K
        </kbd>
      </button>

      {/* Mobile search icon */}
      <div className="flex-1 sm:hidden" />
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden shrink-0"
        onClick={openSearch}
      >
        <Search className="h-5 w-5" />
      </Button>

      {/* Actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {!isPro && (
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link href="/upgrade">
              <Sparkles className="h-4 w-4 mr-1" />
              Upgrade
            </Link>
          </Button>
        )}

        <Button variant="ghost" size="icon" asChild>
          <Link href="/favorites" title="Favorites">
            <Star className="h-5 w-5" />
          </Link>
        </Button>

        {/* Mobile: + dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" className="sm:hidden">
              <Plus className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setNewItemOpen(true)}>
              <FilePlus className="mr-2 h-4 w-4" />
              New Item
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setNewCollectionOpen(true)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              New Collection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Desktop: full buttons */}
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex"
          onClick={() => setNewCollectionOpen(true)}
        >
          New Collection
        </Button>
        <Button
          size="sm"
          className="hidden sm:inline-flex"
          onClick={() => setNewItemOpen(true)}
        >
          New Item
        </Button>
      </div>

      <NewItemDialog open={newItemOpen} onOpenChange={setNewItemOpen} />
      <NewCollectionDialog open={newCollectionOpen} onOpenChange={setNewCollectionOpen} />
    </header>
  );
}
