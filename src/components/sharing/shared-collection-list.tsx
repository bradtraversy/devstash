"use client";

import Link from "next/link";
import { Check, FolderOpen, Link2 } from "lucide-react";
import VisibilityPill from "@/components/items/visibility-pill";
import StopSharingButton from "@/components/sharing/stop-sharing-button";
import { useClipboard } from "@/hooks/use-clipboard";
import { useOrigin } from "@/hooks/use-origin";
import { publicCollectionPath, publicShortPath } from "@/lib/public/paths";
import type { SharedCollection } from "@/lib/db/collections";

function CopyCollectionLink({ shortId }: { shortId: string }) {
  const origin = useOrigin();
  const { copied, copy } = useClipboard();

  return (
    <button
      type="button"
      onClick={() => copy(`${origin}${publicShortPath(shortId)}`, "Link copied")}
      title="Copy the share link"
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-border text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-28"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Link2 className="h-4 w-4" />}
      <span className="sr-only sm:not-sr-only">Copy link</span>
    </button>
  );
}

interface SharedCollectionListProps {
  collections: SharedCollection[];
  handle: string | null;
}

export default function SharedCollectionList({ collections, handle }: SharedCollectionListProps) {
  const origin = useOrigin();
  const host = origin.replace(/^https?:\/\//, "");

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      {collections.map((collection) => (
        <li key={collection.id} className="group flex items-center gap-1 pr-2 transition-colors hover:bg-muted/50">
          <Link
            href={`/collections/${collection.id}`}
            className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <FolderOpen className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-1 items-baseline gap-2.5 overflow-hidden">
              <span className="truncate font-medium text-foreground">{collection.name}</span>
              <span className="hidden max-w-[60%] shrink-0 truncate font-mono text-xs text-blue-300 md:inline">
                {host}
                {handle ? publicCollectionPath(handle, collection.slug) : publicShortPath(collection.shortId)}
              </span>
            </span>
            <span className="hidden w-20 shrink-0 text-right text-xs text-muted-foreground lg:inline">
              {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
            </span>
            <VisibilityPill visibility={collection.visibility} />
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <CopyCollectionLink shortId={collection.shortId} />
            <StopSharingButton kind="collection" id={collection.id} />
          </div>
        </li>
      ))}
    </ul>
  );
}
