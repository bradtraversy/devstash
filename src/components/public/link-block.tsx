import { ExternalLink } from "lucide-react";

interface LinkBlockProps {
  title: string;
  url: string;
}

// Items written before URL validation existed can carry other schemes; those render as text, not a link.
const HTTP_URL = /^https?:\/\//i;

export default function LinkBlock({ title, url }: LinkBlockProps) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <span className="block font-medium text-foreground">{title}</span>
        <span className="block truncate font-mono text-sm text-muted-foreground">{url}</span>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
    </>
  );

  if (!HTTP_URL.test(url)) {
    return <div className="flex items-center gap-3 p-4">{body}</div>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/40"
    >
      {body}
    </a>
  );
}
