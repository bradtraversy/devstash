"use client";

import {
  Copy,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Image as ImageIcon,
  Link2,
  Lock,
  PanelTop,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useCopyImage } from "@/hooks/use-copy-image";
import { imageFilename } from "@/lib/og/filename";
import { isTextType } from "@/lib/constants/item-types";
import { publicShortOgPath, publicShortRawPath } from "@/lib/public/paths";
import {
  VISIBILITY_OPTIONS,
  getVisibilityOption,
  type CollectionVisibility,
} from "@/lib/constants/visibility";
import type { ItemDetail } from "@/lib/db/items";

const VISIBILITY_ICONS = { PRIVATE: Lock, UNLISTED: Link2, PUBLIC: Globe } as const;

interface DrawerShareBlockProps {
  item: ItemDetail;
  /** False for files: they only get the control, so one shared before can still be made private. */
  canShare: boolean;
  shareLink: string;
  isSharing: boolean;
  onVisibilityChange: (visibility: CollectionVisibility) => void;
  onShare: () => void;
}

function ImageMenu({ item }: { item: ItemDetail }) {
  const { copyImage } = useCopyImage();
  const ownerImageUrl = `/api/items/${item.id}/image`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" title="The whole snippet as a PNG">
          <ImageIcon className="h-4 w-4" />
          Image
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem asChild>
          <a href={ownerImageUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open image
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`${ownerImageUrl}?download=1`} download={imageFilename(item.title)}>
            <Download className="h-4 w-4" />
            Download PNG
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => copyImage(ownerImageUrl)}>
          <Copy className="h-4 w-4" />
          Copy image
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function DrawerShareBlock({
  item,
  canShare,
  shareLink,
  isSharing,
  onVisibilityChange,
  onShare,
}: DrawerShareBlockProps) {
  const isShared = item.visibility !== "PRIVATE";
  const isText = isTextType(item.itemType.name);
  const option = getVisibilityOption(item.visibility);

  return (
    <section aria-label="Sharing" className="rounded-lg border border-border bg-muted/30 p-4">
      <div
        role="group"
        aria-label="Who can see it"
        className="flex w-full rounded-md border border-border bg-background p-0.5 sm:inline-flex sm:w-auto"
      >
        {VISIBILITY_OPTIONS.map(({ value, label }) => {
          const Icon = VISIBILITY_ICONS[value];
          const selected = item.visibility === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              disabled={isSharing}
              onClick={() => !selected && onVisibilityChange(value)}
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 text-sm sm:px-3 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60 sm:flex-none",
                selected && (value === "PRIVATE" ? "bg-accent text-foreground" : "bg-blue-500/15 text-blue-300 hover:text-blue-200")
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 max-[379px]:hidden" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{option.description}.</p>

      {!canShare ? null : isShared ? (
        <>
          <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-background py-1 pl-3 pr-1">
            <a
              href={shareLink}
              target="_blank"
              rel="noreferrer"
              title="Open the public page"
              className="min-w-0 flex-1 truncate font-mono text-sm text-blue-300 hover:underline"
            >
              {shareLink.replace(/^https?:\/\//, "")}
            </a>
            <Button size="sm" onClick={onShare} disabled={isSharing} className="shrink-0">
              <Copy className="h-4 w-4" />
              Copy link
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={shareLink} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open page
              </a>
            </Button>
            {isText && (
              <Button asChild variant="outline" size="sm">
                <a href={publicShortRawPath(item.shortId)} target="_blank" rel="noreferrer" title="Plain text, for curl and scripts">
                  <FileText className="h-4 w-4" />
                  Raw
                </a>
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <a href={publicShortOgPath(item.shortId)} target="_blank" rel="noreferrer" title="The preview Slack and X show for the link">
                <PanelTop className="h-4 w-4" />
                Card
              </a>
            </Button>
            {isText && <ImageMenu item={item} />}
          </div>
        </>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={onShare}
            disabled={isSharing}
            className="bg-blue-600 text-white hover:bg-blue-500"
          >
            <Share2 className="h-4 w-4" />
            Share with a link
          </Button>
          {isText && <ImageMenu item={item} />}
        </div>
      )}
    </section>
  );
}
