"use client";

import { useState } from "react";
import TopBar from "@/components/layout/top-bar";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import ItemDrawerProvider from "@/components/items/item-drawer-provider";
import ItemDrawer from "@/components/items/item-drawer";
import SearchProvider from "@/components/search/search-provider";
import CommandPalette from "@/components/search/command-palette";
import type { ItemTypeWithCount } from "@/lib/db/items";
import type { SidebarCollections } from "@/lib/db/collections";

interface User {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  itemTypes: ItemTypeWithCount[];
  sidebarCollections: SidebarCollections;
  user: User | null;
}

export default function DashboardLayout({
  children,
  itemTypes,
  sidebarCollections,
  user,
}: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <SearchProvider>
      <div className="flex h-screen flex-col">
        <TopBar onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <div className="flex flex-1 overflow-hidden">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <Sidebar
              isCollapsed={isSidebarCollapsed}
              onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              itemTypes={itemTypes}
              sidebarCollections={sidebarCollections}
              user={user}
            />
          </div>

          {/* Mobile Sidebar */}
          <MobileSidebar
            isOpen={isMobileSidebarOpen}
            onClose={() => setIsMobileSidebarOpen(false)}
            itemTypes={itemTypes}
            sidebarCollections={sidebarCollections}
            user={user}
          />

          {/* Main Content */}
          <ItemDrawerProvider>
            <main className="flex-1 overflow-auto p-6">{children}</main>
            <ItemDrawer />
            <CommandPalette />
          </ItemDrawerProvider>
        </div>
      </div>
    </SearchProvider>
  );
}
