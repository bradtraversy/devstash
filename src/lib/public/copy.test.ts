import { describe, it, expect } from 'vitest';
import { commandCopyText } from './copy';

describe('commandCopyText', () => {
  it('strips a leading prompt from every line', () => {
    expect(commandCopyText('$ npm install\n$ npm run dev')).toBe('npm install\nnpm run dev');
  });

  it('leaves lines without a prompt and inner dollar signs alone', () => {
    expect(commandCopyText('echo $HOME\n  $ indented\ncost $ 5')).toBe(
      'echo $HOME\n  $ indented\ncost $ 5'
    );
  });

  it('keeps a bare dollar sign line', () => {
    expect(commandCopyText('$\n$ ls')).toBe('$\nls');
  });

  it('returns an empty string for missing content', () => {
    expect(commandCopyText(null)).toBe('');
    expect(commandCopyText(undefined)).toBe('');
    expect(commandCopyText('')).toBe('');
  });
});
