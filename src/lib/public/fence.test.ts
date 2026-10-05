import { describe, it, expect } from 'vitest';
import { fenceCopyText, fenceFromCodeProps } from './fence';

describe('fenceFromCodeProps', () => {
  it('reads the grammar from the language class and trims the trailing newline', () => {
    expect(fenceFromCodeProps({ className: 'language-ts', children: 'const a = 1;\n' })).toEqual({
      code: 'const a = 1;',
      language: 'typescript',
    });
  });

  it('keeps inner newlines and leading whitespace', () => {
    expect(fenceFromCodeProps({ className: 'language-python', children: '  a\n\n  b\n' }).code).toBe(
      '  a\n\n  b'
    );
  });

  it('removes exactly the one newline the parser adds', () => {
    expect(fenceFromCodeProps({ children: 'a\n\n' }).code).toBe('a\n');
    expect(fenceFromCodeProps({ children: 'a  \n' }).code).toBe('a  ');
  });

  it('joins array children', () => {
    expect(fenceFromCodeProps({ className: 'language-js', children: ['a', 'b\n'] }).code).toBe('ab');
  });

  it('falls back to plain text without a language class or with an unknown one', () => {
    expect(fenceFromCodeProps({ children: 'npm install\n' })).toEqual({ code: 'npm install', language: null });
    expect(fenceFromCodeProps({ className: 'language-brainfuck', children: 'x' }).language).toBeNull();
    expect(fenceFromCodeProps({ className: 'other language-go', children: 'x' }).language).toBe('go');
  });

  it('ignores non-text children', () => {
    expect(fenceFromCodeProps({ className: 'language-go', children: { some: 'element' } }).code).toBe('');
  });
});

describe('fenceCopyText', () => {
  it('drops a leading $ prompt from every line of a shell fence', () => {
    const fence = fenceFromCodeProps({ className: 'language-sh', children: '$ npm ci\n$ npm test\necho done\n' });
    expect(fenceCopyText(fence)).toBe('npm ci\nnpm test\necho done');
  });

  it('copies other fences unchanged', () => {
    expect(fenceCopyText({ code: '$ not a prompt', language: 'javascript' })).toBe('$ not a prompt');
    expect(fenceCopyText({ code: '$ plain', language: null })).toBe('$ plain');
  });
});
