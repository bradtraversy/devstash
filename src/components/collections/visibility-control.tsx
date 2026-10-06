"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Globe, Link2, Lock, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { setCollectionVisibility } from "@/actions/collections";
import { useClipboard } from "@/hooks/use-clipboard";
import { useOrigin } from "@/hooks/use-origin";
import {
  VISIBILITY_OPTIONS,
  collectionShareNotice,
  getVisibilityOption,
  type CollectionVisibility,
} from "@/lib/constants/visibility";

const VISIBILITY_ICONS = {
  PRIVATE: Lock,
  UNLISTED: Link2,
  PUBLIC: Globe,
} as const;

interface VisibilityControlProps {
  collection: {
    id: string;
    slug: string;
    shortId: string;
    visibility: CollectionVisibility;
    itemCount: number;
  };
  handle: string | null;
  privateItemCount: number;
}

export default function VisibilityControl({ collection, handle, privateItemCount }: VisibilityControlProps) {
  const router = useRouter();
  const origin = useOrigin();
  const { copied, copy } = useClipboard();
  const [visibility, setVisibility] = useState<CollectionVisibility>(collection.visibility);
  const [ownerHandle, setOwnerHandle] = useState(handle);
  const [isSaving, setIsSaving] = useState(false);

  const option = getVisibilityOption(visibility);
  const Icon = VISIBILITY_ICONS[visibility];
  const isShared = visibility !== "PRIVATE";
  const readableUrl = origin && ownerHandle ? `${origin}/${ownerHandle}/${collection.slug}` : null;
  const shortLink = `${origin}/s/${collection.shortId}`;
  const notice = collectionShareNotice(collection.itemCount, privateItemCount, visibility);

  const handleChange = async (value: string) => {
    const next = value as CollectionVisibility;
    const previous = visibility;
    setVisibility(next);
    setIsSaving(true);

    const result = await setCollectionVisibility({ id: collection.id, visibility: next });
    setIsSaving(false);

    if (result.success && result.data) {
      setOwnerHandle(result.data.handle);
      toast.success(`Collection is now ${getVisibilityOption(next).label.toLowerCase()}`);
      router.refresh();
    } else {
      setVisibility(previous);
      toast.error(result.error || "Failed to update visibility");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <Label htmlFor="visibility">Visibility</Label>
            <p className="text-sm text-muted-foreground">{option.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={visibility} onValueChange={handleChange} disabled={isSaving}>
            <SelectTrigger id="visibility" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISIBILITY_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isShared && (
            <Button variant="outline" size="sm" onClick={() => copy(shortLink)}>
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Link2 className="h-4 w-4" />}
              Copy link
            </Button>
          )}
        </div>
      </div>
      {notice && (
        <p className="flex items-start gap-2 text-sm text-amber-400">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {notice}
        </p>
      )}
      {isShared && readableUrl && (
        <a
          href={readableUrl}
          target="_blank"
          rel="noreferrer"
          className="block truncate font-mono text-xs text-muted-foreground hover:text-foreground hover:underline"
          title="Open the public page"
        >
          {readableUrl}
        </a>
      )}
    </div>
  );
}
