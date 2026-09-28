/** Clipboard text for a command block: a leading "$ " prompt is dropped from every line. */
export function commandCopyText(content: string | null | undefined): string {
  if (!content) return '';
  return content
    .split('\n')
    .map((line) => line.replace(/^\$ /, ''))
    .join('\n');
}
