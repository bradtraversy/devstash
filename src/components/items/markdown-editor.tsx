"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check } from "lucide-react";
import { useClipboard } from "@/hooks/use-clipboard";
import EditorHeader from "./editor-header";
import MarkdownFence from "./markdown-fence";
import { optimizePrompt } from "@/actions/ai";
import { toast } from "sonner";
import ProAiButton from "@/components/shared/pro-ai-button";
import { hasAiAccess } from "@/lib/plans";

interface MarkdownEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  // AI Optimize props (only for drawer read mode on prompts)
  showOptimize?: boolean;
  isPro?: boolean;
  title?: string;
  onAcceptOptimized?: (optimized: string) => void;
}

export default function MarkdownEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = "Write your content here...",
  showOptimize = false,
  isPro = false,
  title = "",
  onAcceptOptimized,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<
    "write" | "preview" | "original" | "optimized"
  >(readOnly ? "preview" : "write");
  const { copied, copy } = useClipboard();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Optimize state
  const [optimizedContent, setOptimizedContent] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const handleCopy = () => copy(activeTab === "optimized" && optimizedContent ? optimizedContent : value);

  // Auto-resize textarea based on content (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (textareaRef.current && activeTab === "write") {
        textareaRef.current.style.height = "auto";
        const scrollHeight = textareaRef.current.scrollHeight;
        const minHeight = 200;
        const maxHeight = 400;
        textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [value, activeTab]);

  const handleOptimize = async () => {
    if (!hasAiAccess(isPro)) return;
    if (isOptimizing) return;

    setIsOptimizing(true);
    try {
      const result = await optimizePrompt({
        title,
        content: value,
      });

      if (result.success && result.data) {
        setOptimizedContent(result.data);
        setActiveTab("optimized");
      } else {
        toast.error(result.error || "Failed to optimize prompt");
      }
    } catch {
      toast.error("Failed to optimize prompt. Please try again.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleAccept = () => {
    if (!optimizedContent || !onAcceptOptimized) return;
    onAcceptOptimized(optimizedContent);
  };

  // Calculate height based on content lines (for preview)
  const lineCount = value.split("\n").length;
  const lineHeight = 24;
  const padding = 32;
  // Each fenced block gains a header and padding in the preview.
  const fenceCount = Math.floor((value.match(/^[ \t]*(```|~~~)/gm)?.length ?? 0) / 2);
  const fenceExtra = 48;
  const minHeight = 200;
  const maxHeight = 400;
  const calculatedHeight = Math.min(
    Math.max(lineCount * lineHeight + fenceCount * fenceExtra + padding, minHeight),
    maxHeight
  );

  // Determine tabs based on mode
  const showOptimizedTabs = showOptimize && optimizedContent !== null;

  let tabs;
  if (showOptimizedTabs) {
    tabs = [
      { id: "original", label: "Original" },
      { id: "optimized", label: "Optimized" },
    ];
  } else if (!readOnly) {
    tabs = [
      { id: "write", label: "Write" },
      { id: "preview", label: "Preview" },
    ];
  } else {
    tabs = undefined;
  }

  // Build extra buttons for the header
  const extraButtons = showOptimize ? (
    <div className="flex items-center gap-2">
      {hasAiAccess(isPro) && activeTab === "optimized" && optimizedContent && onAcceptOptimized && (
        <button
          type="button"
          onClick={handleAccept}
          className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          title="Use optimized prompt"
        >
          <Check className="h-3.5 w-3.5" />
          <span>Use This</span>
        </button>
      )}
      <ProAiButton
        isPro={isPro}
        label="Optimize"
        loadingLabel="Optimizing..."
        isLoading={isOptimizing}
        onClick={handleOptimize}
      />
    </div>
  ) : null;

  // Determine which content to show in the preview/readonly area
  const showingOptimized = activeTab === "optimized" && optimizedContent;
  const displayContent = showingOptimized ? optimizedContent : value;

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-[#1e1e1e]">
      <EditorHeader
        label="Markdown"
        copied={copied}
        onCopy={handleCopy}
        copyTitle="Copy content"
        tabs={tabs}
        activeTab={showOptimizedTabs ? activeTab : activeTab}
        onTabChange={(id) =>
          setActiveTab(id as "write" | "preview" | "original" | "optimized")
        }
        showDots={readOnly && !showOptimizedTabs}
        extraButtons={extraButtons}
      />

      {/* Content area */}
      {activeTab === "write" && !readOnly ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#1e1e1e] text-foreground font-mono text-base p-4 resize-none focus:outline-none placeholder:text-muted-foreground/50 editor-scrollbar overflow-y-auto"
          style={{ minHeight: `${minHeight}px`, maxHeight: `${maxHeight}px` }}
        />
      ) : (
        <div
          className="prose prose-invert max-w-none p-4 overflow-y-auto editor-scrollbar"
          style={{
            minHeight: `${minHeight}px`,
            maxHeight: `${maxHeight}px`,
            height: displayContent
              ? `${calculatedHeight}px`
              : `${minHeight}px`,
          }}
        >
          {displayContent ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: MarkdownFence }}>
              {displayContent}
            </ReactMarkdown>
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
