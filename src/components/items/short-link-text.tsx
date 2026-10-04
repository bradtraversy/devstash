"use client";

import { useOrigin } from "@/hooks/use-origin";
import { readableShortLink } from "@/lib/public/paths";

/** The readable share link; its own component so only link rows read the page origin. */
export default function ShortLinkText({ shortId, className }: { shortId: string; className?: string }) {
  const origin = useOrigin();
  return <span className={className}>{readableShortLink(origin, shortId)}</span>;
}
