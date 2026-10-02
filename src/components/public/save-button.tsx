"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookmarkPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveSharedCollection, saveSharedItem } from "@/actions/save";
import { UNAUTHORIZED_ERROR } from "@/lib/constants/action-errors";

export type SaveTarget =
  | { kind: "item"; shortId: string }
  | { kind: "collection"; handle: string; slug: string };

interface SaveButtonProps {
  target: SaveTarget;
  /** Icon plus `Save`, for the collection header's action group. */
  compact?: boolean;
}

const LABEL = "Save to your stash";

// Set on the return URL from sign-in so the save the viewer started finishes without a second click.
const SAVE_QUERY = "save";

interface Outcome {
  message: string;
  href: string;
}

async function runSave(target: SaveTarget): Promise<{ error: string } | Outcome> {
  if (target.kind === "item") {
    const result = await saveSharedItem({ shortId: target.shortId });
    if (!result.success || !result.data) {
      return { error: result.error ?? "Failed to save item" };
    }
    return { message: "Saved to your stash", href: `/items/${result.data.typeName}s` };
  }

  const result = await saveSharedCollection({ handle: target.handle, slug: target.slug });
  if (!result.success || !result.data) {
    return { error: result.error ?? "Failed to save collection" };
  }
  const { collectionId, copied, skipped } = result.data;
  const noun = copied === 1 ? "item" : "items";
  const files = skipped > 0 ? `, ${skipped} ${skipped === 1 ? "file" : "files"} skipped` : "";
  return {
    message: `Saved ${copied} ${noun} to your stash${files}`,
    href: `/collections/${collectionId}`,
  };
}

export default function SaveButton({ target, compact = false }: SaveButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const resumed = useRef(false);

  // A resumed save that finds no session stays quiet: the viewer came back without signing in.
  const save = useCallback((resume: boolean) => {
    startTransition(async () => {
      const outcome = await runSave(target);

      if ("error" in outcome) {
        if (outcome.error === UNAUTHORIZED_ERROR) {
          if (resume) return;
          const returnTo = `${pathname}?${SAVE_QUERY}=1`;
          router.push(`/sign-in?callbackUrl=${encodeURIComponent(returnTo)}`);
          return;
        }
        toast.error(outcome.error);
        return;
      }

      toast.success(outcome.message, {
        action: { label: "Open", onClick: () => router.push(outcome.href) },
      });
    });
  }, [pathname, router, target]);

  useEffect(() => {
    if (resumed.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get(SAVE_QUERY) !== "1") return;

    resumed.current = true;
    params.delete(SAVE_QUERY);
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
    );
    save(true);
  }, [save]);

  return (
    <Button
      variant="outline"
      size="sm"
      className={compact ? "h-7" : undefined}
      onClick={() => save(false)}
      disabled={pending}
      aria-label={LABEL}
      title={LABEL}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookmarkPlus className="h-4 w-4" />}
      {compact ? <span className="hidden sm:inline">Save</span> : LABEL}
    </Button>
  );
}
