"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface MarkdownEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

export default function MarkdownEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = "Write your content here...",
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">(
    readOnly ? "preview" : "write"
  );
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [value]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current && activeTab === "write") {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const minHeight = 200;
      const maxHeight = 400;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
    }
  }, [value, activeTab]);

  // Calculate height based on content lines (for preview)
  const lineCount = value.split("\n").length;
  const lineHeight = 24;
  const padding = 32;
  const minHeight = 200;
  const maxHeight = 400;
  const calculatedHeight = Math.min(
    Math.max(lineCount * lineHeight + padding, minHeight),
    maxHeight
  );

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-[#1e1e1e]">
      {/* Header with tabs and copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-border">
        {/* Tabs or macOS dots */}
        <div className="flex items-center gap-2">
          {readOnly ? (
            // macOS window dots for readonly mode
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
          ) : (
            // Tabs for edit mode
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("write")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  activeTab === "write"
                    ? "bg-[#1e1e1e] text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  activeTab === "preview"
                    ? "bg-[#1e1e1e] text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Preview
              </button>
            </div>
          )}
        </div>

        {/* Label and copy button */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            Markdown
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Copy content"
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

      {/* Content area */}
      {activeTab === "write" && !readOnly ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#1e1e1e] text-foreground font-mono text-sm p-4 resize-none focus:outline-none placeholder:text-muted-foreground/50 editor-scrollbar overflow-y-auto"
          style={{ minHeight: `${minHeight}px`, maxHeight: `${maxHeight}px` }}
        />
      ) : (
        <div
          className="prose prose-invert prose-sm max-w-none p-4 overflow-y-auto editor-scrollbar"
          style={{ minHeight: `${minHeight}px`, maxHeight: `${maxHeight}px`, height: value ? `${calculatedHeight}px` : `${minHeight}px` }}
        >
          {value ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground/50 text-sm italic">
              Nothing to preview
            </p>
          )}
        </div>
      )}
    </div>
  );
}
