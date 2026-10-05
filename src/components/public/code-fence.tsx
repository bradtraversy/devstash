import type { ReactNode } from "react";
import { languageLabel } from "@/lib/languages";
import CopyButton from "./copy-button";

/** Classes for a Shiki HTML block, shared by the server and client renderers. */
export const SHIKI_HTML_CLASS =
  "text-sm leading-relaxed [&_pre]:m-0 [&_pre]:overflow-x-auto [&_pre]:p-4 [&_code]:font-mono";

interface CodeFenceProps {
  language: string | null;
  copyText: string;
  children: ReactNode;
}

export default function CodeFence({ language, copyText, children }: CodeFenceProps) {
  return (
    <div className="not-prose my-4 overflow-hidden rounded-md border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-3 py-1">
        <span className="font-mono text-xs text-muted-foreground">{languageLabel(language)}</span>
        <CopyButton text={copyText} />
      </div>
      {children}
    </div>
  );
}
