import { isValidElement, type ReactNode } from 'react';

/** Plain text of rendered markdown children, through inline code, emphasis, and links. */
export function nodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return '';
}

/** GitHub-style heading slug: lowercase, letters and digits kept, spaces to hyphens, the rest dropped. */
export function headingSlug(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
  return slug || 'section';
}

/** Hands out unique heading ids for one markdown block, with `-1`, `-2` suffixes on repeats. */
export function createHeadingIds(prefix = ''): (text: string) => string {
  const used = new Set<string>();
  return (text) => {
    const base = headingSlug(text);
    let id = base;
    for (let n = 1; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return `${prefix}${id}`;
  };
}

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

function hastText(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(hastText).join('');
}

/** Rehype plugin giving every heading an id in document order, so repeats number the same way each render. */
export function rehypeHeadingIds(prefix = '') {
  return (tree: HastNode) => {
    const nextId = createHeadingIds(prefix);
    const walk = (node: HastNode) => {
      // remark-gfm's hidden footnotes heading already has the id its references point at.
      if (node.type === 'element' && node.tagName && HEADING_TAGS.has(node.tagName) && !node.properties?.id) {
        node.properties = { ...node.properties, id: nextId(hastText(node)) };
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}
