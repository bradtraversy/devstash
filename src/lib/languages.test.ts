import { describe, it, expect } from 'vitest';
import { LANGUAGES } from '@/lib/constants/editor';
import {
  FENCE_LANGUAGE_ALIASES,
  SHIKI_LANGUAGES,
  defaultShareTitle,
  fenceLanguage,
  guessLanguage,
  languageFileName,
  snippetFileLabel,
  languageLabel,
  shikiLanguage,
  PLAIN_TEXT_LABEL,
} from './languages';

describe('SHIKI_LANGUAGES', () => {
  it('covers every editor language except plaintext', () => {
    const expected = LANGUAGES.map((language) => language.value).filter((id) => id !== 'plaintext');
    expect(Object.keys(SHIKI_LANGUAGES).sort()).toEqual(expected.sort());
  });

  it('holds no id the editor does not offer', () => {
    const offered = new Set(LANGUAGES.map((language) => language.value));
    for (const id of Object.keys(SHIKI_LANGUAGES)) {
      expect(offered.has(id)).toBe(true);
    }
  });
});

describe('shikiLanguage', () => {
  it('maps known ids case-insensitively', () => {
    expect(shikiLanguage('typescript')).toBe('typescript');
    expect(shikiLanguage('TypeScript')).toBe('typescript');
  });

  it('returns null for plaintext, unknown, and missing languages', () => {
    expect(shikiLanguage('plaintext')).toBeNull();
    expect(shikiLanguage('brainfuck')).toBeNull();
    expect(shikiLanguage(null)).toBeNull();
    expect(shikiLanguage(undefined)).toBeNull();
  });
});

describe('fenceLanguage', () => {
  it('resolves editor ids, aliases, and mixed case', () => {
    expect(fenceLanguage('typescript')).toBe('typescript');
    expect(fenceLanguage('js')).toBe('javascript');
    expect(fenceLanguage('TSX')).toBe('typescript');
    expect(fenceLanguage('sh')).toBe('bash');
    expect(fenceLanguage('yml')).toBe('yaml');
  });

  it('uses only the first word of the info string', () => {
    expect(fenceLanguage('bash title="install.sh"')).toBe('bash');
  });

  it('returns null for plain text, unknown, and missing info', () => {
    expect(fenceLanguage('text')).toBeNull();
    expect(fenceLanguage('plaintext')).toBeNull();
    expect(fenceLanguage('brainfuck')).toBeNull();
    expect(fenceLanguage('')).toBeNull();
    expect(fenceLanguage(null)).toBeNull();
  });

  it('aliases point at editor ids or plaintext', () => {
    const known = new Set([...Object.keys(SHIKI_LANGUAGES), 'plaintext']);
    for (const target of Object.values(FENCE_LANGUAGE_ALIASES)) {
      expect(known.has(target), target).toBe(true);
    }
  });
});

describe('languageLabel', () => {
  it('uses the editor label when known', () => {
    expect(languageLabel('csharp')).toBe('C#');
    expect(languageLabel('bash')).toBe('Bash / Shell');
  });

  it('falls back to the raw id or Plain Text', () => {
    expect(languageLabel('zig')).toBe('zig');
    expect(languageLabel(null)).toBe(PLAIN_TEXT_LABEL);
  });
});

describe('guessLanguage', () => {
  const cases: [string, string][] = [
    ['#!/usr/bin/env bash\necho hi', 'bash'],
    ['#!/usr/bin/env python3\nprint(1)', 'python'],
    ['#!/usr/bin/env node\nconsole.log(1)', 'javascript'],
    ['<?php\necho "hi";', 'php'],
    ['<!DOCTYPE html>\n<html><body></body></html>', 'html'],
    ['package main\n\nimport "fmt"\n\nfunc main() { fmt.Println("hi") }', 'go'],
    ['func add(a int, b int) int {\n\tsum := a + b\n\treturn sum\n}', 'go'],
    ['fn main() {\n    let mut x = 1;\n    println!("{}", x);\n}', 'rust'],
    ['#include <iostream>\nint main() { std::cout << "hi"; }', 'cpp'],
    ['#include <stdio.h>\nint main() { printf("hi"); }', 'c'],
    ['using System;\nclass P { static void Main() {} }', 'csharp'],
    ['public class Main {\n  public static void main(String[] args) {}\n}', 'java'],
    ['def add(a, b):\n    return a + b', 'python'],
    ['from pathlib import Path\nprint(Path.cwd())', 'python'],
    ['interface User {\n  name: string;\n}', 'typescript'],
    ['import type { Foo } from "./foo";', 'typescript'],
    ['const add = (a, b) => {\n  return a + b;\n};', 'javascript'],
    ['function greet(name) {\n  console.log(name);\n}', 'javascript'],
    ['import React from "react";', 'javascript'],
    ['SELECT id, name\nFROM users\nWHERE id = 1;', 'sql'],
    ['CREATE TABLE users (id serial primary key);', 'sql'],
    ['{\n  "name": "devstash",\n  "private": true\n}', 'json'],
    ['[1, 2, 3]', 'json'],
    ['FROM node:24\nRUN npm ci\nCMD ["node", "server.js"]', 'dockerfile'],
    ['query {\n  user(id: 1) {\n    name\n  }\n}', 'graphql'],
    ['type User {\n  id: ID!\n  name: String\n}', 'graphql'],
    ['$primary: #333;\n.btn {\n  color: $primary;\n}', 'scss'],
    ['@mixin flex { display: flex; }', 'scss'],
    ['.btn {\n  color: red;\n  padding: 4px;\n}', 'css'],
    ['---\nname: devstash\nversion: 1\n', 'yaml'],
    ['name: devstash\nversion: 1\nprivate: true\n', 'yaml'],
    ['$ npm install\n$ npm run dev', 'bash'],
  ];

  it.each(cases)('guesses %j as %s', (content, expected) => {
    expect(guessLanguage(content)).toBe(expected);
  });

  it('prefers the specific rule when two match', () => {
    expect(guessLanguage('interface Props { onClick: () => void }\nconst C = () => {}')).toBe('typescript');
    expect(guessLanguage('$spacing: 4px;\n.a { margin: $spacing; }')).toBe('scss');
    expect(guessLanguage('package main\nfunc main() { x := func() {} }')).toBe('go');
  });

  it('returns null for prose, empty input, and ambiguous text', () => {
    expect(guessLanguage('')).toBeNull();
    expect(guessLanguage('   \n  ')).toBeNull();
    expect(guessLanguage('Remember to select the right branch from the list before you push.')).toBeNull();
    expect(guessLanguage('x = 1')).toBeNull();
  });

  it('only returns ids the editor offers', () => {
    const offered = new Set(LANGUAGES.map((language) => language.value));
    for (const [content] of cases) {
      const guess = guessLanguage(content);
      expect(guess === null || offered.has(guess)).toBe(true);
    }
  });
});

describe('defaultShareTitle', () => {
  it('names a snippet by its language', () => {
    expect(defaultShareTitle('snippet', 'typescript')).toBe('TypeScript snippet');
  });

  it('falls back to Snippet for plain text or no language', () => {
    expect(defaultShareTitle('snippet', null)).toBe('Snippet');
    expect(defaultShareTitle('snippet', 'plaintext')).toBe('Snippet');
  });

  it('names a command Command whatever the language', () => {
    expect(defaultShareTitle('command', 'bash')).toBe('Command');
    expect(defaultShareTitle('command', null)).toBe('Command');
  });
});

describe('languageFileName', () => {
  it('has a file name for every editor language', () => {
    for (const { value } of LANGUAGES) expect(languageFileName(value), value).toBeTruthy();
  });

  it('uses the extension developers know, or the file name when there is no extension', () => {
    expect(languageFileName('typescript')).toBe('.ts');
    expect(languageFileName('yaml')).toBe('.yml');
    expect(languageFileName('bash')).toBe('.sh');
    expect(languageFileName('dockerfile')).toBe('Dockerfile');
    expect(languageFileName('Python')).toBe('.py');
  });

  it('returns null for a missing or unknown language', () => {
    expect(languageFileName(null)).toBeNull();
    expect(languageFileName('brainfuck')).toBeNull();
  });

  it('uses .tsx and .jsx for code with JSX', () => {
    expect(languageFileName('typescript', 'export function Card() {\n  return <div className="card">Hi</div>;\n}')).toBe('.tsx');
    expect(languageFileName('javascript', 'const App = () => <Button variant="ghost" />;')).toBe('.jsx');
    expect(languageFileName('typescript', 'return (\n  <>\n    <Header />\n  </>\n);')).toBe('.tsx');
  });

  it('keeps .ts for TypeScript without JSX, generics included', () => {
    expect(languageFileName('typescript', 'const [value, setValue] = useState<T>(initial);')).toBe('.ts');
    expect(languageFileName('typescript', 'function first<T>(items: Array<T>): T | undefined { return items[0]; }')).toBe('.ts');
    expect(languageFileName('typescript', 'if (a < b && c > d) return;')).toBe('.ts');
    expect(languageFileName('python', 'print("</div>")')).toBe('.py');
  });

  it('ignores HTML inside strings, template literals, and comments', () => {
    expect(languageFileName('javascript', "el.innerHTML = '<p>Hello</p>';")).toBe('.js');
    expect(languageFileName('typescript', 'render() { return html`<div>${this.x}</div>`; }')).toBe('.ts');
    expect(languageFileName('typescript', "template: '<h1>{{title}}</h1>'")).toBe('.ts');
    expect(languageFileName('javascript', "const s = 'line<br/>';")).toBe('.js');
    expect(languageFileName('typescript', '// wraps the result in <span>...</span>\nconst x = 1;')).toBe('.ts');
  });

  it('finds JSX with arrow functions in props and bare fragments', () => {
    expect(languageFileName('typescript', '<input value={v} onChange={(e) => setV(e.target.value)} />')).toBe('.tsx');
    expect(languageFileName('javascript', "<Button onClick={() => alert('hi')} />")).toBe('.jsx');
    expect(languageFileName('typescript', 'return <>{children}</>;')).toBe('.tsx');
    expect(languageFileName('typescript', 'const n = a<b?c:d/>;')).toBe('.ts');
  });
});

describe('snippetFileLabel', () => {
  it('reads as the file name, with JSX detected', () => {
    expect(snippetFileLabel('typescript', 'export const A = () => <a href="/">Home</a>;')).toBe('.tsx');
    expect(snippetFileLabel('yaml')).toBe('.yml');
  });

  it('falls back to the language label when there is no file name', () => {
    expect(snippetFileLabel(null)).toBe('Plain Text');
    expect(snippetFileLabel('brainfuck')).toBe('brainfuck');
  });
});

