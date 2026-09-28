import Image from "next/image";
import { File } from "lucide-react";
import { r2PublicUrl } from "@/lib/file-urls";
import { formatFileSize } from "@/lib/r2";
import type { PublicItem } from "@/lib/db/public";

/** The image itself when it lives on the app's R2 host; otherwise the same card a file gets. */
export function isRenderableImage(item: PublicItem): boolean {
  const publicUrl = r2PublicUrl();
  return item.itemType.name === "image" && !!publicUrl && !!item.fileUrl?.startsWith(`${publicUrl}/`);
}

export function ImageBlock({ item }: { item: PublicItem }) {
  return (
    <div className="relative aspect-video bg-black/40">
      <Image
        src={item.fileUrl!}
        alt={item.title}
        fill
        sizes="(max-width: 768px) 100vw, 768px"
        className="object-contain"
      />
    </div>
  );
}

export function FileBlock({ item }: { item: PublicItem }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <File className="h-8 w-8 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <span className="block truncate font-mono text-sm text-foreground">
          {item.fileName ?? item.title}
        </span>
        {item.fileSize ? (
          <span className="block text-xs text-muted-foreground">{formatFileSize(item.fileSize)}</span>
        ) : null}
      </div>
    </div>
  );
}
