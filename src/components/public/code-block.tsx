import { highlightCode } from "@/lib/public/highlight";

interface CodeBlockProps {
  code: string;
  language: string | null;
}

export default async function CodeBlock({ code, language }: CodeBlockProps) {
  const html = await highlightCode(code, language);

  return (
    <div
      className="text-sm leading-relaxed [&_pre]:m-0 [&_pre]:overflow-x-auto [&_pre]:p-4 [&_code]:font-mono"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
