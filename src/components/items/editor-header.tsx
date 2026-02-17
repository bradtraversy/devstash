"use client";

import { Copy, Check } from "lucide-react";

interface Tab {
  id: string;
  label: string;
}

interface EditorHeaderProps {
  label: string;
  copied: boolean;
  onCopy: () => void;
  copyTitle?: string;
  // If tabs provided, show them instead of macOS dots
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  // Show macOS dots (default true when no tabs)
  showDots?: boolean;
  // Extra buttons to render before the copy button
  extraButtons?: React.ReactNode;
}

/**
 * Shared header component for code and markdown editors
 * Shows macOS-style dots (or tabs), label, and copy button
 */
export default function EditorHeader({
  label,
  copied,
  onCopy,
  copyTitle = "Copy",
  tabs,
  activeTab,
  onTabChange,
  showDots = true,
  extraButtons,
}: EditorHeaderProps) {
  const hasTabs = tabs && tabs.length > 0;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-border">
      {/* Left side: macOS dots or tabs */}
      <div className="flex items-center gap-2">
        {hasTabs ? (
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange?.(tab.id)}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  activeTab === tab.id
                    ? "bg-[#1e1e1e] text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : showDots ? (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
        ) : null}
      </div>

      {/* Right side: label, extra buttons, and copy button */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        {extraButtons}
        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          title={copyTitle}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" />
              <span className="text-green-500">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
