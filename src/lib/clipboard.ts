/** Starts the clipboard write inside the click, as Safari requires, with text that arrives later. */
export function copyWhenReady(text: Promise<string>): Promise<void> {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    const blob = text.then((value) => new Blob([value], { type: 'text/plain' }));
    return navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
  }
  return text.then((value) => navigator.clipboard.writeText(value));
}
