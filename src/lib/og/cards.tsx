import type { ReactNode } from 'react';
import type { PublicCollection, PublicItem, PublicSharedItem } from '@/lib/db/public';
import { languageLabel } from '@/lib/languages';
import type { HighlightedToken } from '@/lib/public/highlight';
import { formatFileSize } from '@/lib/r2';
import { OG_COLLECTION_ROWS } from './constants';

// The image renderer takes inline styles only; this module, snippet-image.tsx, and src/app/opengraph-image.tsx are the places they are allowed.

const BACKGROUND = 'linear-gradient(135deg, #0a0a0a 0%, #111827 100%)';
const FOREGROUND = '#fafafa';
export const MUTED = '#a1a1aa';
const PANEL = '#18181b';
const PANEL_BORDER = '#27272a';
const LINK = '#10b981';
const COLLECTION_COLOR = '#3b82f6';

const SANS = 'Geist';
const MONO = 'Geist Mono';
const TEXT_SIZE = 22;
export const LINE_HEIGHT = 33;
const ROW_HEIGHT = 36;

/** `JavaScript`, `Terminal`, `Note`: the label on the right of a card or row. */
export function kindLabel(item: { itemType: { name: string }; language: string | null }): string {
  switch (item.itemType.name) {
    case 'snippet':
      return languageLabel(item.language);
    case 'command':
      return 'Terminal';
    default:
      return item.itemType.name.charAt(0).toUpperCase() + item.itemType.name.slice(1);
  }
}

export function Mono({ color, children }: { color: string; children: string }) {
  return (
    <div style={{ display: 'flex', fontSize: TEXT_SIZE, lineHeight: `${LINE_HEIGHT}px`, color, whiteSpace: 'pre' }}>
      {children}
    </div>
  );
}

interface FrameProps {
  title: string;
  label: string;
  footerLeft: string;
  footerRight?: string;
  dotColor: string;
  /** Clip the panel to its box; off for an image sized to fit, where satori's clip costs grow with every line. */
  clip?: boolean;
  children: ReactNode;
}

/** The shared shell: title row, the dark panel, and the footer line. */
export function Frame({
  title,
  label,
  footerLeft,
  footerRight = 'devstash.io',
  dotColor,
  clip = true,
  children,
}: FrameProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: 48,
        background: BACKGROUND,
        color: FOREGROUND,
        fontFamily: MONO,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, height: 56 }}>
        <div style={{ width: 16, height: 16, borderRadius: 8, background: dotColor, flexShrink: 0 }} />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 44,
            letterSpacing: -1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
        <div style={{ flexShrink: 0, fontSize: TEXT_SIZE, color: MUTED }}>{label}</div>
      </div>

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          marginTop: 20,
          marginBottom: 16,
          padding: 24,
          borderRadius: 16,
          border: `1px solid ${PANEL_BORDER}`,
          background: PANEL,
          ...(clip && { overflow: 'hidden' }),
        }}
      >
        {children}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 36,
          fontSize: TEXT_SIZE,
          color: MUTED,
        }}
      >
        <div>{footerLeft}</div>
        <div>{footerRight}</div>
      </div>
    </div>
  );
}

/** Highlighted lines, one flex row each, at the panel's line height. */
export function CodeLines({ lines }: { lines: HighlightedToken[][] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {lines.map((line, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            height: LINE_HEIGHT,
            fontSize: TEXT_SIZE,
            lineHeight: `${LINE_HEIGHT}px`,
            whiteSpace: 'pre',
          }}
        >
          {line.map((token, tokenIndex) => (
            <span key={tokenIndex} style={{ color: token.color, whiteSpace: 'pre' }}>
              {token.content}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

interface TokenLinesProps {
  lines: HighlightedToken[][];
  truncated: boolean;
}

function TokenLines({ lines, truncated }: TokenLinesProps) {
  return (
    <>
      <CodeLines lines={lines} />
      {truncated && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 80,
            background: `linear-gradient(180deg, rgba(24, 24, 27, 0) 0%, ${PANEL} 100%)`,
          }}
        />
      )}
    </>
  );
}

function FileRow({ item }: { item: PublicItem }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Mono color={FOREGROUND}>{item.fileName ?? item.title}</Mono>
      {item.fileSize ? <Mono color={MUTED}>{formatFileSize(item.fileSize)}</Mono> : null}
    </div>
  );
}

export interface ItemCardProps {
  item: PublicSharedItem;
  lines: HighlightedToken[][];
  truncated: boolean;
}

function ItemBody({ item, lines, truncated }: ItemCardProps) {
  switch (item.itemType.name) {
    case 'link':
      return <Mono color={LINK}>{item.url ?? ''}</Mono>;
    case 'image':
    case 'file':
      return <FileRow item={item} />;
    default:
      return lines.length > 0 ? (
        <TokenLines lines={lines} truncated={truncated} />
      ) : (
        <Mono color={MUTED}>(empty)</Mono>
      );
  }
}

/** The card behind a shared item's link: title, kind, the first lines, and the owner. */
export function ItemCard({ item, lines, truncated }: ItemCardProps) {
  return (
    <Frame title={item.title} label={kindLabel(item)} footerLeft={`@${item.handle}`} dotColor={item.itemType.color}>
      <ItemBody item={item} lines={lines} truncated={truncated} />
    </Frame>
  );
}

/** The card behind a shared collection's link: name, item count, the first items, and the owner. */
export function CollectionCard({ collection }: { collection: PublicCollection }) {
  const count = collection.itemCount;
  // The `+ n more` row takes the place of the last item row so nothing is clipped.
  const limit = count > OG_COLLECTION_ROWS ? OG_COLLECTION_ROWS - 1 : OG_COLLECTION_ROWS;
  const rows = collection.items.slice(0, limit);
  const more = count - rows.length;

  return (
    <Frame
      title={collection.name}
      label={`${count} ${count === 1 ? 'item' : 'items'}`}
      footerLeft={`@${collection.handle}`}
      dotColor={COLLECTION_COLOR}
    >
      {rows.length === 0 ? (
        <Mono color={MUTED}>No items yet</Mono>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map((item) => (
            <div
              key={item.id}
              style={{ display: 'flex', alignItems: 'center', gap: 14, height: ROW_HEIGHT, fontSize: TEXT_SIZE }}
            >
              <div
                style={{ width: 12, height: 12, borderRadius: 6, background: item.itemType.color, flexShrink: 0 }}
              />
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.title}
              </div>
              <div style={{ flexShrink: 0, color: MUTED }}>{kindLabel(item)}</div>
            </div>
          ))}
          {more > 0 && (
            <div
              style={{ display: 'flex', alignItems: 'center', height: ROW_HEIGHT, fontSize: TEXT_SIZE, color: MUTED }}
            >
              {`+ ${more} more`}
            </div>
          )}
        </div>
      )}
    </Frame>
  );
}
