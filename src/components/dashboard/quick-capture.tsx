"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Code,
  Copy,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Share2,
  Sparkles,
  StickyNote,
  Terminal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createItem } from "@/actions/items";
import { useItemDrawer } from "@/components/items/item-drawer-provider";
import { useClipboard } from "@/hooks/use-clipboard";
import { useOrigin } from "@/hooks/use-origin";
import { copyWhenReady } from "@/lib/clipboard";
import { ITEM_TYPE_COLORS, isTextType } from "@/lib/constants/item-types";
import { languageLabel } from "@/lib/languages";
import { canBeLink, detectPasteType, pasteAs, type PasteGuess, type PasteType } from "@/lib/paste";
import { publicShortPath, readableShortLink } from "@/lib/public/paths";

const SAMPLES = [
  {
    label: "A snippet",
    Icon: Code,
    text: "export const sleep = (ms: number) =>\n  new Promise((resolve) => setTimeout(resolve, ms));\n",
  },
  { label: "A command", Icon: Terminal, text: "npx prisma migrate dev --name add_slugs" },
  {
    label: "A prompt",
    Icon: Sparkles,
    text: "Review this diff like a senior engineer. Point out bugs and edge cases first, then anything that changes behavior.",
  },
  { label: "A link", Icon: LinkIcon, text: "https://nextjs.org/docs/app/api-reference/functions/revalidatePath" },
];

interface SharedResult {
  id: string;
  shortId: string;
  typeName: string;
}

const TYPE_OPTIONS: { value: PasteType; label: string; Icon: typeof Code }[] = [
  { value: "snippet", label: "Snippet", Icon: Code },
  { value: "command", label: "Command", Icon: Terminal },
  { value: "note", label: "Note", Icon: StickyNote },
  { value: "prompt", label: "Prompt", Icon: Sparkles },
  { value: "link", label: "Link", Icon: LinkIcon },
];

function describeGuess(guess: PasteGuess, chosen: boolean): string {
  const kind =
    guess.typeName === "snippet" && guess.language ? `${languageLabel(guess.language)} snippet` : guess.typeName;
  const lead = chosen ? `Saving as a ${kind}` : `Looks like a ${kind}`;
  return guess.typeName === "command" ? lead : `${lead}, titled “${guess.title}”`;
}

export default function QuickCapture({ showSamples = false }: { showSamples?: boolean }) {
  const router = useRouter();
  const origin = useOrigin();
  const { openDrawer } = useItemDrawer();
  const { copy } = useClipboard();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "share" | null>(null);
  const [shared, setShared] = useState<SharedResult | null>(null);
  // The detected type until the user picks one; a picked Link falls back once the text stops being a URL.
  const [chosenType, setChosenType] = useState<PasteType | null>(null);
  const detected = useMemo(() => detectPasteType(text), [text]);
  const linkable = useMemo(() => canBeLink(text), [text]);
  const typeName = chosenType && (chosenType !== "link" || linkable) ? chosenType : detected;
  const guess = useMemo(() => (typeName ? pasteAs(text, typeName) : null), [text, typeName]);

  const save = async (share: boolean) => {
    if (busy) return;
    if (!guess) {
      setError("Paste something first");
      textareaRef.current?.focus();
      return;
    }

    setBusy(share ? "share" : "save");
    const request = createItem({
      typeName: guess.typeName,
      title: guess.title,
      description: null,
      content: guess.content,
      url: guess.url,
      language: guess.language,
      tags: [],
      fileUrl: null,
      fileName: null,
      fileSize: null,
      visibility: share ? "UNLISTED" : "PRIVATE",
    }).catch(() => ({ success: false as const, error: "An unexpected error occurred", fieldErrors: undefined, data: undefined }));

    // Started inside the click so Safari allows the copy once the item exists.
    const copied = share
      ? copyWhenReady(
          request.then((result) => {
            if (!result.success || !result.data) throw new Error("not saved");
            return `${origin}${publicShortPath(result.data.shortId)}`;
          })
        )
      : null;
    copied?.catch(() => {});

    const result = await request;
    setBusy(null);

    if (!result.success || !result.data) {
      const fieldError = result.fieldErrors ? Object.values(result.fieldErrors)[0]?.[0] : undefined;
      toast.error(fieldError || result.error || "Failed to save");
      return;
    }

    setText("");
    setError(null);
    setChosenType(null);
    if (share) {
      setShared({ id: result.data.id, shortId: result.data.shortId, typeName: guess.typeName });
      try {
        await copied;
        toast.success("Saved and shared. Link copied.");
      } catch {
        toast.success("Saved and shared. Use Copy link to copy it.");
      }
    } else {
      setShared(null);
      toast.success("Saved to your stash");
    }
    router.refresh();
  };

  const link = shared ? `${origin}${publicShortPath(shared.shortId)}` : "";

  return (
    <div>
      <div className="rounded-xl border border-border bg-card transition-colors focus-within:border-blue-500/60">
        <label htmlFor="quick-capture" className="sr-only">
          Paste code, a command, a note, or a link
        </label>
        <textarea
          id="quick-capture"
          ref={textareaRef}
          value={text}
          readOnly={busy !== null}
          aria-describedby="quick-capture-hint"
          aria-invalid={error ? true : undefined}
          spellCheck={false}
          placeholder="Paste code, a command, a note, or a link"
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
            if (!e.target.value.trim()) setChosenType(null);
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              save(e.shiftKey);
            }
          }}
          className="block max-h-80 min-h-24 w-full resize-y bg-transparent px-4 pb-2 pt-3.5 font-mono text-sm leading-relaxed outline-none placeholder:font-sans placeholder:text-muted-foreground"
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pb-3">
          {detected && (
            <div role="group" aria-label="Save as" className="flex flex-wrap items-center gap-1">
              {TYPE_OPTIONS.map(({ value, label, Icon }) => {
                const selected = typeName === value;
                const unavailable = value === "link" && !linkable;
                const color = ITEM_TYPE_COLORS[value];
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    aria-disabled={unavailable || undefined}
                    disabled={busy !== null}
                    title={unavailable ? "Paste one web address to save a link" : `Save as a ${value}`}
                    onClick={() => {
                      if (!unavailable) setChosenType(value);
                    }}
                    style={selected ? { backgroundColor: `${color}26`, color } : undefined}
                    className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 ${
                      selected ? "border-transparent font-medium" : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
          )}
          <div className="ml-auto flex w-full gap-2 sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => save(false)} disabled={busy !== null} className="flex-1 sm:flex-none">
              {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
            <Button
              size="sm"
              onClick={() => save(true)}
              disabled={busy !== null}
              className="flex-1 bg-blue-600 text-white hover:bg-blue-500 sm:flex-none"
            >
              {busy === "share" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              Save and share
            </Button>
          </div>
          <p
            id="quick-capture-hint"
            className={`basis-full truncate text-xs ${error ? "text-red-400" : "text-muted-foreground"}`}
          >
            {error ? (
              <span role="alert">{error}</span>
            ) : guess ? (
              describeGuess(guess, chosenType !== null && typeName === chosenType)
            ) : (
              "Snippets, commands, notes, prompts, and links. Private until you share it."
            )}
          </p>
        </div>
      </div>

      {shared && (
        <div role="status" className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2">
          <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 truncate font-mono text-sm text-blue-300 hover:underline"
          >
            {readableShortLink(origin, shared.shortId)}
          </a>
          <Button variant="outline" size="sm" onClick={() => copy(link, "Link copied")}>
            <Copy className="h-4 w-4" />
            Copy link
          </Button>
          {isTextType(shared.typeName) && (
            <Button asChild variant="outline" size="sm">
              <a href={`/api/items/${shared.id}/image`} target="_blank" rel="noreferrer">
                <ImageIcon className="h-4 w-4" />
                Image
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => openDrawer(shared.id)}>
            Details
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Dismiss" onClick={() => setShared(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {showSamples && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Try one:</span>
          {SAMPLES.map(({ label, Icon, text: sample }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setText(sample);
                setError(null);
                setChosenType(null);
                textareaRef.current?.focus();
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs transition-colors hover:border-muted-foreground/50 hover:text-foreground"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
