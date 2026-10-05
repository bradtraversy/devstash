"use client";

import { isValidElement, useEffect, useState, type ReactNode } from "react";
import { fenceCopyText, fenceFromCodeProps } from "@/lib/public/fence";
import CodeFence, { SHIKI_HTML_CLASS } from "@/components/public/code-fence";

type CodeProps = { className?: string; children?: ReactNode };

interface Highlighted {
  code: string;
  language: string | null;
  html: string;
}

function HighlightedCode({ code, language }: { code: string; language: string | null }) {
  const [highlighted, setHighlighted] = useState<Highlighted | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Shiki loads when the first fence mounts; the plain code stays if it fails.
    import("@/lib/public/highlight")
      .then(({ highlightCode }) => highlightCode(code, language))
      .then((html) => {
        if (!cancelled) setHighlighted({ code, language, html });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [code, language]);

  if (highlighted && highlighted.code === code && highlighted.language === language) {
    return <div className={SHIKI_HTML_CLASS} dangerouslySetInnerHTML={{ __html: highlighted.html }} />;
  }

  return (
    <pre className="m-0 overflow-x-auto bg-[#1e1e1e] p-4 text-sm leading-relaxed text-[#d4d4d4]">
      <code className="font-mono">{code}</code>
    </pre>
  );
}

/** The drawer's `pre` for react-markdown: the public fence header with client-side highlighting. */
export default function MarkdownFence({ children }: { children?: ReactNode }) {
  if (!isValidElement<CodeProps>(children)) {
    return <pre>{children}</pre>;
  }
  const fence = fenceFromCodeProps(children.props);
  return (
    <CodeFence language={fence.language} copyText={fenceCopyText(fence)}>
      <HighlightedCode code={fence.code} language={fence.language} />
    </CodeFence>
  );
}
