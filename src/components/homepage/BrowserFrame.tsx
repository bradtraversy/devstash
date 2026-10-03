import { BookmarkPlus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DISPLAY_ORIGIN } from "./samples";

interface BrowserFrameProps {
  path: string;
  className?: string;
  children: React.ReactNode;
}

/** A browser window around an example page, with the page's address in the bar. */
export default function BrowserFrame({ path, className = "", children }: BrowserFrameProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-[#1e1e2e] bg-background shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] ${className}`}
    >
      <div className="flex items-center gap-3 border-b border-[#1e1e2e] bg-[#12121a] px-4 py-2.5">
        <div className="flex shrink-0 gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[#2a2a3a]" />
          <span className="size-2.5 rounded-full bg-[#2a2a3a]" />
          <span className="size-2.5 rounded-full bg-[#2a2a3a]" />
        </div>
        <p className="min-w-0 flex-1 truncate rounded-md bg-[#0a0a0f] px-3 py-1 font-mono text-xs text-[#8888a4]">
          {DISPLAY_ORIGIN}
          <span className="text-[#e4e4ef]">{path}</span>
        </p>
      </div>
      {children}
    </div>
  );
}

/** The public pages' Save button as markup only; the sample targets do not exist. */
export function StaticSaveButton({ compact = false }: { compact?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`${buttonVariants({ variant: "outline", size: "sm" })} pointer-events-none ${compact ? "h-7" : ""}`}
    >
      <BookmarkPlus className="h-4 w-4" />
      {compact ? "Save" : "Save to your stash"}
    </span>
  );
}
