"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useSearch } from "@/components/search/search-provider";
import { useItemDrawer } from "@/components/items/item-drawer-provider";
import { getItemTypeIcon } from "@/lib/constants/item-types";

/**
 * Stricter search filter - requires search term to appear as contiguous substring
 * Returns 1 for match, 0 for no match (cmdk expects this format)
 */
function strictFilter(value: string, search: string): number {
  if (!search) return 1;
  return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
}

export default function CommandPalette() {
  const { isOpen, closeSearch, searchData, isLoading } = useSearch();
  const { openDrawer } = useItemDrawer();
  const router = useRouter();

  const handleItemSelect = useCallback(
    (itemId: string) => {
      closeSearch();
      openDrawer(itemId);
    },
    [closeSearch, openDrawer]
  );

  const handleCollectionSelect = useCallback(
    (collectionId: string) => {
      closeSearch();
      router.push(`/collections/${collectionId}`);
    },
    [closeSearch, router]
  );

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={(open) => !open && closeSearch()}
      title="Search"
      description="Search items and collections"
      showCloseButton={false}
      filter={strictFilter}
    >
      <CommandInput placeholder="Search items and collections..." />
      <CommandList>
        {isLoading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : (
          <>
            <CommandEmpty>No results found.</CommandEmpty>

            {/* Items Section */}
            {searchData && searchData.items.length > 0 && (
              <CommandGroup heading="Items">
                {searchData.items.map((item) => {
                  const IconComponent = getItemTypeIcon(item.typeIcon);
                  return (
                    <CommandItem
                      key={item.id}
                      value={`item-${item.title}-${item.contentPreview || ""}`}
                      onSelect={() => handleItemSelect(item.id)}
                      className="cursor-pointer"
                    >
                      <div
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
                        style={{ backgroundColor: `${item.typeColor}20` }}
                      >
                        <IconComponent
                          className="h-4 w-4"
                          style={{ color: item.typeColor }}
                        />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate">{item.title}</span>
                        {item.contentPreview && (
                          <span className="text-xs text-muted-foreground truncate">
                            {item.contentPreview}
                          </span>
                        )}
                      </div>
                      <span className="ml-auto text-xs text-muted-foreground capitalize">
                        {item.typeName}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {searchData &&
              searchData.items.length > 0 &&
              searchData.collections.length > 0 && <CommandSeparator />}

            {/* Collections Section */}
            {searchData && searchData.collections.length > 0 && (
              <CommandGroup heading="Collections">
                {searchData.collections.map((collection) => (
                  <CommandItem
                    key={collection.id}
                    value={`collection-${collection.name}`}
                    onSelect={() => handleCollectionSelect(collection.id)}
                    className="cursor-pointer"
                  >
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{collection.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {collection.itemCount}{" "}
                      {collection.itemCount === 1 ? "item" : "items"}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
