import { describe, it, expect } from 'vitest';
import { PASTE_TITLE_LENGTH, guessPaste } from './paste';

describe('guessPaste', () => {
  it('returns null for empty or blank input', () => {
    expect(guessPaste('')).toBeNull();
    expect(guessPaste('  \n  ')).toBeNull();
  });

  it('reads a single URL as a link titled by host and path', () => {
    expect(guessPaste('  https://www.tailwindcss.com/docs/theme/  ')).toEqual({
      typeName: 'link',
      title: 'tailwindcss.com/docs/theme',
      content: null,
      url: 'https://www.tailwindcss.com/docs/theme/',
      language: null,
    });
  });

  it('reads a known command as a command titled by itself', () => {
    expect(guessPaste('git reset --soft HEAD~1')).toMatchObject({
      typeName: 'command',
      title: 'git reset --soft HEAD~1',
      content: 'git reset --soft HEAD~1',
      language: null,
    });
  });

  it('drops a leading shell prompt from any command', () => {
    expect(guessPaste('$ ./deploy.sh --prod')).toMatchObject({
      typeName: 'command',
      content: './deploy.sh --prod',
    });
  });

  it('does not treat a word that only starts like a command as one', () => {
    expect(guessPaste('gitignore rules')?.typeName).toBe('snippet');
  });

  it('keeps multi-line text that starts with a command word as a snippet', () => {
    const text = 'git fetch\ngit rebase origin/main';
    expect(guessPaste(text)).toMatchObject({ typeName: 'snippet', content: text });
  });

  it('titles a snippet by its first declared name and keeps the content as pasted', () => {
    const text = "export function useDebounce<T>(value: T, delay = 300): T {\n  return value;\n}\n";
    expect(guessPaste(text)).toMatchObject({ typeName: 'snippet', title: 'useDebounce', content: text });
  });

  it('falls back to the language title when nothing is declared', () => {
    expect(guessPaste('SELECT datname, count(*)\nFROM pg_stat_activity\nGROUP BY datname;')).toMatchObject({
      typeName: 'snippet',
      language: 'sql',
      title: 'SQL snippet',
    });
  });

  it('ignores declaration words that start a line of prose', () => {
    expect(guessPaste('let me know when it ships\ntype the following into the box')?.title).toBe('Snippet');
  });

  it('reads declarations of each kind', () => {
    expect(guessPaste('const apiUrl = process.env.API_URL;\nconsole.log(apiUrl);')?.title).toBe('apiUrl');
    expect(guessPaste('class Cache<T> {\n  items: T[] = [];\n}')?.title).toBe('Cache');
    expect(guessPaste('def slugify(text):\n    return text.lower()')?.title).toBe('slugify');
    expect(guessPaste('export type Props = {\n  id: string;\n};')?.title).toBe('Props');
  });

  it('treats a sentence that starts with an everyday command word as a note, not a command', () => {
    expect(guessPaste('make sure to run the tests before you push')?.typeName).toBe('snippet');
    expect(guessPaste('kill the server process when you are done')?.typeName).toBe('snippet');
  });

  it('keeps short or shell shaped lines that start with an everyday word as commands', () => {
    expect(guessPaste('make build')?.typeName).toBe('command');
    expect(guessPaste('find . -name "*.log" -delete')?.typeName).toBe('command');
    expect(guessPaste('cat package.json')?.typeName).toBe('command');
  });

  it('does not call text a link when it is not a valid web URL', () => {
    expect(guessPaste('https://<script>')?.typeName).toBe('snippet');
  });

  it('ignores declaration words inside prose', () => {
    expect(guessPaste('Remember to let me know\nwhich type of cache we use')?.title).toBe('Snippet');
  });

  it('titles unknown text as a plain snippet with no language', () => {
    expect(guessPaste('some notes\nmore notes')).toMatchObject({ title: 'Snippet', language: null });
  });

  it('cuts long titles', () => {
    const guess = guessPaste(`git commit -m "${'x'.repeat(200)}"`);
    expect(guess?.title.length).toBe(PASTE_TITLE_LENGTH);
    expect(guess?.title.endsWith('...')).toBe(true);
  });
});
