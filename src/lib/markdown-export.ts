import type { MarkdownExport, MarkdownExportItem } from '@/lib/db/export';
import { itemToMarkdown } from '@/lib/public/markdown';
import { formatLongDate } from '@/lib/utils/date';

function typeLabel(name: string): string {
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}s`;
}

/** Groups keep the order the items arrive in; the query already sorts by type then date. */
function groupByType(items: MarkdownExportItem[]): { name: string; items: MarkdownExportItem[] }[] {
  const groups = new Map<string, MarkdownExportItem[]>();

  for (const item of items) {
    const group = groups.get(item.itemType.name);
    if (group) {
      group.push(item);
    } else {
      groups.set(item.itemType.name, [item]);
    }
  }

  return Array.from(groups, ([name, items]) => ({ name, items }));
}

/** The whole stash as one markdown document: every collection in order, then the items in no collection by type. */
export function stashToMarkdown(data: MarkdownExport): string {
  const sections: string[] = [
    `# DevStash export\n\nExported ${formatLongDate(data.exportedAt)}. ${data.itemCount} items, ${data.collections.length} collections.`,
  ];

  for (const collection of data.collections) {
    const lines = [`## ${collection.name}`];
    if (collection.description) {
      lines.push('', collection.description);
    }
    for (const item of collection.items) {
      lines.push('', itemToMarkdown(item, 3));
    }
    sections.push(lines.join('\n'));
  }

  for (const group of groupByType(data.uncollected)) {
    const lines = [`## ${typeLabel(group.name)} not in a collection`];
    for (const item of group.items) {
      lines.push('', itemToMarkdown(item, 3));
    }
    sections.push(lines.join('\n'));
  }

  return sections.join('\n\n').trimEnd() + '\n';
}
