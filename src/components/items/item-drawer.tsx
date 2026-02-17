"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Star,
  Pin,
  Copy,
  Pencil,
  Trash2,
  Tag,
  FolderOpen,
  Info,
  X,
  Save,
  Download,
  File,
} from "lucide-react";
import { formatFileSize } from "@/lib/r2";
import { formatLongDate } from "@/lib/utils/date";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getItemTypeIcon } from "@/lib/constants/item-types";
import { LANGUAGES } from "@/lib/constants/editor";
import { useItemDrawer } from "./item-drawer-provider";
import { useClipboard } from "@/hooks/use-clipboard";
import { toast } from "sonner";
import { updateItem, deleteItem, toggleItemFavorite, toggleItemPin } from "@/actions/items";
import { getUserCollections } from "@/actions/collections";
import DeleteItemDialog from "./delete-item-dialog";
import CodeEditor from "./code-editor";
import MarkdownEditor from "./markdown-editor";
import CollectionPicker, { type CollectionOption } from "./collection-picker";
import SuggestTagsButton from "./suggest-tags-button";
import GenerateDescriptionButton from "./generate-description-button";

function DrawerSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </div>
      {/* Action bar skeleton */}
      <Skeleton className="h-9 w-full" />
      <Separator />
      {/* Content skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

// Types that have content field
const TEXT_TYPES = ["snippet", "prompt", "command", "note"];
// Types that have language field
const LANGUAGE_TYPES = ["snippet", "command"];
// Types that support AI prompt optimization
const OPTIMIZE_TYPES = ["prompt"];
// Types that have file uploads
const FILE_TYPES = ["file", "image"];

export default function ItemDrawer() {
  const router = useRouter();
  const { isOpen, item, isLoading, isPro, closeDrawer, setItem } = useItemDrawer();
  const { copy } = useClipboard();

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("");
  const [tags, setTags] = useState("");
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);

  // Reset form when item changes or edit mode is entered
  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || "");
      setContent(item.content || "");
      setUrl(item.url || "");
      setLanguage(item.language || "");
      setTags(item.tags.join(", "));
      setSelectedCollectionIds(item.collections.map((c) => c.id));
    }
  }, [item]);

  // Reset edit mode and delete dialog when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setShowDeleteDialog(false);
    }
  }, [isOpen]);

  const handleToggleFavorite = async () => {
    if (!item) return;

    const result = await toggleItemFavorite(item.id);

    if (result.success && result.data) {
      setItem({ ...item, isFavorite: result.data.isFavorite });
      toast.success(result.data.isFavorite ? "Added to favorites" : "Removed from favorites");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update favorite");
    }
  };

  const handleTogglePin = async () => {
    if (!item) return;

    const result = await toggleItemPin(item.id);

    if (result.success && result.data) {
      setItem({ ...item, isPinned: result.data.isPinned });
      toast.success(result.data.isPinned ? "Item pinned" : "Item unpinned");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update pin");
    }
  };

  const handleCopy = () => {
    if (!item) return;
    const textToCopy = item.content || item.url || item.title;
    copy(textToCopy);
  };

  const handleEdit = async () => {
    // Fetch collections for the picker
    const result = await getUserCollections();
    if (result.success && result.data) {
      setCollections(result.data);
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Reset form to original values
    if (item) {
      setTitle(item.title);
      setDescription(item.description || "");
      setContent(item.content || "");
      setUrl(item.url || "");
      setLanguage(item.language || "");
      setTags(item.tags.join(", "));
      setSelectedCollectionIds(item.collections.map((c) => c.id));
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!item) return;

    setIsSaving(true);
    try {
      const tagsArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const result = await updateItem(item.id, {
        title,
        description: description || null,
        content: content || null,
        url: url || null,
        language: language || null,
        tags: tagsArray,
        collectionIds: selectedCollectionIds,
      });

      if (result.success && result.data) {
        setItem(result.data);
        setIsEditing(false);
        toast.success("Item updated");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update item");
      }
    } catch {
      toast.error("Failed to update item");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;

    const result = await deleteItem(item.id);

    if (result.success) {
      toast.success("Item deleted");
      closeDrawer();
      router.refresh();
    } else {
      toast.error(result.error || "Failed to delete item");
    }
  };

  const handleAcceptOptimized = async (optimizedContent: string) => {
    if (!item) return;

    const result = await updateItem(item.id, {
      title: item.title,
      description: item.description || null,
      content: optimizedContent,
      url: item.url || null,
      language: item.language || null,
      tags: item.tags,
      collectionIds: item.collections.map((c) => c.id),
    });

    if (result.success && result.data) {
      setItem(result.data);
      toast.success("Prompt updated with optimized version");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to save optimized prompt");
    }
  };

  const IconComponent = item ? getItemTypeIcon(item.itemType.icon) : null;
  const iconColor = item?.itemType.color;
  const typeName = item?.itemType.name || "";
  const showContent = TEXT_TYPES.includes(typeName);
  const showLanguage = LANGUAGE_TYPES.includes(typeName);
  const showOptimize = OPTIMIZE_TYPES.includes(typeName);
  const showUrl = typeName === "link";
  const showFileContent = FILE_TYPES.includes(typeName);
  const isImage = typeName === "image";
  const canSave = title.trim().length > 0;

  const handleDownload = () => {
    if (!item?.fileUrl) return;

    // Extract the path from the R2 URL (format: https://xxx.r2.dev/{userId}/{timestamp}-{filename})
    try {
      const url = new URL(item.fileUrl);
      // Remove leading slash from pathname
      const filePath = url.pathname.slice(1);
      // Use download proxy to avoid CORS
      window.open(`/api/download/${filePath}`, "_blank");
    } catch {
      // Fallback: open the file URL directly
      window.open(item.fileUrl, "_blank");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-xl p-0"
      >
        {isLoading || !item ? (
          <>
            <SheetHeader className="sr-only">
              <SheetTitle>Loading item</SheetTitle>
              <SheetDescription>Loading item details</SheetDescription>
            </SheetHeader>
            <DrawerSkeleton />
          </>
        ) : (
          <>
            {/* Header */}
            <SheetHeader className="p-6 pb-0">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${iconColor}20` }}
                >
                  {IconComponent && (
                    <IconComponent
                      className="h-5 w-5"
                      style={{ color: iconColor }}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Title"
                      className="text-lg font-semibold"
                    />
                  ) : (
                    <SheetTitle className="text-lg truncate">
                      {item.title}
                    </SheetTitle>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="secondary"
                      className="text-xs capitalize"
                      style={{
                        backgroundColor: `${iconColor}20`,
                        color: iconColor,
                      }}
                    >
                      {item.itemType.name}s
                    </Badge>
                    {!isEditing && item.language && (
                      <Badge variant="secondary" className="text-xs">
                        {item.language}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <SheetDescription className="sr-only">
                {isEditing ? `Editing ${item.title}` : `Details for ${item.title}`}
              </SheetDescription>
            </SheetHeader>

            {/* Action Bar */}
            {isEditing ? (
              <div className="flex items-center gap-2 px-6 py-3">
                <Button
                  onClick={handleSave}
                  disabled={!canSave || isSaving}
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-6 py-3">
                <button
                  onClick={handleToggleFavorite}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                  style={
                    item.isFavorite
                      ? { color: "#eab308" }
                      : { color: "var(--color-muted-foreground)" }
                  }
                >
                  <Star
                    className="h-4 w-4"
                    fill={item.isFavorite ? "#eab308" : "none"}
                  />
                  Favorite
                </button>
                <button
                  onClick={handleTogglePin}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                  style={
                    item.isPinned
                      ? { color: "#3b82f6" }
                      : { color: "var(--color-muted-foreground)" }
                  }
                >
                  <Pin
                    className="h-4 w-4"
                    fill={item.isPinned ? "#3b82f6" : "none"}
                  />
                  Pin
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
                {showFileContent && item.fileUrl && (
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                )}
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => setShowDeleteDialog(true)}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}

            <Separator />

            {/* Content Sections */}
            <div className="space-y-6 p-6">
              {isEditing ? (
                <>
                  {/* Edit Form */}
                  <div className="space-y-4">
                    {/* Description */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="description">Description</Label>
                        {isPro && (
                          <GenerateDescriptionButton
                            title={title}
                            content={content || null}
                            url={url || null}
                            language={language || null}
                            typeName={typeName}
                            onGenerated={setDescription}
                          />
                        )}
                      </div>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Optional description..."
                        rows={2}
                      />
                    </div>

                    {/* Language (snippet/command) */}
                    {showLanguage && (
                      <div className="space-y-2">
                        <Label htmlFor="language">Language</Label>
                        <Select value={language || "plaintext"} onValueChange={setLanguage}>
                          <SelectTrigger id="language">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGES.map((lang) => (
                              <SelectItem key={lang.value} value={lang.value}>
                                {lang.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Content (text types) */}
                    {showContent && (
                      <div className="space-y-2">
                        <Label htmlFor="content">Content</Label>
                        {showLanguage ? (
                          <CodeEditor
                            value={content}
                            onChange={setContent}
                            language={language || "plaintext"}
                          />
                        ) : (
                          <MarkdownEditor
                            value={content}
                            onChange={setContent}
                            placeholder="Write your content in Markdown..."
                          />
                        )}
                      </div>
                    )}

                    {/* URL (link types) */}
                    {showUrl && (
                      <div className="space-y-2">
                        <Label htmlFor="url">URL</Label>
                        <Input
                          id="url"
                          type="url"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    )}

                    {/* Tags */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="tags">Tags</Label>
                        {isPro && (
                          <SuggestTagsButton
                            title={title}
                            content={content || null}
                            language={language || null}
                            typeName={typeName}
                            existingTags={tags.split(",").map((t) => t.trim()).filter((t) => t.length > 0)}
                            onAcceptTag={(tag) => {
                              setTags((prev) => {
                                const trimmed = prev.trim();
                                if (!trimmed) return tag;
                                return trimmed.endsWith(",") ? `${trimmed} ${tag}` : `${trimmed}, ${tag}`;
                              });
                            }}
                            disabled={isSaving}
                          />
                        )}
                      </div>
                      <Input
                        id="tags"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="Comma-separated tags..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Separate tags with commas
                      </p>
                    </div>
                  </div>

                  {/* Collections (editable) */}
                  {collections.length > 0 && (
                    <div className="space-y-2">
                      <Label>Collections</Label>
                      <CollectionPicker
                        collections={collections}
                        selectedIds={selectedCollectionIds}
                        onChange={setSelectedCollectionIds}
                        disabled={isSaving}
                      />
                    </div>
                  )}

                  {/* Non-editable info in edit mode */}
                  <Separator />

                  {/* Details (display only) */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-sm font-medium text-muted-foreground">
                        Details
                      </p>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created</span>
                        <span className="text-foreground">
                          {formatLongDate(item.createdAt)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Updated</span>
                        <span className="text-foreground">
                          {formatLongDate(item.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* View Mode Content */}
                  {/* Description */}
                  {item.description && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Description
                      </p>
                      <p className="text-sm text-foreground">{item.description}</p>
                    </div>
                  )}

                  {/* Content (text types) */}
                  {item.content && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Content
                      </p>
                      {showLanguage ? (
                        <CodeEditor
                          value={item.content}
                          language={item.language || "plaintext"}
                          readOnly
                          showExplain
                          isPro={isPro}
                          title={item.title}
                          typeName={typeName}
                        />
                      ) : (
                        <MarkdownEditor
                          value={item.content}
                          readOnly
                          showOptimize={showOptimize}
                          isPro={isPro}
                          title={item.title}
                          onAcceptOptimized={handleAcceptOptimized}
                        />
                      )}
                    </div>
                  )}

                  {/* URL (link types) */}
                  {item.url && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        URL
                      </p>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:underline break-all"
                      >
                        {item.url}
                      </a>
                    </div>
                  )}

                  {/* File/Image content */}
                  {showFileContent && item.fileUrl && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        {isImage ? "Image" : "File"}
                      </p>
                      {isImage ? (
                        <div className="rounded-lg border border-border overflow-hidden bg-muted/30 relative h-80">
                          <Image
                            src={item.fileUrl}
                            alt={item.fileName || item.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 500px"
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <div className="rounded-lg border border-border p-4 bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                              <File className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">
                                {item.fileName}
                              </p>
                              {item.fileSize && (
                                <p className="text-muted-foreground text-xs">
                                  {formatFileSize(item.fileSize)}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleDownload}
                            >
                              <Download className="h-4 w-4 mr-1.5" />
                              Download
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-sm font-medium text-muted-foreground">
                          Tags
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs bg-muted text-muted-foreground"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Collections */}
                  {item.collections.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-sm font-medium text-muted-foreground">
                          Collections
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.collections.map((collection) => (
                          <Badge
                            key={collection.id}
                            variant="secondary"
                            className="text-xs"
                          >
                            {collection.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Details */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-sm font-medium text-muted-foreground">
                        Details
                      </p>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created</span>
                        <span className="text-foreground">
                          {formatLongDate(item.createdAt)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Updated</span>
                        <span className="text-foreground">
                          {formatLongDate(item.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>

      {item && (
        <DeleteItemDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          itemTitle={item.title}
          onConfirm={handleDelete}
        />
      )}
    </Sheet>
  );
}
