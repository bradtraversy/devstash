"use client";

import Link from "next/link";
import { Search, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  onMenuClick?: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
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

      {/* Search - centered and flexible */}
      <div className="relative mx-auto flex max-w-md flex-1 items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search items..."
          className="w-full pl-9"
        />
        <kbd className="pointer-events-none absolute right-3 hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium opacity-100 sm:flex">
          ⌘K
        </kbd>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          New Collection
        </Button>
        <Button size="sm">New Item</Button>
      </div>
    </header>
  );
}
