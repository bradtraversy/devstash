import { describe, it, expect } from 'vitest';
import { PASTE_TITLE_LENGTH, canBeLink, detectPasteType, guessPaste, pasteAs } from './paste';

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

  it('reads several command lines as one command', () => {
    expect(guessPaste('git fetch\ngit rebase origin/main')).toMatchObject({
      typeName: 'command',
      title: 'git fetch',
      content: 'git fetch\ngit rebase origin/main',
    });
  });

  it('keeps code that only starts with a command word as a snippet', () => {
    expect(guessPaste('cd app\nconst port = Number(process.env.PORT);')?.typeName).toBe('snippet');
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

  it('reads prose that starts with declaration words as a note, not code', () => {
    expect(guessPaste('let me know when it ships\ntype the following into the box')).toMatchObject({
      typeName: 'note',
      title: 'let me know when it ships',
    });
  });

  it('reads declarations of each kind', () => {
    expect(guessPaste('const apiUrl = process.env.API_URL;\nconsole.log(apiUrl);')?.title).toBe('apiUrl');
    expect(guessPaste('class Cache<T> {\n  items: T[] = [];\n}')?.title).toBe('Cache');
    expect(guessPaste('def slugify(text):\n    return text.lower()')?.title).toBe('slugify');
    expect(guessPaste('export type Props = {\n  id: string;\n};')?.title).toBe('Props');
  });

  it('treats a sentence that starts with an everyday command word as a note, not a command', () => {
    expect(guessPaste('make sure to run the tests before you push')?.typeName).toBe('note');
    expect(guessPaste('kill the server process when you are done')?.typeName).toBe('note');
  });

  it('keeps short or shell shaped lines that start with an everyday word as commands', () => {
    expect(guessPaste('make build')?.typeName).toBe('command');
    expect(guessPaste('find . -name "*.log" -delete')?.typeName).toBe('command');
    expect(guessPaste('cat package.json')?.typeName).toBe('command');
  });

  it('does not call text a link when it is not a valid web URL', () => {
    expect(guessPaste('https://<script>')?.typeName).toBe('snippet');
  });

  it('titles a note by its first line', () => {
    expect(guessPaste('Remember to let me know\nwhich type of cache we use')).toMatchObject({
      typeName: 'note',
      title: 'Remember to let me know',
    });
  });

  it('titles code with no declaration and no known language as a plain snippet', () => {
    expect(guessPaste('foo(bar[0]);\nbaz = qux[1];')).toMatchObject({ typeName: 'snippet', title: 'Snippet', language: null });
  });

  it('cuts long titles', () => {
    const guess = guessPaste(`git commit -m "${'x'.repeat(200)}"`);
    expect(guess?.title.length).toBe(PASTE_TITLE_LENGTH);
    expect(guess?.title.endsWith('...')).toBe(true);
  });
});

describe('detectPasteType', () => {
  it('reads markdown as a note', () => {
    expect(detectPasteType('## Before release\n\n- Run the tests\n- Tag the release')).toBe('note');
    expect(detectPasteType('- [ ] write docs\n- [x] ship it')).toBe('note');
    expect(detectPasteType('## Write the docs\n\nStart with the install steps.')).toBe('note');
  });

  it('reads instructions to an assistant as a prompt', () => {
    expect(detectPasteType('You are a senior engineer. Review my code for bugs first.')).toBe('prompt');
    expect(detectPasteType('Review this diff like a senior engineer.\n\n1. Bugs first.\n2. Style last.')).toBe('prompt');
    expect(detectPasteType('Turn the notes below into a changelog:\n\n{{notes}}')).toBe('prompt');
  });

  it('keeps code, SQL, and YAML lists as snippets', () => {
    expect(detectPasteType('export function add(a: number, b: number) {\n  return a + b;\n}')).toBe('snippet');
    expect(detectPasteType('SELECT name FROM users\nWHERE id = 1;')).toBe('snippet');
    expect(detectPasteType('services:\n  web:\n    ports:\n      - 3000:3000\n      - 9229:9229')).toBe('snippet');
  });

  it('keeps links and commands as before', () => {
    expect(detectPasteType('https://react.dev/learn')).toBe('link');
    expect(detectPasteType('$ ./deploy.sh')).toBe('command');
  });

  it('returns null for blank text', () => {
    expect(detectPasteType('   ')).toBeNull();
  });
});

describe('pasteAs', () => {
  const text = '## Deploy\n\nRun the migration first.';

  it('saves the same text as whatever type the user picks', () => {
    expect(pasteAs(text, 'prompt')).toMatchObject({ typeName: 'prompt', title: 'Deploy', content: text, language: null });
    expect(pasteAs(text, 'note')).toMatchObject({ typeName: 'note', title: 'Deploy' });
    expect(pasteAs(text, 'snippet')).toMatchObject({ typeName: 'snippet', content: text });
    expect(pasteAs('$ npm run build', 'command')).toMatchObject({ content: 'npm run build', title: 'npm run build' });
  });

  it('refuses a link unless the text is one web URL', () => {
    expect(pasteAs(text, 'link')).toBeNull();
    expect(pasteAs('ftp://example.com/file', 'link')).toBeNull();
    expect(pasteAs('https://example.com/docs', 'link')).toMatchObject({ url: 'https://example.com/docs', title: 'example.com/docs' });
  });

  it('knows when a paste can be a link', () => {
    expect(canBeLink(' https://example.com ')).toBe(true);
    expect(canBeLink('https://example.com\nhttps://example.org')).toBe(false);
  });
});

describe('detectPasteType edge cases', () => {
  it('keeps shell scripts as code, comments and all', () => {
    expect(detectPasteType('#!/usr/bin/env bash\n# Deploy the app\nset -euo pipefail\nnpm run build')).toBe('snippet');
    expect(detectPasteType('# install deps\nnpm install\n# run migrations\nnpx prisma migrate deploy')).toBe('command');
  });

  it('drops the prompt from every line of a multi-line command', () => {
    expect(pasteAs('$ npm install\n  $ npm run dev', 'command')?.content).toBe('npm install\nnpm run dev');
  });

  it('does not read a markdown link or a hyphenated word as a prompt', () => {
    expect(detectPasteType('Open [your settings](https://devstash.io/settings) and turn on the minimap.')).toBe('note');
    expect(detectPasteType('Write-up from the retro: we shipped late because of reviews.')).toBe('note');
  });

  it('needs an object after an instruction verb', () => {
    expect(detectPasteType('Review meeting moved to Thursday at 3pm.')).toBe('note');
    expect(detectPasteType('Create React App is deprecated, use Vite instead.')).toBe('note');
    expect(detectPasteType('Given the budget we should cut scope.')).toBe('note');
    expect(detectPasteType('Given the following schema, write the migration.')).toBe('prompt');
  });

  it('reads questions and roles as prompts, even under a heading', () => {
    expect(detectPasteType('Can you explain why this query is slow?')).toBe('prompt');
    expect(detectPasteType('# Role\nYou are a code reviewer. Point out bugs first.')).toBe('prompt');
  });

  it('finds every placeholder form', () => {
    expect(detectPasteType('Shorten this for a tweet: [paste text here]')).toBe('prompt');
    expect(detectPasteType('Summarize the thread below for the team.\n\n<paste thread>')).toBe('prompt');
  });

  it('keeps prose with parentheses and notes with a code fence as notes', () => {
    expect(detectPasteType('Met with Sam (design) and Alex (backend) about the sharing flow. We agreed to ship rows first.')).toBe('note');
    expect(
      guessPaste('## Usage\n\nInstall it and call the hook:\n\n```ts\nconst value = useDebounce(input, 300);\n```\n\nIt returns the delayed value.')
    ).toMatchObject({ typeName: 'note', title: 'Usage' });
  });

  it('keeps file lists and class strings as snippets', () => {
    expect(detectPasteType('node_modules/\n.env\ndist/\n*.log')).toBe('snippet');
    expect(detectPasteType('flex items-center gap-2 px-4 py-2 rounded-md')).toBe('snippet');
  });

  it('reads CJK sentences as a note', () => {
    expect(detectPasteType('今日はリリースの準備をします。テストを実行してからタグを付けます。')).toBe('note');
  });

  it('stays fast on pathological input', () => {
    const started = performance.now();
    detectPasteType('a' + '\n'.repeat(100_000) + 'a b c d.');
    detectPasteType('['.repeat(100_000));
    detectPasteType('```ts\n' + 'x\n'.repeat(50_000));
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
