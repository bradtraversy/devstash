"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createItem, type CreateItemInput } from "@/actions/items";
import { getUserCollections } from "@/actions/collections";
import { getItemTypeIcon, ITEM_TYPE_COLORS } from "@/lib/constants/item-types";
import { LANGUAGES } from "@/lib/constants/editor";
import CodeEditor from "./code-editor";
import MarkdownEditor from "./markdown-editor";
import FileUpload from "./file-upload";
import CollectionPicker, { type CollectionOption } from "./collection-picker";

interface NewItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: ItemTypeName;
}

export type ItemTypeName = "snippet" | "prompt" | "command" | "note" | "link" | "file" | "image";

const ITEM_TYPES: { value: ItemTypeName; label: string; icon: string; isPro?: boolean }[] = [
  { value: "snippet", label: "Snippet", icon: "Code" },
  { value: "prompt", label: "Prompt", icon: "Sparkles" },
  { value: "command", label: "Command", icon: "Terminal" },
  { value: "note", label: "Note", icon: "StickyNote" },
  { value: "link", label: "Link", icon: "Link" },
  { value: "file", label: "File", icon: "File", isPro: true },
  { value: "image", label: "Image", icon: "Image", isPro: true },
];

export default function NewItemDialog({ open, onOpenChange, defaultType }: NewItemDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [typeName, setTypeName] = useState<ItemTypeName>(defaultType || "snippet");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [fileData, setFileData] = useState<{
    fileUrl: string;
    fileName: string;
    fileSize: number;
  } | null>(null);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);

  // Fetch collections when dialog opens
  useEffect(() => {
    if (open) {
      getUserCollections().then((result) => {
        if (result.success && result.data) {
          setCollections(result.data);
        }
      });
    }
  }, [open]);

  // Sync typeName when defaultType changes (e.g., opening from different type pages)
  useEffect(() => {
    if (defaultType) {
      setTypeName(defaultType);
    }
  }, [defaultType]);

  const resetForm = () => {
    setTypeName(defaultType || "snippet");
    setTitle("");
    setDescription("");
    setContent("");
    setUrl("");
    setLanguage("");
    setTagsInput("");
    setFileData(null);
    setSelectedCollectionIds([]);
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onOpenChange(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      // Validate file is required for file/image types
      if ((typeName === "file" || typeName === "image") && !fileData) {
        toast.error("Please upload a file");
        setIsLoading(false);
        return;
      }

      const input: CreateItemInput = {
        typeName,
        title,
        description: description || null,
        content: content || null,
        url: url || null,
        language: language || null,
        tags,
        collectionIds: selectedCollectionIds.length > 0 ? selectedCollectionIds : undefined,
        fileUrl: fileData?.fileUrl || null,
        fileName: fileData?.fileName || null,
        fileSize: fileData?.fileSize || null,
      };

      const result = await createItem(input);

      if (result.success) {
        toast.success("Item created successfully");
        resetForm();
        onOpenChange(false);
        router.refresh();
      } else {
        if (result.fieldErrors) {
          const firstError = Object.values(result.fieldErrors)[0]?.[0];
          toast.error(firstError || result.error || "Failed to create item");
        } else {
          toast.error(result.error || "Failed to create item");
        }
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const showContentField = ["snippet", "prompt", "command", "note"].includes(typeName);
  const showLanguageField = ["snippet", "command"].includes(typeName);
  const showUrlField = typeName === "link";
  const showFileUpload = typeName === "file" || typeName === "image";

  const selectedType = ITEM_TYPES.find((t) => t.value === typeName);
  const IconComponent = selectedType ? getItemTypeIcon(selectedType.icon) : null;
  const iconColor = ITEM_TYPE_COLORS[typeName];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {IconComponent && (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: `${iconColor}20` }}
              >
                <IconComponent className="h-4 w-4" style={{ color: iconColor }} />
              </div>
            )}
            New Item
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={typeName} onValueChange={(v) => setTypeName(v as ItemTypeName)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map((type) => {
                  const Icon = getItemTypeIcon(type.icon);
                  const color = ITEM_TYPE_COLORS[type.value];
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color }} />
                        {type.label}
                        {type.isPro && (
                          <Badge variant="secondary" className="ml-1 px-1 py-0 text-[10px]">
                            PRO
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
              disabled={isLoading}
            />
          </div>

          {showLanguageField && (
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

          {showContentField && (
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              {showLanguageField ? (
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

          {showUrlField && (
            <div className="space-y-2">
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
                disabled={isLoading}
              />
            </div>
          )}

          {showFileUpload && (
            <div className="space-y-2">
              <Label>{typeName === "image" ? "Image" : "File"} *</Label>
              <FileUpload
                itemType={typeName as "file" | "image"}
                onUploadComplete={setFileData}
                onUploadError={(error) => toast.error(error)}
                disabled={isLoading}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Separate tags with commas"
              disabled={isLoading}
            />
          </div>

          {collections.length > 0 && (
            <div className="space-y-2">
              <Label>Collections</Label>
              <CollectionPicker
                collections={collections}
                selectedIds={selectedCollectionIds}
                onChange={setSelectedCollectionIds}
                disabled={isLoading}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
