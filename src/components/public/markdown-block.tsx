import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Hash } from "lucide-react";
import { fenceCopyText, fenceFromCodeProps } from "@/lib/public/fence";
import { nodeText, rehypeHeadingIds } from "@/lib/public/headings";
import CodeBlock from "./code-block";
import CodeFence from "./code-fence";

interface MarkdownBlockProps {
  content: string;
  /** Keeps heading ids unique when several blocks share a page, e.g. `b3-`. */
  headingIdPrefix?: string;
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
    <CodeFence language={fence.language} copyText={fenceCopyText(fence)}>
      <CodeBlock code={fence.code} language={fence.language} />
    </CodeFence>
  );
}

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

function anchoredHeading(Tag: HeadingTag) {
  return function AnchoredHeading({
    id,
    className,
    children,
  }: {
    id?: string;
    className?: string;
    children?: ReactNode;
  }) {
    // Headings that arrive with a class, like the hidden footnotes label, keep their markup and get no link.
    if (!id || className) {
      return (
        <Tag id={id} className={className}>
          {children}
        </Tag>
      );
    }
    // ":" never appears in a slug, so the label id cannot collide with another heading's id.
    const labelId = `${id}:text`;
    return (
      <Tag id={id} aria-labelledby={labelId} className="group/heading scroll-mt-6">
        <span id={labelId}>{children}</span>
        <a
          href={`#${id}`}
          className="ml-2 inline-block align-middle text-muted-foreground no-underline opacity-0 transition-opacity hover:text-foreground focus:opacity-100 group-hover/heading:opacity-100"
          aria-label={`Link to ${nodeText(children)}`}
          title="Link to this section"
        >
          <Hash className="h-4 w-4" />
        </a>
      </Tag>
    );
  };
}

const COMPONENTS: Components = {
  pre: FencedPre,
  h1: anchoredHeading("h1"),
  h2: anchoredHeading("h2"),
  h3: anchoredHeading("h3"),
  h4: anchoredHeading("h4"),
  h5: anchoredHeading("h5"),
  h6: anchoredHeading("h6"),
};

export default function MarkdownBlock({ content, headingIdPrefix = "" }: MarkdownBlockProps) {
  return (
    <div className="prose prose-invert max-w-none p-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHeadingIds, headingIdPrefix]]}
        components={COMPONENTS}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
