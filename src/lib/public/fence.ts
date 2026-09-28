import { fenceLanguage } from '@/lib/languages';

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
