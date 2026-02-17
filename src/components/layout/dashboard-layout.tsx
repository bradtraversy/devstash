"use client";

import { useState } from "react";
import TopBar from "@/components/layout/top-bar";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import ItemDrawerProvider from "@/components/items/item-drawer-provider";
import ItemDrawer from "@/components/items/item-drawer";
import SearchProvider from "@/components/search/search-provider";
import CommandPalette from "@/components/search/command-palette";
import EditorPreferencesProvider from "@/components/settings/editor-preferences-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ItemTypeWithCount } from "@/lib/db/items";
import type { SidebarCollections } from "@/lib/db/collections";
import type { EditorPreferences } from "@/lib/constants/editor";

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
  editorPreferences?: EditorPreferences;
  isPro?: boolean;
}

export default function DashboardLayout({
  children,
  itemTypes,
  sidebarCollections,
  user,
  editorPreferences,
  isPro,
}: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Wrap content with EditorPreferencesProvider if preferences are provided
  const content = (
    <>
      <main className="flex-1 overflow-auto p-6">{children}</main>
      <ItemDrawer />
      <CommandPalette />
    </>
  );

  return (
    <SearchProvider>
      <TooltipProvider>
        <div className="flex h-screen flex-col">
          <TopBar onMenuClick={() => setIsMobileSidebarOpen(true)} isPro={isPro} />
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
            <ItemDrawerProvider isPro={isPro}>
              {editorPreferences ? (
                <EditorPreferencesProvider initialPreferences={editorPreferences}>
                  {content}
                </EditorPreferencesProvider>
              ) : (
                content
              )}
            </ItemDrawerProvider>
          </div>
        </div>
      </TooltipProvider>
    </SearchProvider>
  );
}
