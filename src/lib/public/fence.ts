import { COMMAND_LANGUAGE, fenceLanguage } from '@/lib/languages';
import { commandCopyText } from '@/lib/public/copy';

export interface Fence {
  code: string;
  language: string | null;
}

function textOf(children: unknown): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(textOf).join('');
  return '';
}

/**
 * The code and grammar of a fenced block from the props react-markdown gives its `code` element:
 * `className` carries `language-{info}` and the text ends with the newline the markdown parser adds.
 */
export function fenceFromCodeProps(props: { className?: string; children?: unknown }): Fence {
  const info = /(?:^|\s)language-(\S+)/.exec(props.className ?? '')?.[1] ?? null;
  return {
    code: textOf(props.children).replace(/\n$/, ''),
    language: fenceLanguage(info),
  };
}

/** Clipboard text for a fence: shell fences drop their `$ ` prompts like command items. */
export function fenceCopyText(fence: Fence): string {
  return fence.language === COMMAND_LANGUAGE ? commandCopyText(fence.code) : fence.code;
}
