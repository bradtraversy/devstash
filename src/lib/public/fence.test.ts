import { describe, it, expect } from 'vitest';
import { fenceFromCodeProps } from './fence';

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
