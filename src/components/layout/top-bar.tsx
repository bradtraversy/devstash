"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Menu, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import NewItemDialog from "@/components/items/new-item-dialog";
import NewCollectionDialog from "@/components/collections/new-collection-dialog";
import { useSearch } from "@/components/search/search-provider";

interface TopBarProps {
  onMenuClick?: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const { openSearch } = useSearch();

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <span className="text-sm font-bold">DS</span>
        </div>
        <span className="text-lg font-semibold">DevStash</span>
      </Link>

      {/* Search trigger - opens command palette */}
      <button
        type="button"
        onClick={openSearch}
        className="relative mx-auto flex max-w-md flex-1 items-center h-9 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="flex-1 text-left">Search items...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium sm:flex">
          ⌘K
        </kbd>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/favorites" title="Favorites">
            <Star className="h-5 w-5" />
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={() => setNewCollectionOpen(true)}>
          New Collection
        </Button>
        <Button size="sm" onClick={() => setNewItemOpen(true)}>
          New Item
        </Button>
      </div>

      <NewItemDialog open={newItemOpen} onOpenChange={setNewItemOpen} />
      <NewCollectionDialog open={newCollectionOpen} onOpenChange={setNewCollectionOpen} />
    </header>
  );
}
