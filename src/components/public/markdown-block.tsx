import { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fenceFromCodeProps } from "@/lib/public/fence";
import CodeBlock from "./code-block";

interface MarkdownBlockProps {
  content: string;
}

type CodeProps = { className?: string; children?: ReactNode };

// react-markdown renders a fence as <pre><code class="language-x">; the pre is replaced by a Shiki
// block so fenced code in a note matches a snippet block. Inline code keeps the default element.
function FencedPre({ children }: { children?: ReactNode }) {
  if (!isValidElement<CodeProps>(children)) {
    return <pre>{children}</pre>;
  }
  const fence = fenceFromCodeProps(children.props);
  return (
    <div className="not-prose my-4 overflow-hidden rounded-md border border-border">
      <CodeBlock code={fence.code} language={fence.language} />
    </div>
  );
}

export default function MarkdownBlock({ content }: MarkdownBlockProps) {
  return (
    <div className="prose prose-invert max-w-none p-4">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: FencedPre }}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
