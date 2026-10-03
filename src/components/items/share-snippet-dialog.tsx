"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Check,
  Code,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  Loader2,
  Share2,
  Terminal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createItem } from "@/actions/items";
import { LANGUAGES } from "@/lib/constants/editor";
import { ITEM_TYPE_COLORS } from "@/lib/constants/item-types";
import { defaultShareTitle, guessLanguage, type ShareKind } from "@/lib/languages";
import { imageFilename } from "@/lib/og/filename";
import { publicShortOgPath, publicShortPath, publicShortPngPath } from "@/lib/public/paths";
import { useClipboard } from "@/hooks/use-clipboard";
import { useCopyImage } from "@/hooks/use-copy-image";
import { useOrigin } from "@/hooks/use-origin";

interface ShareSnippetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const KINDS: { value: ShareKind; label: string; icon: typeof Code }[] = [
  { value: "snippet", label: "Code", icon: Code },
  { value: "command", label: "Command", icon: Terminal },
];

export default function ShareSnippetDialog({ open, onOpenChange }: ShareSnippetDialogProps) {
  const router = useRouter();
  const origin = useOrigin();
  const { copied, copy } = useClipboard();
  const { copyImage } = useCopyImage();
  const [kind, setKind] = useState<ShareKind>("snippet");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [chosenLanguage, setChosenLanguage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [created, setCreated] = useState<{ shortId: string; title: string } | null>(null);

  // The select follows the guess until the user picks a language themselves.
  const guessed = useMemo(() => guessLanguage(content), [content]);
  const language = kind === "snippet" ? (chosenLanguage ?? guessed ?? "plaintext") : null;
  const placeholderTitle = defaultShareTitle(kind, language);
  const canSubmit = content.trim().length > 0 && !isLoading;

  // The provider remounts this dialog on every opening, so closing needs no reset here.
  const handleOpenChange = (next: boolean) => {
    if (isLoading) return;
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);

    try {
      const result = await createItem({
        typeName: kind,
        title: title.trim() || placeholderTitle,
        description: null,
        content,
        url: null,
        language: language && language !== "plaintext" ? language : null,
        tags: [],
        fileUrl: null,
        fileName: null,
        fileSize: null,
        visibility: "UNLISTED",
      });

      if (result.success && result.data) {
        const url = `${origin}${publicShortPath(result.data.shortId)}`;
        setLink(url);
        setCreated({ shortId: result.data.shortId, title: result.data.title });
        await copy(url, "Link copied");
        router.refresh();
      } else {
        const firstError = result.fieldErrors
          ? Object.values(result.fieldErrors)[0]?.[0]
          : undefined;
        toast.error(firstError || result.error || "Failed to create link");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share a snippet
          </DialogTitle>
          <DialogDescription>
            Paste code, get a link. It is saved to your stash as an unlisted item.
          </DialogDescription>
        </DialogHeader>

        {link ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="share-link">Your link</Label>
              <div className="flex gap-2">
                <Input
                  id="share-link"
                  readOnly
                  value={link}
                  className="font-mono text-sm"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => copy(link, "Link copied")}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  Copy
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Anyone with the link can view it. Change that any time from the item.
              </p>
            </div>
            {created && (
              <div className="space-y-2">
                <div className="overflow-hidden rounded-md border border-border">
                  <Image
                    unoptimized
                    src={publicShortOgPath(created.shortId)}
                    alt="Link preview card"
                    width={1200}
                    height={630}
                    className="h-auto w-full"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  This is what Slack, X, and Discord show for the link.
                </p>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              {created && (
                <>
                  <Button type="button" variant="outline" asChild>
                    <a href={publicShortPngPath(created.shortId)} download={imageFilename(created.title)}>
                      <Download className="h-4 w-4" />
                      Download image
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copyImage(publicShortPngPath(created.shortId))}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Copy image
                  </Button>
                </>
              )}
              <Button type="button" variant="outline" asChild>
                <a href={link} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open
                </a>
              </Button>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              {KINDS.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={kind === value ? "default" : "outline"}
                  aria-pressed={kind === value}
                  onClick={() => setKind(value)}
                  disabled={isLoading}
                >
                  <Icon
                    className="h-4 w-4"
                    style={kind === value ? undefined : { color: ITEM_TYPE_COLORS[value] }}
                  />
                  {label}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="share-content">{kind === "command" ? "Command" : "Code"}</Label>
              <Textarea
                id="share-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={kind === "command" ? "Paste your command here" : "Paste your code here"}
                rows={12}
                autoFocus
                spellCheck={false}
                disabled={isLoading}
                className="min-h-[260px] font-mono text-sm"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {kind === "snippet" && (
                <div className="space-y-2">
                  <Label htmlFor="share-language">Language</Label>
                  <Select value={language ?? "plaintext"} onValueChange={setChosenLanguage} disabled={isLoading}>
                    <SelectTrigger id="share-language">
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
              <div className="space-y-2">
                <Label htmlFor="share-title">Title</Label>
                <Input
                  id="share-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={placeholderTitle}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Create link
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
