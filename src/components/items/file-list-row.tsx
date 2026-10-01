"use client";

import { Download, Star, Pin, File, FileText, FileImage, FileVideo, FileAudio, FileArchive, FileCode, FileSpreadsheet } from 'lucide-react';
import { useItemDrawer } from '@/components/items/item-drawer-provider';
import { formatRelativeDate } from '@/lib/utils/date';
import { formatFileSize } from '@/lib/r2';
import type { ItemWithType } from '@/lib/db/items';
import VisibilityMark from '@/components/items/visibility-mark';

interface FileListRowProps {
  item: ItemWithType;
}

/**
 * Get icon component based on file extension
 */
function getFileIcon(fileName: string | null) {
  if (!fileName) return File;

  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  // Document types
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
    return FileText;
  }

  // Image types
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return FileImage;
  }

  // Video types
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv'].includes(ext)) {
    return FileVideo;
  }

  // Audio types
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) {
    return FileAudio;
  }

  // Archive types
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return FileArchive;
  }

  // Code types
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'css', 'scss', 'html', 'json', 'xml', 'yaml', 'yml', 'md', 'sh', 'sql'].includes(ext)) {
    return FileCode;
  }

  // Spreadsheet types
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
    return FileSpreadsheet;
  }

  return File;
}

export default function FileListRow({ item }: FileListRowProps) {
  const { openDrawer } = useItemDrawer();
  const FileIcon = getFileIcon(item.fileName);
  const iconColor = item.itemType.color;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.fileUrl) return;

    // Extract the path from the R2 URL (format: https://xxx.r2.dev/{userId}/{timestamp}-{filename})
    try {
      const url = new URL(item.fileUrl);
      // Remove leading slash from pathname
      const filePath = url.pathname.slice(1);
      // Use download proxy to avoid CORS
      window.open(`/api/download/${filePath}`, '_blank');
    } catch {
      // Fallback: open the file URL directly
      window.open(item.fileUrl, '_blank');
    }
  };

  return (
    <div
      className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => openDrawer(item.id)}
    >
      {/* File Icon */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${iconColor}20` }}
      >
        <FileIcon className="h-5 w-5" style={{ color: iconColor }} />
      </div>

      {/* File Info - Desktop */}
      <div className="hidden sm:flex flex-1 items-center gap-4 min-w-0">
        {/* File Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">
              {item.title}
            </span>
            {item.isFavorite && (
              <Star className="h-4 w-4 shrink-0 fill-yellow-500 text-yellow-500" />
            )}
            {item.isPinned && (
              <Pin className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <VisibilityMark visibility={item.visibility} />
          </div>
          {item.fileName && (
            <p className="text-sm text-muted-foreground truncate">
              {item.fileName}
            </p>
          )}
        </div>

        {/* File Size */}
        <div className="w-24 text-sm text-muted-foreground text-right shrink-0">
          {item.fileSize ? formatFileSize(item.fileSize) : '—'}
        </div>

        {/* Upload Date */}
        <div className="w-28 text-sm text-muted-foreground text-right shrink-0">
          {formatRelativeDate(item.createdAt)}
        </div>
      </div>

      {/* File Info - Mobile (stacked) */}
      <div className="flex sm:hidden flex-1 flex-col min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">
            {item.title}
          </span>
          {item.isFavorite && (
            <Star className="h-4 w-4 shrink-0 fill-yellow-500 text-yellow-500" />
          )}
          {item.isPinned && (
            <Pin className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {item.fileSize && <span>{formatFileSize(item.fileSize)}</span>}
          {item.fileSize && <span>•</span>}
          <span>{formatRelativeDate(item.createdAt)}</span>
        </div>
      </div>

      {/* Download Button */}
      {item.fileUrl && (
        <button
          onClick={handleDownload}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-muted transition-colors"
          title="Download file"
        >
          <Download className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
