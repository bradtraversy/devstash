const ORIGIN = 'devstash.io';
const HANDLE = 'brad';

const TYPES = {
  snippet: { label: 'Snippet', plural: 'Snippets', icon: 'code', hex: '#3b82f6' },
  command: { label: 'Command', plural: 'Commands', icon: 'terminal', hex: '#f97316' },
  prompt: { label: 'Prompt', plural: 'Prompts', icon: 'sparkles', hex: '#8b5cf6' },
  note: { label: 'Note', plural: 'Notes', icon: 'sticky-note', hex: '#fde047' },
  link: { label: 'Link', plural: 'Links', icon: 'link', hex: '#10b981' },
};
const TYPE_ORDER = ['snippet', 'command', 'prompt', 'note', 'link'];
const CODE_TYPES = ['snippet', 'command'];
const IMAGE_TYPES = ['snippet', 'command', 'prompt', 'note'];

const VIS = {
  PRIVATE: { label: 'Private', icon: 'lock', hint: 'Only you can see it.' },
  UNLISTED: { label: 'Unlisted', icon: 'link-2', hint: 'Anyone with the link can open it. It is not listed or indexed.' },
  PUBLIC: { label: 'Public', icon: 'globe', hint: 'Anyone can open it, and search engines can list it.' },
};

const SAMPLE_ITEMS = [
  {
    id: 'i1', type: 'snippet', title: 'useDebounce hook', language: 'TypeScript', visibility: 'PUBLIC', shortId: 'k3j9x2ab',
    pinned: true, favorite: true, tags: ['react', 'hooks'], updated: 95, created: 21,
    description: 'Delays a value until typing stops.',
    content: `import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}`,
  },
  {
    id: 'i2', type: 'command', title: 'Undo the last commit', language: 'Bash', visibility: 'PRIVATE', shortId: 'p8w2m4qz',
    pinned: true, favorite: false, tags: ['git'], updated: 300, created: 40,
    description: 'Keeps the changes staged.',
    content: 'git reset --soft HEAD~1',
  },
  {
    id: 'i3', type: 'prompt', title: 'Code review prompt', language: 'Markdown', visibility: 'UNLISTED', shortId: 'r5t7c1vd',
    pinned: false, favorite: true, tags: ['review', 'ai'], updated: 1500, created: 12,
    description: 'Bugs and edge cases first, style last.',
    content: `Review this diff like a senior engineer on my team.

1. Point out bugs and edge cases first, with the line.
2. Flag anything that changes existing behavior.
3. Suggest simpler code only where it is clearly better.

Skip style nits the linter already catches.`,
  },
  {
    id: 'i4', type: 'command', title: 'Docker cleanup', language: 'Bash', visibility: 'UNLISTED', shortId: 'd2k8n6fh',
    pinned: false, favorite: false, tags: ['docker'], updated: 2900, created: 33,
    description: 'Removes stopped containers, unused images, and volumes.',
    content: 'docker system prune -af --volumes',
  },
  {
    id: 'i5', type: 'snippet', title: 'useLocalStorage hook', language: 'TypeScript', visibility: 'PRIVATE', shortId: 'h4b9s3lw',
    pinned: false, favorite: false, tags: ['react', 'hooks'], updated: 3100, created: 19,
    description: 'State that survives a reload.',
    content: `export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : initial;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}`,
  },
  {
    id: 'i6', type: 'command', title: 'Kill whatever is on port 3000', language: 'Bash', visibility: 'PUBLIC', shortId: 'm7q3z8cy',
    pinned: false, favorite: false, tags: ['ports'], updated: 4300, created: 60,
    description: 'For when the dev server will not start.',
    content: 'lsof -ti :3000 | xargs kill -9',
  },
  {
    id: 'i7', type: 'link', title: 'Tailwind v4 theme variables', language: '', visibility: 'PRIVATE', shortId: 'w1e5u9go',
    pinned: false, favorite: false, tags: ['tailwind', 'css'], updated: 5800, created: 8,
    description: 'How @theme replaces the config file.',
    url: 'https://tailwindcss.com/docs/theme',
  },
  {
    id: 'i8', type: 'snippet', title: 'Zod sign-up schema', language: 'TypeScript', visibility: 'PRIVATE', shortId: 'z6y2t4ka',
    pinned: false, favorite: false, tags: ['zod', 'forms'], updated: 7200, created: 30,
    description: 'Email, password, and name with friendly errors.',
    content: `import { z } from 'zod';

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Use at least 8 characters'),
  name: z.string().trim().min(1).max(60),
});

export type SignUp = z.infer<typeof signUpSchema>;`,
  },
  {
    id: 'i9', type: 'prompt', title: 'Commit message prompt', language: 'Markdown', visibility: 'PRIVATE', shortId: 'c3v7b1nm',
    pinned: false, favorite: false, tags: ['git', 'ai'], updated: 8800, created: 25,
    description: 'Conventional commits from a diff.',
    content: `Write a conventional commit message for this diff.

Use feat, fix, or chore. Keep the subject under 60 characters and explain why in the body, not what.`,
  },
  {
    id: 'i10', type: 'snippet', title: 'GitHub Actions Node CI', language: 'YAML', visibility: 'PUBLIC', shortId: 'g9a4f6jx',
    pinned: false, favorite: true, tags: ['ci', 'github'], updated: 10100, created: 45,
    description: 'Install, test, and cache npm on every push.',
    content: `name: CI
on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test`,
  },
  {
    id: 'i11', type: 'snippet', title: 'Open Postgres connections', language: 'SQL', visibility: 'PRIVATE', shortId: 's8l2p5ue',
    pinned: false, favorite: false, tags: ['postgres'], updated: 12900, created: 50,
    description: 'Connection count per database.',
    content: `SELECT datname, count(*) AS connections
FROM pg_stat_activity
GROUP BY datname
ORDER BY connections DESC;`,
  },
  {
    id: 'i12', type: 'note', title: 'Release checklist', language: 'Markdown', visibility: 'PRIVATE', shortId: 'n5o1i7rt',
    pinned: false, favorite: false, tags: ['release'], updated: 15000, created: 70,
    description: 'The four things I forget every time.',
    content: `Before release

- Run the full test suite
- Check migrations against a copy of production
- Update the changelog
- Tag the release and push the tag`,
  },
  {
    id: 'i13', type: 'command', title: 'POST JSON with curl', language: 'Bash', visibility: 'PRIVATE', shortId: 'q2r6x9hd',
    pinned: false, favorite: false, tags: ['http'], updated: 17300, created: 64,
    description: 'Quick API check from the terminal.',
    content: `curl -X POST https://api.example.com/items -H "Content-Type: application/json" -d '{"title":"hello"}'`,
  },
  {
    id: 'i14', type: 'snippet', title: 'nginx reverse proxy', language: 'Nginx', visibility: 'PRIVATE', shortId: 'x4c8v2bn',
    pinned: false, favorite: false, tags: ['nginx', 'deploy'], updated: 20100, created: 80,
    description: 'Forward a domain to a local Node app.',
    content: `server {
  listen 80;
  server_name app.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}`,
  },
  {
    id: 'i15', type: 'link', title: 'React useEffect reference', language: '', visibility: 'PRIVATE', shortId: 'e7f3g1hk',
    pinned: false, favorite: false, tags: ['react'], updated: 25000, created: 90,
    description: 'Cleanup rules and dependency arrays.',
    url: 'https://react.dev/reference/react/useEffect',
  },
  {
    id: 'i16', type: 'prompt', title: 'Refactor to hooks', language: 'Markdown', visibility: 'PRIVATE', shortId: 'f6d9s3aq',
    pinned: false, favorite: false, tags: ['react', 'ai'], updated: 31000, created: 95,
    description: 'Class component in, function component out.',
    content: `Rewrite this class component as a function component with hooks.

Keep the props and behavior identical, move lifecycle logic into useEffect with correct cleanup, and list anything you could not convert.`,
  },
];

const SAMPLE_COLLECTIONS = [
  { id: 'c1', name: 'React patterns', slug: 'react-patterns', visibility: 'PUBLIC', description: 'Hooks and component patterns I keep reaching for.', itemIds: ['i1', 'i5', 'i15', 'i16'] },
  { id: 'c2', name: 'DevOps', slug: 'devops', visibility: 'UNLISTED', description: 'Deploys, CI, and server bits.', itemIds: ['i10', 'i14', 'i4'] },
  { id: 'c3', name: 'AI workflows', slug: 'ai-workflows', visibility: 'PRIVATE', description: 'Prompts for reviews, commits, and refactors.', itemIds: ['i3', 'i9', 'i16'] },
  { id: 'c4', name: 'Terminal', slug: 'terminal', visibility: 'PRIVATE', description: 'Commands I always forget.', itemIds: ['i2', 'i6', 'i13', 'i4'] },
];

const SAMPLES = {
  snippet: `export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));`,
  command: 'npx prisma migrate dev --name add_slugs',
  link: 'https://nextjs.org/docs/app/api-reference/functions/revalidatePath',
};

const state = {
  sidebar: 'type',
  list: 'rows',
  data: 'full',
  view: { name: 'home' },
  filter: 'all',
  query: '',
  items: [],
  collections: [],
  drawerId: null,
  drawerReturn: null,
  result: null,
  paste: '',
  pasteError: '',
  flashId: null,
};

const $ = (sel) => document.querySelector(sel);

function icon(name, cls = '') {
  return `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${window.ICONS[name] || ''}</svg>`;
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ago(minutes) {
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

function daysAgo(days) {
  if (days === 0) return 'Today';
  const d = new Date(Date.now() - days * 86400000);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const isShared = (x) => x.visibility !== 'PRIVATE';
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const itemUrl = (item) => `${ORIGIN}/s/${item.shortId}`;
const collUrl = (c) => `${ORIGIN}/${HANDLE}/${c.slug}`;
const findItem = (id) => state.items.find((i) => i.id === id);
const findColl = (id) => state.collections.find((c) => c.id === id);
const itemCollections = (item) => state.collections.filter((c) => c.itemIds.includes(item.id));

function sorted(items) {
  return [...items].sort((a, b) => (b.pinned - a.pinned) || (a.updated - b.updated));
}

function matchesQuery(item) {
  const q = state.query.trim().toLowerCase();
  if (!q) return true;
  return [item.title, item.description, item.language, item.url, ...item.tags]
    .some((v) => (v || '').toLowerCase().includes(q));
}

function dominantColor(c) {
  const counts = {};
  c.itemIds.map(findItem).filter(Boolean).forEach((i) => { counts[i.type] = (counts[i.type] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? TYPES[top[0]].hex : '#6b7280';
}

function randomId() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function loadData() {
  const full = state.data === 'full';
  state.items = full ? structuredClone(SAMPLE_ITEMS) : [];
  state.collections = full ? structuredClone(SAMPLE_COLLECTIONS) : [];
  state.view = { name: 'home' };
  state.filter = 'all';
  state.result = null;
  state.drawerId = null;
  document.body.classList.remove('drawer-open');
  $('#drawer').hidden = true;
}

/* Syntax highlighting, line by line so a token never spans two lines. */
const KEYWORDS = new Set(('const let var function return import from export default if else async await new type interface ' +
  'for of in as class extends typeof true false null undefined SELECT FROM WHERE GROUP BY ORDER AS DESC ASC ' +
  'server location listen jobs steps uses with run on name').split(' '));
const STRING_RE = String.raw`'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|` + '`[^`]*`';

function highlightLine(line, lang) {
  const hash = ['Bash', 'YAML', 'Nginx', 'Python'].includes(lang);
  const comment = hash ? String.raw`(?:^|\s)#[^\n]*` : lang === 'SQL' ? String.raw`--[^\n]*` : String.raw`\/\/[^\n]*`;
  const re = new RegExp(`(${comment})|(${STRING_RE})|\\b(\\d+(?:\\.\\d+)?)\\b|\\b([A-Za-z_][\\w]*)(?=\\s*\\()|\\b([A-Za-z_][\\w]*)\\b`, 'g');
  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(line))) {
    out += esc(line.slice(last, m.index));
    const [tok, c, s, n, f] = m;
    if (c) out += `<span class="tk-c">${esc(tok)}</span>`;
    else if (s) out += `<span class="tk-s">${esc(tok)}</span>`;
    else if (n) out += `<span class="tk-n">${esc(tok)}</span>`;
    else if (KEYWORDS.has(tok)) out += `<span class="tk-k">${esc(tok)}</span>`;
    else if (f) out += `<span class="tk-f">${esc(tok)}</span>`;
    else out += esc(tok);
    last = re.lastIndex;
  }
  return out + esc(line.slice(last));
}

/* Paste box guessing, roughly what the share dialog does today. */
const COMMAND_START = /^(git|npm|npx|pnpm|yarn|bun|docker|kubectl|curl|wget|lsof|kill|ssh|scp|brew|cd|ls|rm|cp|mv|chmod|sudo|psql|python3?|node|deno|gh|vercel|make)\b/;

function truncate(text, n) {
  return text.length > n ? `${text.slice(0, n - 3).trimEnd()}...` : text;
}

function guessLanguage(text) {
  if (/\bSELECT\b[\s\S]*\bFROM\b/i.test(text)) return 'SQL';
  if (/^\s*(def |from \w+ import|import \w+\s*$)/m.test(text)) return 'Python';
  if (/:\s*(string|number|boolean)\b|\binterface\s|<T>|\bas const\b/.test(text)) return 'TypeScript';
  if (/\b(const|let|function|import|export)\b|=>/.test(text)) return 'JavaScript';
  if (/^\s*[\w-]+:\s/m.test(text) && !/[{};]/.test(text)) return 'YAML';
  return 'Plain text';
}

function guess(text) {
  const t = text.trim();
  if (!t) return null;
  const single = !t.includes('\n');
  if (single && /^https?:\/\/\S+$/i.test(t)) {
    let title = t;
    try {
      const u = new URL(t);
      title = u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, '');
    } catch { /* keep the raw text as the title */ }
    return { type: 'link', language: '', title: truncate(title, 56), url: t };
  }
  const cmd = t.replace(/^\$\s*/, '');
  if (single && (t.startsWith('$') || COMMAND_START.test(cmd))) {
    return { type: 'command', language: 'Bash', title: truncate(cmd, 48), content: cmd };
  }
  const named = t.match(/(?:function|const|let|class|def)\s+([A-Za-z_]\w*)/);
  const firstLine = t.split('\n').find((l) => l.trim()) || 'Untitled snippet';
  return { type: 'snippet', language: guessLanguage(t), title: named ? named[1] : truncate(firstLine.trim(), 48), content: t };
}

function guessHtml() {
  if (state.pasteError) return `<span class="paste-error">${esc(state.pasteError)}</span>`;
  const g = guess(state.paste);
  if (!g) return 'Snippets, commands, and links. Private until you share it.';
  const what = g.language && g.language !== 'Plain text' ? `${TYPES[g.type].label.toLowerCase()} in ${g.language}` : TYPES[g.type].label.toLowerCase();
  return `${icon(TYPES[g.type].icon)}<span>Looks like a ${esc(what)}, saved as “${esc(g.title)}”</span>`;
}

/* Shared pieces */
function typeIcon(type) {
  const t = TYPES[type];
  return `<span class="type-icon" style="background:${t.hex}1f;color:${t.hex}">${icon(t.icon)}</span>`;
}

function pill(visibility) {
  const v = VIS[visibility];
  const cls = visibility === 'PRIVATE' ? 'pill-private' : 'pill-shared';
  return `<span class="pill ${cls}" title="${esc(v.hint)}">${icon(v.icon)}<span class="pill-label">${v.label}</span></span>`;
}

function shareButton(item) {
  if (isShared(item)) {
    return `<button class="btn btn-sm btn-quiet share-btn" data-action="copy-link" data-kind="item" data-id="${item.id}">${icon('link-2')}<span class="lbl">Copy link</span></button>`;
  }
  return `<button class="btn btn-sm btn-share share-btn" data-action="share" data-id="${item.id}">${icon('share-2')}<span class="lbl">Share</span></button>`;
}

function copyContentButton(item) {
  const label = item.type === 'link' ? 'Copy URL' : 'Copy content';
  return `<button class="icon-btn copy-content" data-action="copy-content" data-id="${item.id}" aria-label="${label}" title="${label}">${icon('copy')}</button>`;
}

function marks(item) {
  return `<span class="row-marks">${item.pinned ? `<span title="Pinned">${icon('pin')}</span>` : ''}${item.favorite ? `<span class="fav" title="Favorite">${icon('star')}</span>` : ''}</span>`;
}

function itemRow(item, mode = 'default') {
  const flash = state.flashId === item.id ? ' flash' : '';
  const second = mode === 'shared'
    ? `<span class="mono-link">${esc(itemUrl(item))}</span>`
    : `<span class="row-desc">${esc(item.description || (item.url ?? ''))}</span>`;
  const actions = mode === 'shared'
    ? `<button class="btn btn-sm btn-quiet share-btn" data-action="copy-link" data-kind="item" data-id="${item.id}">${icon('link-2')}<span class="lbl">Copy link</span></button>
       ${IMAGE_TYPES.includes(item.type) ? `<button class="icon-btn" data-action="todo" data-msg="this opens the snippet image" aria-label="Image" title="Image">${icon('image')}</button>` : ''}
       <button class="icon-btn" data-action="stop-sharing" data-kind="item" data-id="${item.id}" aria-label="Stop sharing" title="Stop sharing">${icon('eye-off')}</button>`
    : `${copyContentButton(item)}${shareButton(item)}`;
  return `<li class="row${flash}" data-open="${item.id}">
    <button class="row-main" data-action="open" data-id="${item.id}">
      ${typeIcon(item.type)}
      <span class="row-text"><span class="row-title">${esc(item.title)}</span>${second}</span>
      ${marks(item)}
      <span class="row-meta">${mode === 'shared' ? '' : `<span class="lang">${esc(item.language || TYPES[item.type].label)}</span>`}${pill(item.visibility)}${mode === 'shared' ? '' : `<span class="time">${ago(item.updated)}</span>`}</span>
    </button>
    <span class="row-actions">${actions}</span>
  </li>`;
}

function preview(item) {
  if (item.type === 'link') return `<div class="card-code prose">${esc(item.url)}\n\n${esc(item.description)}</div>`;
  if (!CODE_TYPES.includes(item.type)) return `<div class="card-code prose">${esc(item.content)}</div>`;
  const lines = item.content.split('\n').slice(0, 7).map((l) => highlightLine(l, item.language)).join('\n');
  return `<div class="card-code">${lines}</div>`;
}

function itemCard(item) {
  const flash = state.flashId === item.id ? ' flash' : '';
  return `<article class="card${flash}" data-open="${item.id}">
    <button class="card-head" data-action="open" data-id="${item.id}">${typeIcon(item.type)}<span class="row-title">${esc(item.title)}</span>${marks(item)}</button>
    ${preview(item)}
    <div class="card-foot"><span>${esc(item.language || TYPES[item.type].label)}</span><span>${ago(item.updated)}</span><span class="grow"></span>${pill(item.visibility)}${copyContentButton(item)}${shareButton(item)}</div>
  </article>`;
}

function emptyState(title, body, action = '') {
  return `<div class="empty"><h3>${esc(title)}</h3><p>${esc(body)}</p>${action}</div>`;
}

function itemList(items, emptyTitle, emptyBody) {
  const visible = items.filter(matchesQuery);
  if (!visible.length) {
    if (state.query.trim()) {
      return emptyState(`No matches for “${state.query.trim()}”`, 'Search looks at titles, descriptions, languages, and tags.',
        '<button class="btn btn-sm" data-action="clear-search">Clear search</button>');
    }
    return emptyState(emptyTitle, emptyBody);
  }
  if (state.list === 'cards') return `<div class="cards">${visible.map(itemCard).join('')}</div>`;
  return `<ul class="rows">${visible.map((i) => itemRow(i)).join('')}</ul>`;
}

function viewToggle() {
  return `<div class="seg view-toggle" role="group" aria-label="Layout">
    <button data-action="set-list" data-list="rows" aria-pressed="${state.list === 'rows'}" aria-label="Rows" title="Rows">${icon('list')}</button>
    <button data-action="set-list" data-list="cards" aria-pressed="${state.list === 'cards'}" aria-label="Code cards" title="Code cards">${icon('layout-grid')}</button>
  </div>`;
}

function listBar(left) {
  return `<div class="list-bar"><div class="list-bar-left">${left}</div>${viewToggle()}</div>`;
}

function seg(kind, x) {
  return `<div class="seg" role="group" aria-label="Who can see it">${Object.entries(VIS).map(([key, v]) => {
    const on = x.visibility === key;
    return `<button data-action="set-vis" data-kind="${kind}" data-id="${x.id}" data-vis="${key}" aria-pressed="${on}" class="${key !== 'PRIVATE' ? 'is-shared' : ''}">${icon(v.icon)}${v.label}</button>`;
  }).join('')}</div>`;
}

function linkBox(kind, x) {
  const url = kind === 'item' ? itemUrl(x) : collUrl(x);
  return `<div class="link-box"><span class="mono-link">${esc(url)}</span>
    <button class="btn btn-sm btn-primary" data-action="copy-link" data-kind="${kind}" data-id="${x.id}">${icon('copy')}Copy link</button></div>`;
}

/* Sidebar */
function navLink({ view, id, type, iconHtml, label, count, current, extra = '' }) {
  const attrs = `data-action="go" data-view="${view}"${id ? ` data-id="${id}"` : ''}${type ? ` data-type="${type}"` : ''}`;
  return `<button class="nav-link" ${attrs}${current ? ' aria-current="page"' : ''}>${iconHtml}<span class="name">${esc(label)}</span>${extra}${count !== undefined ? `<span class="count">${count}</span>` : ''}</button>`;
}

function renderSidebar() {
  const v = state.view;
  const sharedCount = state.items.filter(isShared).length + state.collections.filter(isShared).length;
  const favCount = state.items.filter((i) => i.favorite).length;
  let html = `<div class="nav-group">
    ${navLink({ view: 'home', iconHtml: icon('house'), label: 'Home', count: state.items.length, current: v.name === 'home' })}
    ${navLink({ view: 'shared', iconHtml: icon('share-2'), label: 'Shared', count: sharedCount, current: v.name === 'shared' })}
    ${navLink({ view: 'favorites', iconHtml: icon('star'), label: 'Favorites', count: favCount, current: v.name === 'favorites' })}
  </div>`;

  if (state.sidebar === 'type') {
    html += `<div class="nav-group"><div class="nav-label">Types</div>${TYPE_ORDER.map((t) => navLink({
      view: 'type', type: t,
      iconHtml: `<span style="color:${TYPES[t].hex};display:inline-flex">${icon(TYPES[t].icon)}</span>`,
      label: TYPES[t].plural,
      count: state.items.filter((i) => i.type === t).length,
      current: v.name === 'type' && v.type === t,
    })).join('')}</div>`;
  }

  const colls = state.collections.length
    ? state.collections.map((c) => navLink({
      view: 'collection', id: c.id,
      iconHtml: `<span class="dot" style="background:${dominantColor(c)}"></span>`,
      label: c.name,
      count: c.itemIds.length,
      current: v.name === 'collection' && v.id === c.id,
      extra: isShared(c) ? `<span class="vis" title="${VIS[c.visibility].label}">${icon(VIS[c.visibility].icon)}</span>` : '',
    })).join('')
    : '<p class="nav-label" style="font-weight:400">No collections yet</p>';
  html += `<div class="nav-group"><div class="nav-label">Collections
    <button class="icon-btn" data-action="todo" data-msg="new collection works like it does today" aria-label="New collection">${icon('plus')}</button></div>${colls}</div>`;

  $('#sidebar').innerHTML = html;
}

/* Pages */
function pasteBox() {
  return `<div class="paste">
    <label for="paste" class="sr-only">Paste code, a command, or a link</label>
    <textarea id="paste" spellcheck="false" placeholder="Paste code, a command, or a link">${esc(state.paste)}</textarea>
    <div class="paste-foot">
      <span class="paste-guess" id="paste-guess">${guessHtml()}</span>
      <button class="btn" data-action="save">Save</button>
      <button class="btn btn-primary" data-action="save-share">${icon('share-2')}Save and share</button>
    </div>
  </div>`;
}

function resultBox() {
  const item = findItem(state.result);
  if (!item) return '';
  return `<div class="result" role="status">
    <span style="color:var(--ok);display:inline-flex">${icon('check')}</span>
    <span class="url">${esc(itemUrl(item))}</span>
    <button class="btn btn-sm" data-action="copy-link" data-kind="item" data-id="${item.id}">${icon('copy')}Copy</button>
    ${IMAGE_TYPES.includes(item.type) ? `<button class="btn btn-sm" data-action="todo" data-msg="this opens the snippet image">${icon('image')}Image</button>` : ''}
    <button class="btn btn-sm" data-action="open" data-id="${item.id}">Details</button>
    <button class="icon-btn" data-action="dismiss-result" aria-label="Dismiss">${icon('x')}</button>
  </div>`;
}

function chip(filter, label, count, iconName) {
  const on = state.filter === filter;
  return `<button class="chip" data-action="filter" data-filter="${filter}" aria-pressed="${on}">${iconName ? icon(iconName) : ''}${esc(label)}<span class="n">${count}</span></button>`;
}

function homePage() {
  const items = state.items;
  const isEmpty = !items.length;
  let html = '<div class="page"><h1 class="sr-only">Home</h1>';

  if (isEmpty) {
    html += `<div class="intro"><h2>Start your stash</h2>
      <p>Paste code, a command, or a link. Keep it to yourself, or share it with a link anyone can open.</p></div>`;
  }
  html += pasteBox() + resultBox();

  if (isEmpty) {
    html += `<div class="samples">Try one:
      <button class="chip" data-action="sample" data-sample="snippet">${icon('code')}A snippet</button>
      <button class="chip" data-action="sample" data-sample="command">${icon('terminal')}A command</button>
      <button class="chip" data-action="sample" data-sample="link">${icon('link')}A link</button></div>`;
    return `${html}</div>`;
  }

  const shared = items.filter(isShared);
  const pinned = items.filter((i) => i.pinned);
  let chips = chip('all', 'All', items.length) + chip('shared', 'Shared', shared.length, 'share-2') + chip('pinned', 'Pinned', pinned.length, 'pin');
  if (state.sidebar === 'library') {
    chips += TYPE_ORDER.map((t) => [t, items.filter((i) => i.type === t).length])
      .filter(([, n]) => n)
      .map(([t, n]) => chip(`type:${t}`, TYPES[t].plural, n, TYPES[t].icon)).join('');
  }

  let list = items;
  if (state.filter === 'shared') list = shared;
  else if (state.filter === 'pinned') list = pinned;
  else if (state.filter.startsWith('type:')) list = items.filter((i) => i.type === state.filter.slice(5));

  html += `<div class="list-head"><h2>Your stash</h2><span class="meta">${plural(items.length, 'item')}, ${shared.length} shared</span></div>
    ${listBar(`<div class="chips" role="toolbar" aria-label="Filter your stash">${chips}</div>`)}
    ${itemList(sorted(list), 'Nothing here yet', 'Try another filter.')}`;
  return `${html}</div>`;
}

function typePage(type) {
  const t = TYPES[type];
  const items = sorted(state.items.filter((i) => i.type === type));
  return `<div class="page"><div class="page-head"><div><h1 class="page-title">${t.plural}</h1></div>
    <button class="btn btn-primary" data-action="new-paste">${icon('plus')}New ${t.label.toLowerCase()}</button></div>
    ${listBar(`${plural(items.length, t.label.toLowerCase(), t.plural.toLowerCase())}, ${items.filter(isShared).length} shared`)}
    ${itemList(items, `No ${t.plural.toLowerCase()} yet`, `Paste one on Home and it lands here.`)}</div>`;
}

function sharedPage() {
  const items = sorted(state.items.filter(isShared)).filter(matchesQuery);
  const colls = state.collections.filter(isShared);
  let html = `<div class="page"><div class="page-head"><div><h1 class="page-title">Shared</h1>
    <p class="page-sub">Anyone with one of these links can open it. Public ones can also show up in search engines.</p></div></div>`;

  if (!items.length && !colls.length) {
    html += emptyState('Nothing shared yet', 'Use Share on any row and it shows up here with its link.',
      '<button class="btn btn-sm" data-action="go" data-view="home">Go to your stash</button>');
    return `${html}</div>`;
  }

  html += `<section class="section"><div class="section-head"><h2>Items</h2><span>${items.length}</span></div>
    ${items.length ? `<ul class="rows">${items.map((i) => itemRow(i, 'shared')).join('')}</ul>` : emptyState('No shared items', 'Share one from its row or its details.')}</section>`;

  html += `<section class="section"><div class="section-head"><h2>Collections</h2><span>${colls.length}</span></div>
    ${colls.length ? `<ul class="rows">${colls.map((c) => `<li class="row">
      <button class="row-main" data-action="go" data-view="collection" data-id="${c.id}">
        <span class="type-icon" style="background:${dominantColor(c)}1f;color:${dominantColor(c)}">${icon('folder')}</span>
        <span class="row-text"><span class="row-title">${esc(c.name)}</span><span class="mono-link">${esc(collUrl(c))}</span></span>
        <span class="row-meta"><span class="time" style="width:auto">${plural(c.itemIds.length, 'item')}</span>${pill(c.visibility)}</span>
      </button>
      <span class="row-actions">
        <button class="btn btn-sm btn-quiet share-btn" data-action="copy-link" data-kind="coll" data-id="${c.id}">${icon('link-2')}<span class="lbl">Copy link</span></button>
        <button class="icon-btn" data-action="stop-sharing" data-kind="coll" data-id="${c.id}" aria-label="Stop sharing" title="Stop sharing">${icon('eye-off')}</button>
      </span></li>`).join('')}</ul>` : emptyState('No shared collections', 'Open a collection and pick Unlisted or Public.')}</section>`;
  return `${html}</div>`;
}

function favoritesPage() {
  const items = sorted(state.items.filter((i) => i.favorite));
  return `<div class="page"><div class="page-head"><div><h1 class="page-title">Favorites</h1>
    <p class="page-sub">Items you starred, pinned ones first.</p></div></div>
    ${listBar(plural(items.length, 'item'))}
    ${itemList(items, 'No favorites yet', 'Star an item in its details to keep it here.')}</div>`;
}

function collectionPage(id) {
  const c = findColl(id);
  if (!c) return homePage();
  const items = c.itemIds.map(findItem).filter(Boolean);
  return `<div class="page"><div class="page-head">
      <div><h1 class="page-title">${esc(c.name)}</h1><p class="page-sub">${esc(c.description)}</p></div>
      <div class="share-panel">${seg('coll', c)}${isShared(c) ? linkBox('coll', c) : `<p class="page-sub" style="margin:0">${VIS.PRIVATE.hint} Pick Unlisted to get a link.</p>`}</div>
    </div>
    ${listBar(`${plural(items.length, 'item')}, in the order the public page shows them`)}
    ${itemList(items, 'This collection is empty', 'Add items from their details.')}</div>`;
}

function renderMain() {
  const v = state.view;
  let html;
  if (v.name === 'shared') html = sharedPage();
  else if (v.name === 'favorites') html = favoritesPage();
  else if (v.name === 'collection') html = collectionPage(v.id);
  else if (v.name === 'type') html = typePage(v.type);
  else html = homePage();
  $('#main').innerHTML = html;
}

/* Drawer */
function contentBlock(item) {
  if (item.type === 'link') {
    return `<div class="url-card">${icon('link')}<span class="mono-link">${esc(item.url)}</span>
      <a class="btn btn-sm" href="${esc(item.url)}" target="_blank" rel="noreferrer">${icon('external-link')}Open</a></div>`;
  }
  const head = `<div class="code-head"><span class="grow">${esc(item.language || 'Plain text')}</span>
    <button class="btn btn-sm btn-quiet" data-action="copy-content" data-id="${item.id}">${icon('copy')}Copy</button></div>`;
  if (!CODE_TYPES.includes(item.type)) return `<div class="code">${head}<div class="prose-box">${esc(item.content)}</div></div>`;
  const lines = item.content.split('\n').map((l, n) => `<span class="ln">${n + 1}</span>${highlightLine(l, item.language)}`).join('\n');
  return `<div class="code">${head}<pre>${lines}</pre></div>`;
}

function renderDrawer() {
  const item = findItem(state.drawerId);
  const drawer = $('#drawer');
  if (!item) return;
  const shared = isShared(item);
  const canImage = IMAGE_TYPES.includes(item.type);
  const colls = itemCollections(item);
  const sub = item.language ? `${TYPES[item.type].label} in ${item.language}` : TYPES[item.type].label;

  const imageMenu = canImage ? `<div class="menu-wrap">
      <button class="btn btn-sm" data-action="toggle-menu" data-menu="image" aria-haspopup="menu" aria-expanded="false">${icon('image')}Image${icon('chevron-down')}</button>
      <div class="menu" data-menu-panel="image" role="menu" hidden style="left:0;right:auto">
        <button role="menuitem" data-action="todo" data-msg="this opens the snippet image">${icon('external-link')}Open image</button>
        <button role="menuitem" data-action="todo" data-msg="this downloads the PNG">${icon('download')}Download image</button>
        <button role="menuitem" data-action="todo" data-msg="this copies the PNG">${icon('copy')}Copy image</button>
      </div></div>` : '';

  const shareTools = shared
    ? `${linkBox('item', item)}<div class="share-tools">
        <button class="btn btn-sm" data-action="todo" data-msg="this opens the public page">${icon('external-link')}Open page</button>
        ${item.type !== 'link' ? `<button class="btn btn-sm" data-action="todo" data-msg="this opens the raw text">${icon('file-text')}Raw</button>` : ''}
        ${imageMenu}</div>`
    : `<div class="share-tools"><button class="btn btn-sm btn-primary" data-action="share" data-id="${item.id}">${icon('share-2')}Share with a link</button>${imageMenu}</div>`;

  drawer.innerHTML = `<div class="drawer-head">${typeIcon(item.type)}
      <div class="grow"><h2 id="drawer-title">${esc(item.title)}</h2><div class="sub">${esc(sub)}</div></div>
      <button class="icon-btn" data-action="close-drawer" aria-label="Close">${icon('x')}</button></div>
    <div class="drawer-body">
      <section class="share-block" aria-label="Sharing">${seg('item', item)}<p class="hint">${VIS[item.visibility].hint}</p>${shareTools}</section>
      <div class="drawer-actions">
        <button class="btn btn-sm${item.favorite ? ' is-fav' : ''}" data-action="toggle-fav" data-id="${item.id}" aria-pressed="${item.favorite}">${icon('star')}Favorite</button>
        <button class="btn btn-sm${item.pinned ? ' is-pin' : ''}" data-action="toggle-pin" data-id="${item.id}" aria-pressed="${item.pinned}">${icon('pin')}Pin</button>
        <button class="btn btn-sm" data-action="todo" data-msg="editing works like it does today">${icon('pencil')}Edit</button>
        <span class="spacer"></span>
        <div class="menu-wrap">
          <button class="icon-btn" data-action="toggle-menu" data-menu="more" aria-haspopup="menu" aria-expanded="false" aria-label="More">${icon('ellipsis')}</button>
          <div class="menu" data-menu-panel="more" role="menu" hidden>
            <button role="menuitem" data-action="todo" data-msg="adding to a collection works like it does today">${icon('folder-plus')}Add to collection</button>
            <button role="menuitem" data-action="todo" data-msg="delete asks for confirmation like it does today">${icon('trash-2')}Delete</button>
          </div>
        </div>
      </div>
      ${item.description ? `<p style="margin:0 0 14px;color:var(--muted)">${esc(item.description)}</p>` : ''}
      ${contentBlock(item)}
      <dl class="details">
        <dt>Tags</dt><dd>${item.tags.length ? item.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('') : '<span style="color:var(--faint)">None</span>'}</dd>
        <dt>Collections</dt><dd>${colls.length ? colls.map((c) => `<button class="coll-tag" data-action="go" data-view="collection" data-id="${c.id}"><span class="dot" style="background:${dominantColor(c)};width:7px;height:7px"></span>${esc(c.name)}</button>`).join('') : '<span style="color:var(--faint)">None</span>'}</dd>
        <dt>Created</dt><dd>${daysAgo(item.created)}</dd>
        <dt>Updated</dt><dd>${ago(item.updated)} ago</dd>
      </dl>
    </div>`;
}

function openDrawer(id, trigger) {
  state.drawerId = id;
  state.drawerReturn = trigger || document.activeElement;
  closeMenus();
  renderDrawer();
  const drawer = $('#drawer');
  drawer.hidden = false;
  requestAnimationFrame(() => {
    document.body.classList.add('drawer-open');
    drawer.querySelector('[data-action="close-drawer"]').focus();
  });
}

function closeDrawer() {
  if (!state.drawerId) return;
  const id = state.drawerId;
  state.drawerId = null;
  document.body.classList.remove('drawer-open');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => { if (!state.drawerId) $('#drawer').hidden = true; }, reduced ? 0 : 200);
  const back = state.drawerReturn && document.contains(state.drawerReturn)
    ? state.drawerReturn
    : document.querySelector(`[data-action="open"][data-id="${id}"]`);
  back?.focus();
}

/* Rendering with focus kept on the same control */
function focusKey(el) {
  if (!el || !el.dataset) return null;
  return ['action', 'id', 'vis', 'kind', 'filter', 'view', 'type', 'menu', 'list'].map((k) => el.dataset[k] || '').join('|');
}

function render() {
  const active = document.activeElement;
  const key = active?.dataset?.action ? focusKey(active) : null;
  const activeId = active?.dataset?.id;
  renderSidebar();
  renderMain();
  if (state.drawerId) renderDrawer();
  state.flashId = null;
  if (!key) return;
  const match = [...document.querySelectorAll('[data-action]')].find((el) => focusKey(el) === key);
  const fallback = activeId && (document.querySelector(`#drawer [data-id="${activeId}"][data-action="share"], #drawer [data-id="${activeId}"][data-action="copy-link"]`)
    || document.querySelector(`[data-action="open"][data-id="${activeId}"]`));
  (match || fallback)?.focus();
}

/* Feedback */
function toast(message, kind = 'ok') {
  const el = document.createElement('div');
  el.className = `toast${kind === 'info' ? ' is-info' : ''}`;
  el.innerHTML = `${icon(kind === 'info' ? 'info' : 'check')}<span>${esc(message)}</span>`;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), kind === 'info' ? 3200 : 2400);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch { /* file:// pages can refuse the clipboard; the toast still explains what would happen */ }
}

function closeMenus() {
  document.querySelectorAll('.menu').forEach((m) => { m.hidden = true; });
  document.querySelectorAll('[data-action="toggle-menu"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
}

function setSidebar(open) {
  document.body.classList.toggle('sidebar-open', open);
  if (open) $('#sidebar').querySelector('.nav-link')?.focus();
}

/* Actions */
function saveFromPaste(share) {
  const g = guess(state.paste);
  if (!g) {
    state.pasteError = 'Paste something first';
    $('#paste-guess').innerHTML = guessHtml();
    $('#paste').focus();
    return;
  }
  const item = {
    id: `n${Date.now()}`, type: g.type, title: g.title, description: '', language: g.language,
    content: g.content, url: g.url, visibility: share ? 'UNLISTED' : 'PRIVATE', shortId: randomId(),
    pinned: false, favorite: false, tags: [], updated: 0, created: 0,
  };
  state.items.unshift(item);
  state.paste = '';
  state.pasteError = '';
  state.flashId = item.id;
  state.filter = 'all';
  state.query = '';
  $('#search').value = '';
  if (share) {
    state.result = item.id;
    copyText(itemUrl(item));
    toast('Saved and shared. Link copied.');
  } else {
    state.result = null;
    toast('Saved to your stash');
  }
  render();
  $('#paste').focus();
}

function setVisibility(kind, id, visibility, message) {
  const x = kind === 'item' ? findItem(id) : findColl(id);
  if (!x || x.visibility === visibility) return;
  x.visibility = visibility;
  if (kind === 'item' && visibility === 'PRIVATE' && state.result === id) state.result = null;
  render();
  toast(message || `Now ${VIS[visibility].label.toLowerCase()}`);
}

function flipCopied(button) {
  if (!button?.classList.contains('icon-btn')) return;
  const before = button.innerHTML;
  button.innerHTML = icon('check');
  button.classList.add('is-on');
  setTimeout(() => { button.innerHTML = before; button.classList.remove('is-on'); }, 1500);
}

const ACTIONS = {
  go(el) {
    state.view = { name: el.dataset.view, id: el.dataset.id, type: el.dataset.type };
    if (state.view.name !== 'home') state.result = null;
    closeDrawer();
    setSidebar(false);
    render();
    window.scrollTo(0, 0);
    $('#main').focus({ preventScroll: true });
  },
  filter(el) {
    state.filter = el.dataset.filter;
    render();
  },
  'set-list'(el) {
    state.list = el.dataset.list;
    render();
  },
  open(el) {
    openDrawer(el.dataset.id, el);
  },
  'close-drawer'() {
    closeDrawer();
  },
  share(el) {
    const item = findItem(el.dataset.id);
    copyText(itemUrl(item));
    setVisibility('item', item.id, 'UNLISTED', 'Shared with a link. Link copied.');
  },
  'copy-link'(el) {
    const x = el.dataset.kind === 'item' ? findItem(el.dataset.id) : findColl(el.dataset.id);
    copyText(el.dataset.kind === 'item' ? itemUrl(x) : collUrl(x));
    toast('Link copied');
  },
  'copy-content'(el) {
    const item = findItem(el.dataset.id);
    copyText(item.type === 'link' ? item.url : item.content);
    flipCopied(el);
    toast(item.type === 'link' ? 'URL copied' : 'Copied');
  },
  'set-vis'(el) {
    setVisibility(el.dataset.kind, el.dataset.id, el.dataset.vis);
  },
  'stop-sharing'(el) {
    setVisibility(el.dataset.kind, el.dataset.id, 'PRIVATE', 'Stopped sharing. The link no longer works.');
  },
  'toggle-fav'(el) {
    const item = findItem(el.dataset.id);
    item.favorite = !item.favorite;
    render();
    toast(item.favorite ? 'Added to favorites' : 'Removed from favorites');
  },
  'toggle-pin'(el) {
    const item = findItem(el.dataset.id);
    item.pinned = !item.pinned;
    render();
    toast(item.pinned ? 'Pinned to the top' : 'Unpinned');
  },
  todo(el) {
    closeMenus();
    toast(`Not in the mockup: ${el.dataset.msg}`, 'info');
  },
  'toggle-menu'(el) {
    const panel = el.parentElement.querySelector(`[data-menu-panel="${el.dataset.menu}"]`);
    const willOpen = panel.hidden;
    closeMenus();
    panel.hidden = !willOpen;
    el.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) panel.querySelector('button')?.focus();
  },
  save() {
    saveFromPaste(false);
  },
  'save-share'() {
    saveFromPaste(true);
  },
  sample(el) {
    state.paste = SAMPLES[el.dataset.sample];
    state.pasteError = '';
    $('#paste').value = state.paste;
    $('#paste-guess').innerHTML = guessHtml();
    $('#paste').focus();
  },
  'new-paste'() {
    closeMenus();
    closeDrawer();
    state.view = { name: 'home' };
    render();
    window.scrollTo(0, 0);
    $('#paste').focus();
  },
  'dismiss-result'() {
    state.result = null;
    render();
    $('#paste').focus();
  },
  'clear-search'() {
    state.query = '';
    $('#search').value = '';
    render();
    $('#search').focus();
  },
  'open-sidebar'() {
    setSidebar(true);
  },
  'close-sidebar'() {
    setSidebar(false);
  },
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('.menu-wrap')) closeMenus();
  const el = e.target.closest('[data-action]');
  if (el) {
    e.preventDefault();
    ACTIONS[el.dataset.action]?.(el);
    return;
  }
  const row = e.target.closest('[data-open]');
  if (row) openDrawer(row.dataset.open, row.querySelector('[data-action="open"]'));
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'paste') {
    state.paste = e.target.value;
    state.pasteError = '';
    $('#paste-guess').innerHTML = guessHtml();
  } else if (e.target.id === 'search') {
    state.query = e.target.value;
    renderMain();
  }
});

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    $('#search').focus();
    $('#search').select();
    return;
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && e.target.id === 'paste') {
    e.preventDefault();
    saveFromPaste(e.shiftKey);
    return;
  }
  if (e.key === 'Escape') {
    const openMenu = document.querySelector('.menu:not([hidden])');
    if (openMenu) {
      const trigger = openMenu.parentElement.querySelector('[data-action="toggle-menu"]');
      closeMenus();
      trigger?.focus();
    } else if (state.drawerId) closeDrawer();
    else if (document.body.classList.contains('sidebar-open')) setSidebar(false);
    return;
  }
  if (e.key === 'Tab' && state.drawerId) {
    const focusable = [...$('#drawer').querySelectorAll('button, a[href], textarea, input, select')]
      .filter((el) => !el.disabled && el.offsetParent !== null);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

['sidebar', 'data'].forEach((key) => {
  $(`#opt-${key}`).addEventListener('change', (e) => {
    state[key] = e.target.value;
    if (key === 'data') loadData();
    if (key === 'sidebar') {
      if (state.view.name === 'type') state.view = { name: 'home' };
      if (state.filter.startsWith('type:')) state.filter = 'all';
    }
    render();
  });
});

document.querySelectorAll('[data-i]').forEach((el) => { el.outerHTML = icon(el.dataset.i); });
if (/Mac|iPhone|iPad/.test(navigator.platform)) $('#search-kbd').textContent = '⌘K';
loadData();
render();
