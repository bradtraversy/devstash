import type { PublicCollection } from '@/lib/db/public';
import { COMMAND_LANGUAGE, shikiLanguage } from '@/lib/languages';
import { formatFileSize } from '@/lib/r2';

/** The item fields the markdown renderers read; public items and export items both satisfy it. */
export interface MarkdownItem {
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  language: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  itemType: { name: string };
  tags?: string[];
}

/** A fence one backtick longer than any run inside the content, at least three. */
function fenceFor(content: string): string {
  const longest = Math.max(2, ...Array.from(content.matchAll(/`+/g), (match) => match[0].length));
  return '`'.repeat(longest + 1);
}

function fenceTitle(title: string): string {
  return title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function codeBlock(item: MarkdownItem, language: string): string {
  const content = item.content ?? '';
  const fence = fenceFor(content);
  return `${fence}${language} title="${fenceTitle(item.title)}"\n${content}\n${fence}`;
}

function fileLine(item: MarkdownItem): string {
  const name = item.fileName ?? item.title;
  return item.fileSize ? `${name} (${formatFileSize(item.fileSize)})` : name;
}

function itemBody(item: MarkdownItem): string {
  switch (item.itemType.name) {
    case 'snippet':
      return codeBlock(item, shikiLanguage(item.language) ?? 'text');
    case 'command':
      return codeBlock(item, COMMAND_LANGUAGE);
    case 'link':
      return `[${item.title}](${item.url ?? ''})`;
    case 'image':
      return `![${item.title}](${item.fileUrl ?? ''})`;
    case 'file':
      return fileLine(item);
    default:
      return item.content ?? '';
  }
}

/** The item as a section: a heading of `level` hashes, the description, the tags when given, then the body by type. */
export function itemToMarkdown(item: MarkdownItem, level: number): string {
  const lines: string[] = [`${'#'.repeat(level)} ${item.title}`, ''];

  if (item.description) {
    lines.push(item.description, '');
  }

  if (item.tags?.length) {
    lines.push(`Tags: ${item.tags.join(', ')}`, '');
  }

  lines.push(itemBody(item));

  return lines.join('\n');
}

/** The collection as one markdown document; notes and prompts are inlined, code is fenced with a title. */
export function collectionToMarkdown(collection: PublicCollection, canonicalUrl: string): string {
  const lines: string[] = [`# ${collection.name}`, ''];

  if (collection.description) {
    lines.push(collection.description, '');
  }

  lines.push(`by @${collection.handle}`, '', `Source: ${canonicalUrl}`, '');

  for (const item of collection.items) {
    lines.push(itemToMarkdown(item, 2), '');
  }

  return lines.join('\n').trimEnd() + '\n';
}
