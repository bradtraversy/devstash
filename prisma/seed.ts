import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, ContentType } from '../src/generated/prisma/client'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const systemItemTypes = [
  { name: 'snippet', icon: 'Code', color: '#3b82f6', isSystem: true },
  { name: 'prompt', icon: 'Sparkles', color: '#8b5cf6', isSystem: true },
  { name: 'command', icon: 'Terminal', color: '#f97316', isSystem: true },
  { name: 'note', icon: 'StickyNote', color: '#fde047', isSystem: true },
  { name: 'file', icon: 'File', color: '#6b7280', isSystem: true },
  { name: 'image', icon: 'Image', color: '#ec4899', isSystem: true },
  { name: 'link', icon: 'Link', color: '#10b981', isSystem: true },
]

async function main() {
  console.log('🌱 Starting seed...\n')

  // ============================================
  // 1. SEED SYSTEM ITEM TYPES
  // ============================================
  console.log('📦 Seeding system item types...')
  const itemTypeMap: Record<string, string> = {}

  for (const type of systemItemTypes) {
    const existing = await prisma.itemType.findFirst({
      where: {
        name: type.name,
        userId: null,
        isSystem: true,
      },
    })

    if (!existing) {
      const created = await prisma.itemType.create({
        data: {
          name: type.name,
          icon: type.icon,
          color: type.color,
          isSystem: type.isSystem,
        },
      })
      itemTypeMap[type.name] = created.id
      console.log(`   ✓ Created: ${type.name}`)
    } else {
      itemTypeMap[type.name] = existing.id
      console.log(`   • Already exists: ${type.name}`)
    }
  }

  // ============================================
  // 2. CREATE DEMO USER
  // ============================================
  console.log('\n👤 Creating demo user...')
  const hashedPassword = await bcrypt.hash('12345678', 12)

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@devstash.io' },
    update: {},
    create: {
      email: 'demo@devstash.io',
      name: 'Demo User',
      password: hashedPassword,
      isPro: false,
      emailVerified: new Date(),
    },
  })
  console.log(`   ✓ Demo user: ${demoUser.email}`)

  // ============================================
  // 2b. CLEAN UP EXISTING DEMO USER DATA
  // ============================================
  console.log('\n🧹 Cleaning up existing demo user data...')

  const deletedItems = await prisma.item.deleteMany({
    where: { userId: demoUser.id },
  })
  console.log(`   ✓ Deleted ${deletedItems.count} existing items`)

  const deletedCollections = await prisma.collection.deleteMany({
    where: { userId: demoUser.id },
  })
  console.log(`   ✓ Deleted ${deletedCollections.count} existing collections`)

  // ============================================
  // 3. CREATE COLLECTIONS
  // ============================================
  console.log('\n📁 Creating collections...')

  const reactPatternsCollection = await prisma.collection.create({
    data: {
      name: 'React Patterns',
      description: 'Reusable React patterns and hooks',
      userId: demoUser.id,
      defaultTypeId: itemTypeMap['snippet'],
      isFavorite: true,
    },
  })
  console.log(`   ✓ ${reactPatternsCollection.name}`)

  const aiWorkflowsCollection = await prisma.collection.create({
    data: {
      name: 'AI Workflows',
      description: 'AI prompts and workflow automations',
      userId: demoUser.id,
      defaultTypeId: itemTypeMap['prompt'],
      isFavorite: true,
    },
  })
  console.log(`   ✓ ${aiWorkflowsCollection.name}`)

  const devopsCollection = await prisma.collection.create({
    data: {
      name: 'DevOps',
      description: 'Infrastructure and deployment resources',
      userId: demoUser.id,
    },
  })
  console.log(`   ✓ ${devopsCollection.name}`)


  // ============================================
  // 4. CREATE ITEMS
  // ============================================
  console.log('\n📝 Creating items...')

  // --- React Patterns (3 snippets) ---
  const useDebounceSnippet = await prisma.item.create({
    data: {
      title: 'useDebounce Hook',
      contentType: ContentType.TEXT,
      content: `import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}`,
      description: 'A custom hook that debounces a value by a specified delay. Useful for search inputs and API calls.',
      language: 'typescript',
      userId: demoUser.id,
      itemTypeId: itemTypeMap['snippet'],
      isPinned: true,
    },
  })
  console.log(`   ✓ ${useDebounceSnippet.title}`)

  const useLocalStorageSnippet = await prisma.item.create({
    data: {
      title: 'useLocalStorage Hook',
      contentType: ContentType.TEXT,
      content: `import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}`,
      description: 'Persist state to localStorage with SSR support.',
      language: 'typescript',
      userId: demoUser.id,
      itemTypeId: itemTypeMap['snippet'],
    },
  })
  console.log(`   ✓ ${useLocalStorageSnippet.title}`)

  const compoundComponentSnippet = await prisma.item.create({
    data: {
      title: 'Compound Component Pattern',
      contentType: ContentType.TEXT,
      content: `import { createContext, useContext, useState, ReactNode } from 'react';

interface AccordionContextType {
  openItems: string[];
  toggle: (id: string) => void;
}

const AccordionContext = createContext<AccordionContextType | null>(null);

function useAccordion() {
  const context = useContext(AccordionContext);
  if (!context) throw new Error('useAccordion must be used within Accordion');
  return context;
}

interface AccordionProps {
  children: ReactNode;
  multiple?: boolean;
}

export function Accordion({ children, multiple = false }: AccordionProps) {
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggle = (id: string) => {
    setOpenItems((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      return multiple ? [...prev, id] : [id];
    });
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggle }}>
      <div className="accordion">{children}</div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps {
  id: string;
  title: string;
  children: ReactNode;
}

Accordion.Item = function AccordionItem({ id, title, children }: AccordionItemProps) {
  const { openItems, toggle } = useAccordion();
  const isOpen = openItems.includes(id);

  return (
    <div className="accordion-item">
      <button onClick={() => toggle(id)}>{title}</button>
      {isOpen && <div className="accordion-content">{children}</div>}
    </div>
  );
};`,
      description: 'Flexible compound component pattern with context for building accessible UI components.',
      language: 'typescript',
      userId: demoUser.id,
      itemTypeId: itemTypeMap['snippet'],
    },
  })
  console.log(`   ✓ ${compoundComponentSnippet.title}`)

  // --- AI Workflows (3 prompts) ---
  const codeReviewPrompt = await prisma.item.create({
    data: {
      title: 'Code Review Assistant',
      contentType: ContentType.TEXT,
      content: `You are a senior software engineer performing a code review. Analyze the provided code and give feedback on:

1. **Code Quality**: Is the code clean, readable, and well-organized?
2. **Best Practices**: Does it follow language/framework conventions?
3. **Performance**: Are there any potential performance issues?
4. **Security**: Are there any security vulnerabilities?
5. **Testing**: Is the code testable? What tests would you recommend?

Format your response with specific line references and actionable suggestions. Be constructive and explain the reasoning behind each suggestion.

Code to review:
\`\`\`
{{code}}
\`\`\``,
      description: 'Comprehensive code review prompt for catching issues and improving code quality.',
      userId: demoUser.id,
      itemTypeId: itemTypeMap['prompt'],
      isFavorite: true,
    },
  })
  console.log(`   ✓ ${codeReviewPrompt.title}`)

  const docGenerationPrompt = await prisma.item.create({
    data: {
      title: 'Documentation Generator',
      contentType: ContentType.TEXT,
      content: `Generate comprehensive documentation for the following code. Include:

1. **Overview**: Brief description of what this code does
2. **Parameters/Props**: Document all inputs with types and descriptions
3. **Return Value**: What the function/component returns
4. **Usage Examples**: 2-3 practical examples showing how to use this
5. **Edge Cases**: Important edge cases or limitations to be aware of

Use JSDoc format for functions and markdown for components.

Code to document:
\`\`\`
{{code}}
\`\`\``,
      description: 'Generate JSDoc and markdown documentation from code.',
      userId: demoUser.id,
      itemTypeId: itemTypeMap['prompt'],
    },
  })
  console.log(`   ✓ ${docGenerationPrompt.title}`)

  const refactoringPrompt = await prisma.item.create({
    data: {
      title: 'Refactoring Assistant',
      contentType: ContentType.TEXT,
      content: `Analyze the following code and suggest refactoring improvements. Focus on:

1. **DRY Principle**: Identify repeated code that can be extracted
2. **Single Responsibility**: Functions/components doing too much
3. **Naming**: Variables, functions, or components with unclear names
4. **Complexity**: Simplify nested conditionals or complex logic
5. **Modern Patterns**: Suggest modern language features or patterns

For each suggestion:
- Show the original code
- Show the refactored version
- Explain the benefit

Code to refactor:
\`\`\`
{{code}}
\`\`\``,
      description: 'Get actionable refactoring suggestions with before/after examples.',
      userId: demoUser.id,
      itemTypeId: itemTypeMap['prompt'],
    },
  })
  console.log(`   ✓ ${refactoringPrompt.title}`)

  // --- DevOps (1 snippet, 1 command, 2 links) ---
  const dockerComposeSnippet = await prisma.item.create({
    data: {
      title: 'Docker Compose - Node.js + PostgreSQL',
      contentType: ContentType.TEXT,
      content: `version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/myapp
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=myapp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:`,
      description: 'Production-ready Docker Compose setup for Node.js applications with PostgreSQL.',
      language: 'yaml',
      userId: demoUser.id,
      itemTypeId: itemTypeMap['snippet'],
    },
  })
  console.log(`   ✓ ${dockerComposeSnippet.title}`)

  const deployCommand = await prisma.item.create({
    data: {
      title: 'Deploy to Production',
      contentType: ContentType.TEXT,
      content: `git pull origin main && npm ci && npm run build && pm2 restart all`,
      description: 'Quick deployment script: pull latest changes, install deps, build, and restart PM2 processes.',
      userId: demoUser.id,
      itemTypeId: itemTypeMap['command'],
    },
  })
  console.log(`   ✓ ${deployCommand.title}`)

  const dockerDocsLink = await prisma.item.create({
    data: {
      title: 'Docker Documentation',
      contentType: ContentType.URL,
      url: 'https://docs.docker.com/',
      description: 'Official Docker documentation - containers, images, compose, and more.',
      userId: demoUser.id,
      itemTypeId: itemTypeMap['link'],
    },
  })
  console.log(`   ✓ ${dockerDocsLink.title}`)

  const githubActionsLink = await prisma.item.create({
    data: {
      title: 'GitHub Actions Documentation',
      contentType: ContentType.URL,
      url: 'https://docs.github.com/en/actions',
      description: 'CI/CD workflows with GitHub Actions - automate builds, tests, and deployments.',
      userId: demoUser.id,
      itemTypeId: itemTypeMap['link'],
    },
  })
  console.log(`   ✓ ${githubActionsLink.title}`)

  // --- Terminal Commands (4 commands) ---
  const gitUndoCommand = await prisma.item.create({
    data: {
      title: 'Git Undo Last Commit (Keep Changes)',
      contentType: ContentType.TEXT,
      content: `git reset --soft HEAD~1`,
      description: 'Undo the last commit but keep all changes staged. Perfect for fixing commit messages or adding forgotten files.',
      userId: demoUser.id,
      itemTypeId: itemTypeMap['command'],
      isPinned: true,
    },
  })
  console.log(`   ✓ ${gitUndoCommand.title}`)

  const dockerCleanupCommand = await prisma.item.create({
    data: {
      title: 'Docker Cleanup',
      contentType: ContentType.TEXT,
      content: `docker system prune -af --volumes`,
      description: 'Remove all unused Docker resources: stopped containers, unused networks, dangling images, and volumes.',
      userId: demoUser.id,
      itemTypeId: itemTypeMap['command'],
    },
  })
  console.log(`   ✓ ${dockerCleanupCommand.title}`)

  const killPortCommand = await prisma.item.create({
    data: {
      title: 'Kill Process on Port',
      contentType: ContentType.TEXT,
      content: `lsof -ti:3000 | xargs kill -9`,
      description: 'Find and kill any process running on port 3000. Change the port number as needed.',
      userId: demoUser.id,
      itemTypeId: itemTypeMap['command'],
    },
  })
  console.log(`   ✓ ${killPortCommand.title}`)

  const npmOutdatedCommand = await prisma.item.create({
    data: {
      title: 'Check Outdated Packages',
      contentType: ContentType.TEXT,
      content: `npm outdated --long`,
      description: 'List all outdated npm packages with current, wanted, and latest versions plus package type.',
      userId: demoUser.id,
      itemTypeId: itemTypeMap['command'],
    },
  })
  console.log(`   ✓ ${npmOutdatedCommand.title}`)

  // --- Design Resources (4 links) ---
  const tailwindDocsLink = await prisma.item.create({
    data: {
      title: 'Tailwind CSS Documentation',
      contentType: ContentType.URL,
      url: 'https://tailwindcss.com/docs',
      description: 'Official Tailwind CSS docs - utility classes, configuration, and best practices.',
      userId: demoUser.id,
      itemTypeId: itemTypeMap['link'],
      isFavorite: true,
    },
  })
  console.log(`   ✓ ${tailwindDocsLink.title}`)

  const shadcnLink = await prisma.item.create({
    data: {
      title: 'shadcn/ui Components',
      contentType: ContentType.URL,
      url: 'https://ui.shadcn.com/',
      description: 'Beautiful, accessible components built with Radix UI and Tailwind CSS.',
      userId: demoUser.id,
      itemTypeId: itemTypeMap['link'],
    },
  })
  console.log(`   ✓ ${shadcnLink.title}`)

  const radixLink = await prisma.item.create({
    data: {
      title: 'Radix UI Primitives',
      contentType: ContentType.URL,
      url: 'https://www.radix-ui.com/primitives',
      description: 'Unstyled, accessible UI primitives for building design systems.',
      userId: demoUser.id,
      itemTypeId: itemTypeMap['link'],
    },
  })
  console.log(`   ✓ ${radixLink.title}`)

  const lucideLink = await prisma.item.create({
    data: {
      title: 'Lucide Icons',
      contentType: ContentType.URL,
      url: 'https://lucide.dev/icons/',
      description: 'Beautiful, consistent open-source icons. Fork of Feather Icons with more icons.',
      userId: demoUser.id,
      itemTypeId: itemTypeMap['link'],
    },
  })
  console.log(`   ✓ ${lucideLink.title}`)

  // ============================================
  // 5. LINK ITEMS TO COLLECTIONS
  // ============================================
  console.log('\n🔗 Linking items to collections...')

  // React Patterns
  await prisma.itemCollection.createMany({
    data: [
      { itemId: useDebounceSnippet.id, collectionId: reactPatternsCollection.id },
      { itemId: useLocalStorageSnippet.id, collectionId: reactPatternsCollection.id },
      { itemId: compoundComponentSnippet.id, collectionId: reactPatternsCollection.id },
    ],
  })
  console.log(`   ✓ React Patterns: 3 items`)

  // AI Workflows
  await prisma.itemCollection.createMany({
    data: [
      { itemId: codeReviewPrompt.id, collectionId: aiWorkflowsCollection.id },
      { itemId: docGenerationPrompt.id, collectionId: aiWorkflowsCollection.id },
      { itemId: refactoringPrompt.id, collectionId: aiWorkflowsCollection.id },
    ],
  })
  console.log(`   ✓ AI Workflows: 3 items`)

  // DevOps
  await prisma.itemCollection.createMany({
    data: [
      { itemId: dockerComposeSnippet.id, collectionId: devopsCollection.id },
      { itemId: deployCommand.id, collectionId: devopsCollection.id },
      { itemId: dockerDocsLink.id, collectionId: devopsCollection.id },
      { itemId: githubActionsLink.id, collectionId: devopsCollection.id },
    ],
  })
  console.log(`   ✓ DevOps: 4 items`)


  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n✅ Seed completed successfully!')
  console.log('\n📊 Summary:')
  console.log(`   • 7 system item types`)
  console.log(`   • 1 demo user (demo@devstash.io / 12345678)`)
  console.log(`   • 3 collections`)
  console.log(`   • 17 items total`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
