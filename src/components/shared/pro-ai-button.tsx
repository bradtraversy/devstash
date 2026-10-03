"use client";

import { Sparkles, Crown, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { hasAiAccess } from "@/lib/plans";

interface ProAiButtonProps {
  isPro: boolean;
  label: string;
  loadingLabel: string;
  isLoading: boolean;
  onClick: () => void;
}

export default function ProAiButton({
  isPro,
  label,
  loadingLabel,
  isLoading,
  onClick,
}: ProAiButtonProps) {
  if (!hasAiAccess(isPro)) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground/50 cursor-not-allowed">
            <Crown className="h-3.5 w-3.5" />
            <span>{label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>AI features require Pro subscription</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      title={label}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          <Sparkles className="h-3.5 w-3.5" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
