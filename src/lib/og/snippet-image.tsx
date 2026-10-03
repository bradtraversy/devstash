import type { HighlightedToken } from '@/lib/public/highlight';
import { CodeLines, Frame, LINE_HEIGHT, MUTED, Mono, kindLabel } from './cards';
import { IMAGE_MAX_WIDTH, IMAGE_MIN_WIDTH } from './constants';
import { columnWidth } from './lines';
import type { RenderSize } from './render';

/** What the full image needs from an item, built by the public and owner routes. */
export interface SnippetImageItem {
  title: string;
  language: string | null;
  itemType: { name: string; color: string };
  shortId: string;
  /** The owner's handle, or null for an owner who has never shared. */
  handle: string | null;
  /** A shared item's footer carries its short link; a private one must not. */
  shared: boolean;
}

// Geist Mono advances 0.6em per character, so 13.2px at the panel's 22px.
const MONO_ADVANCE = 13.2;
// Outer padding, panel padding, and the panel border on both sides.
const FRAME_WIDTH = 48 * 2 + 24 * 2 + 2;
// Everything above and below the lines: padding, title row, gaps, panel padding and border, footer.
const FRAME_HEIGHT = 48 + 56 + 20 + 24 + 2 + 24 + 16 + 36 + 48;

/** Width from the longest line within the bounds, height from the row count; integers for the renderer. */
export function snippetImageSize(lines: HighlightedToken[][], hidden: number): RenderSize {
  const longest = lines.reduce(
    (max, line) => Math.max(max, line.reduce((width, token) => width + columnWidth(token.content), 0)),
    0
  );
  const rows = Math.max(1, lines.length + (hidden > 0 ? 1 : 0));

  return {
    width: Math.min(IMAGE_MAX_WIDTH, Math.max(IMAGE_MIN_WIDTH, Math.ceil(longest * MONO_ADVANCE + FRAME_WIDTH))),
    height: Math.ceil(FRAME_HEIGHT + rows * LINE_HEIGHT),
  };
}

export interface SnippetImageProps {
  item: SnippetImageItem;
  lines: HighlightedToken[][];
  hidden: number;
}

/** The whole snippet in the card's look, sized by snippetImageSize. */
export function SnippetImage({ item, lines, hidden }: SnippetImageProps) {
  return (
    <Frame
      title={item.title}
      label={kindLabel(item)}
      footerLeft={item.handle ? `@${item.handle}` : 'DevStash'}
      footerRight={item.shared ? `devstash.io/s/${item.shortId}` : 'devstash.io'}
      dotColor={item.itemType.color}
      clip={false}
    >
      {lines.length > 0 ? <CodeLines lines={lines} /> : <Mono color={MUTED}>(empty)</Mono>}
      {hidden > 0 && <Mono color={MUTED}>{`+ ${hidden} more lines`}</Mono>}
    </Frame>
  );
}
