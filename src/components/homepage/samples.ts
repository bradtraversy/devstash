import type { PublicCollection, PublicSharedItem } from "@/lib/db/public";

// Fictional examples for the homepage and its generated images; the handle and ids never resolve.

const EXAMPLE_DATE = new Date("2026-10-01T12:00:00Z");

export const DISPLAY_ORIGIN = "devstash.io";

export const SAMPLE_ITEM: PublicSharedItem = {
  id: "sample-item",
  title: "useDebounce hook",
  description: "Holds back a fast-changing value, like a search box, until the typing stops.",
  content: `import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
`,
  url: null,
  language: "typescript",
  fileUrl: null,
  fileName: null,
  fileSize: null,
  itemType: { name: "snippet", icon: "Code", color: "#3b82f6" },
  shortId: "k3j9x2ab",
  visibility: "PUBLIC",
  publishedAt: EXAMPLE_DATE,
  updatedAt: EXAMPLE_DATE,
  handle: "sam",
};

export const SAMPLE_NOTE: PublicSharedItem = {
  id: "sample-ship-note",
  title: "Ship checklist",
  description: "What to run before shipping, and the CI that checks it.",
  content: `##### Build and test

Install from the lockfile and run every check before you push.

\`\`\`bash
npm ci
npm run verify
\`\`\`

##### Check pushes to main

Add the workflow so each push to \`main\` runs the same checks.

\`\`\`yaml
on:
  push:
    branches: [main]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: npm ci && npm run verify
\`\`\`
`,
  url: null,
  language: null,
  fileUrl: null,
  fileName: null,
  fileSize: null,
  itemType: { name: "note", icon: "StickyNote", color: "#fde047" },
  shortId: "n7c4p1qe",
  visibility: "PUBLIC",
  publishedAt: EXAMPLE_DATE,
  updatedAt: EXAMPLE_DATE,
  handle: "sam",
};

export const SAMPLE_COLLECTION: PublicCollection = {
  id: "sample-collection",
  name: "Docker Essentials",
  description: "The Docker commands and configs I reach for on every project.",
  slug: "docker-essentials",
  shortId: "p7m2q9wd",
  visibility: "PUBLIC",
  publishedAt: EXAMPLE_DATE,
  updatedAt: EXAMPLE_DATE,
  contentUpdatedAt: EXAMPLE_DATE,
  handle: "sam",
  itemCount: 3,
  items: [
    {
      id: "sample-command",
      title: "Run Postgres locally",
      description: null,
      content: "$ docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=pg postgres:18",
      url: null,
      language: null,
      fileUrl: null,
      fileName: null,
      fileSize: null,
      itemType: { name: "command", icon: "Terminal", color: "#f97316" },
    },
    {
      id: "sample-compose",
      title: "docker-compose.yml",
      description: null,
      content: `services:
  db:
    image: postgres:18
    environment:
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
`,
      url: null,
      language: "yaml",
      fileUrl: null,
      fileName: null,
      fileSize: null,
      itemType: { name: "snippet", icon: "Code", color: "#3b82f6" },
    },
    {
      id: "sample-note",
      title: "Cleanup checklist",
      description: null,
      content: `- \`docker ps -a\` to find stopped containers
- \`docker system prune\` to clear unused images and networks
- Never prune volumes without a backup
`,
      url: null,
      language: null,
      fileUrl: null,
      fileName: null,
      fileSize: null,
      itemType: { name: "note", icon: "StickyNote", color: "#fde047" },
    },
  ],
};

/** Brad's real public collection, for the "See a real one" link. */
export const LIVE_EXAMPLE_PATH = "/traversymedia/devops";
