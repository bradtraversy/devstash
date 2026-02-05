"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { getItemTypeIcon } from "@/lib/constants/item-types";
import { useItemDrawer } from "./item-drawer-provider";
import { toast } from "sonner";
import { updateItem, deleteItem } from "@/actions/items";
import DeleteItemDialog from "./delete-item-dialog";

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

export default function ItemDrawer() {
  const router = useRouter();
  const { isOpen, item, isLoading, closeDrawer, setItem } = useItemDrawer();

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

  // Reset form when item changes or edit mode is entered
  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || "");
      setContent(item.content || "");
      setUrl(item.url || "");
      setLanguage(item.language || "");
      setTags(item.tags.join(", "));
    }
  }, [item]);

  // Reset edit mode when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
    }
  }, [isOpen]);

  const handleCopy = async () => {
    if (!item) return;

    const textToCopy = item.content || item.url || item.title;
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleEdit = () => {
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

  const IconComponent = item ? getItemTypeIcon(item.itemType.icon) : null;
  const iconColor = item?.itemType.color;
  const typeName = item?.itemType.name || "";
  const showContent = TEXT_TYPES.includes(typeName);
  const showLanguage = LANGUAGE_TYPES.includes(typeName);
  const showUrl = typeName === "link";
  const canSave = title.trim().length > 0;

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
                <button className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted">
                  <Pin className="h-4 w-4" />
                  Pin
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
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
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Optional description..."
                        rows={2}
                      />
                    </div>

                    {/* Content (text types) */}
                    {showContent && (
                      <div className="space-y-2">
                        <Label htmlFor="content">Content</Label>
                        <Textarea
                          id="content"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Enter content..."
                          rows={10}
                          className="font-mono text-sm"
                        />
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

                    {/* Language (snippet/command) */}
                    {showLanguage && (
                      <div className="space-y-2">
                        <Label htmlFor="language">Language</Label>
                        <Input
                          id="language"
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          placeholder="e.g., javascript, python, bash..."
                        />
                      </div>
                    )}

                    {/* Tags */}
                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags</Label>
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

                  {/* Non-editable info in edit mode */}
                  <Separator />

                  {/* Collections (display only) */}
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
                          {new Date(item.createdAt).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Updated</span>
                        <span className="text-foreground">
                          {new Date(item.updatedAt).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
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
                      <div className="rounded-lg border border-border bg-muted/50 overflow-hidden">
                        <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
                          <code>
                            {item.content.split("\n").map((line, i) => (
                              <span key={i} className="flex">
                                <span className="inline-block w-8 shrink-0 text-right text-muted-foreground/50 select-none pr-4">
                                  {i + 1}
                                </span>
                                <span className="flex-1">{line}</span>
                              </span>
                            ))}
                          </code>
                        </pre>
                      </div>
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
                          {new Date(item.createdAt).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Updated</span>
                        <span className="text-foreground">
                          {new Date(item.updatedAt).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
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
