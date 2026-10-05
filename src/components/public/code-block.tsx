import { highlightCode } from "@/lib/public/highlight";
import { SHIKI_HTML_CLASS } from "./code-fence";

interface CodeBlockProps {
  code: string;
  language: string | null;
}

export default async function CodeBlock({ code, language }: CodeBlockProps) {
  const html = await highlightCode(code, language);

  return (
    <div
      className={SHIKI_HTML_CLASS}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
