"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import DialogFormFooter from "@/components/shared/dialog-form-footer";
import { toast } from "sonner";
import { updateCollection, type UpdateCollectionInput } from "@/actions/collections";
import { MAX_SLUG_LENGTH } from "@/lib/slugs";

interface EditableCollection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface EditCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: EditableCollection;
}

export default function EditCollectionDialog({
  open,
  onOpenChange,
  collection,
}: EditCollectionDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
              <Pencil className="h-4 w-4 text-primary" />
            </div>
            Edit Collection
          </DialogTitle>
        </DialogHeader>

        <EditCollectionForm
          collection={collection}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          onCancel={handleClose}
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface EditCollectionFormProps {
  collection: EditableCollection;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onCancel: () => void;
  onSaved: () => void;
}

// Mounted only while the dialog is open, so the fields start from the collection on every open.
function EditCollectionForm({
  collection,
  isLoading,
  setIsLoading,
  onCancel,
  onSaved,
}: EditCollectionFormProps) {
  const router = useRouter();
  const [name, setName] = useState(collection.name);
  const [slug, setSlug] = useState(collection.slug);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [description, setDescription] = useState(collection.description || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const input: UpdateCollectionInput = {
        id: collection.id,
        name,
        slug,
        description: description || null,
      };

      const result = await updateCollection(input);

      if (result.success) {
        toast.success("Collection updated successfully");
        onSaved();
        router.refresh();
      } else {
        if (result.fieldErrors?.slug) {
          setSlugError(result.fieldErrors.slug[0]);
        } else if (result.fieldErrors) {
          const firstError = Object.values(result.fieldErrors)[0]?.[0];
          toast.error(firstError || result.error || "Failed to update collection");
        } else {
          toast.error(result.error || "Failed to update collection");
        }
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter collection name"
          required
          disabled={isLoading}
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value.toLowerCase());
            setSlugError(null);
          }}
          placeholder="collection-slug"
          required
          disabled={isLoading}
          maxLength={MAX_SLUG_LENGTH}
          className="font-mono"
          aria-invalid={slugError ? true : undefined}
        />
        {slugError ? (
          <p className="text-sm text-destructive">{slugError}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Lowercase letters, numbers, and hyphens. Changing it redirects the old URL.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter collection description"
          disabled={isLoading}
          rows={3}
          maxLength={500}
        />
      </div>

      <DialogFormFooter isLoading={isLoading} onCancel={onCancel} submitLabel="Save" />
    </form>
  );
}
