<p align="center">
  <img src="public/brand/devstash-lockup.svg" alt="DevStash" width="320" />
</p>

<p align="center">
  Stash it. Share it.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

> [!IMPORTANT]
> **Here for the [Coding With AI](https://www.traversymedia.com/coding-with-ai) course?** This repository is under active development and has changed a lot since the course was recorded: features have been added, changed, and removed, and the code on `main` no longer matches the lessons. To follow along, switch to the **`course-final`** tag, which holds the code exactly as it was at the end of the course.
>
> - **On GitHub:** open the branch menu (it says `main`), choose the **Tags** tab, and select **`course-final`**.
> - **With git:** `git clone --branch course-final https://github.com/bradtraversy/devstash.git`
> - **As a ZIP:** download the [Course version release](https://github.com/bradtraversy/devstash/releases/tag/course-final).
>
> The docs, spec files, and other course resources are in the [course resources repo](https://github.com/bradtraversy/coding-with-ai-course-resources).

<p align="center">
  <img src="course-tag.png" alt="The GitHub branch menu with the Tags tab open and the course-final tag listed" width="416" />
</p>

## What DevStash is

DevStash is a place to keep the snippets, commands, prompts, notes, and links you reuse, and to share any of them with one link. Everything is private until you share it. A shared snippet gets a short link that never changes, plus a raw version for `curl` and a clean image of the whole thing; a collection can be published as one ordered page. It runs at [devstash.io](https://devstash.io).

<p align="center">
  <img src="screen.png" alt="The DevStash homepage: Stash it. Share it., with a snippet shared as a link and an image" width="800" />
</p>

## Features

**Sharing**
- Share any snippet, command, note, or prompt at a short link: `devstash.io/s/{id}`
- Add `/raw` for plain text (`curl -s https://devstash.io/s/{id}/raw`) or `.png` for an image of the whole snippet
- Publish a collection as one ordered page at `devstash.io/{handle}/{slug}`, with `.md` for the same collection as markdown
- Every link unfurls into a preview card with the code on it in Slack, X, Discord, and iMessage
- Save to your stash: copy someone else's shared snippet or collection into your own account

**Your stash**
- Snippets, prompts, commands, notes, and links, private by default
- Collections, pins, favorites, and tags
- Monaco code editor and a markdown editor, with highlighting for 30 languages
- Cmd+K search across titles and content
- AI helpers: tag suggestions, descriptions, code explanations, and a prompt optimizer
- Export everything as Markdown or JSON, and import from a JSON export

**Under the hood**
- Email and password or GitHub sign-in, with email verification and password reset
- Rate limiting on the auth endpoints and AI requests
- Images and preview cards rendered on the server with Shiki highlighting and `next/og`
- A Pro plan with Stripe billing and file and image uploads is built but disabled; set `NEXT_PUBLIC_PRO_ENABLED=true` to turn it back on

## Tech Stack

| Category      | Technology                                   |
| ------------- | -------------------------------------------- |
| Framework     | Next.js 16 / React 19                        |
| Language      | TypeScript 5                                 |
| Database      | PostgreSQL (Neon in production, Docker locally) |
| ORM           | Prisma 7                                     |
| Auth          | NextAuth v5 (JWT)                            |
| Styling       | Tailwind CSS v4 + shadcn/ui                  |
| Highlighting  | Shiki, Monaco                                |
| Images        | `next/og` (Satori)                           |
| AI            | OpenAI (`gpt-5-nano`)                        |
| Rate limiting | Upstash Redis                                |
| Email         | Resend                                       |
| File storage  | Cloudflare R2 (disabled)                     |
| Payments      | Stripe (disabled)                            |
| Testing       | Vitest                                       |

## Getting Started

### Prerequisites

- Node.js 20.19 or later
- npm
- PostgreSQL: a local Docker container or a [Neon](https://neon.tech) database

### Installation

```bash
git clone https://github.com/bradtraversy/devstash.git
cd devstash
npm install
```

### Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
| -------- | ----------- |
| `NEXT_PUBLIC_APP_URL` | App URL (default `http://localhost:3001`) |
| `NEXT_PUBLIC_PRO_ENABLED` | `true` turns on the Pro plan, billing, and file and image items; off when empty |
| `DATABASE_URL` | PostgreSQL connection string |
| `DIRECT_DATABASE_URL` | Direct (non-pooler) Neon connection for `prisma migrate`; leave empty for a local database |
| `AUTH_URL` | Base URL NextAuth uses for redirects (default `http://localhost:3001`) |
| `AUTH_SECRET` | NextAuth secret (generate with `npx auth secret`) |
| `AUTH_GITHUB_ID` | GitHub OAuth app ID (optional, for GitHub sign-in) |
| `AUTH_GITHUB_SECRET` | GitHub OAuth app secret (optional) |
| `RESEND_API_KEY` | Resend API key for verification and reset emails |
| `SKIP_EMAIL_VERIFICATION` | `true` skips email verification in development |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL for rate limiting (required in production) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `OPENAI_API_KEY` | OpenAI API key for the AI helpers |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID (disabled; only for Pro file uploads) |
| `R2_ACCESS_KEY_ID` | R2 access key (disabled) |
| `R2_SECRET_ACCESS_KEY` | R2 secret key (disabled) |
| `R2_BUCKET_NAME` | R2 bucket name (disabled) |
| `R2_PUBLIC_URL` | R2 public URL (disabled) |
| `STRIPE_SECRET_KEY` | Stripe secret key (disabled; only for Pro billing) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (disabled) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (disabled) |
| `STRIPE_PRICE_ID_MONTHLY` | Stripe monthly price ID (disabled) |
| `STRIPE_PRICE_ID_YEARLY` | Stripe yearly price ID (disabled) |

### Database Setup

To run PostgreSQL locally with Docker:

```bash
docker run -d --name devstash-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:18
```

Point `DATABASE_URL` at it (for example `postgresql://postgres:postgres@localhost:5432/postgres`), then apply the migrations and seed the system item types:

```bash
npx prisma migrate dev
npm run db:seed
```

### Run

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start the dev server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run the tests once |
| `npm run test:watch` | Run the tests in watch mode |
| `npm run verify` | Typecheck, lint, test, and build in one go |
| `npm run db:migrate` | Create and run migrations |
| `npm run db:seed` | Seed the system item types |
| `npm run db:studio` | Open Prisma Studio |

## Quality Gate

`npm run verify` runs the typecheck, lint, unit tests, and production build in one command. A pre-push hook (installed by `npm install` through the `prepare` script) refuses any push that fails it, and the GitHub Actions workflow in `.github/workflows/ci.yml` runs the same command on every push and pull request, against a Postgres service container with the migrations applied.

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Sign-in, register, verify, password reset
│   ├── [handle]/[slug]/ # Public collection pages, raw markdown, preview cards
│   ├── s/[shortId]/     # Short links: shared items, raw text, image, preview card
│   ├── api/             # Route handlers (items, export, upload, download, auth, stripe)
│   ├── collections/     # Collections list and detail pages
│   ├── dashboard/       # Main dashboard
│   ├── favorites/       # Favorites page
│   ├── items/           # Items by type (/items/snippets, and so on)
│   ├── profile/         # Profile and usage
│   ├── settings/        # Editor, handle, data, and account settings
│   └── page.tsx         # Marketing homepage
├── actions/             # Server actions (items, collections, save to stash, AI, import)
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── homepage/        # Marketing page sections
│   ├── public/          # Public item and collection views
│   ├── items/           # Item cards, drawer, dialogs
│   ├── collections/     # Collection cards and dialogs
│   ├── layout/          # Sidebar, top bar, user menu
│   └── shared/          # Reusable components
├── lib/
│   ├── db/              # Prisma queries
│   ├── og/              # Preview card and snippet image rendering
│   ├── public/          # Public paths, highlighting, markdown
│   ├── plans.ts         # The Pro switch
│   ├── rate-limit.ts    # Upstash rate limits
│   └── r2.ts            # Cloudflare R2 utilities
├── hooks/               # Custom React hooks
└── types/               # TypeScript type definitions
```

## License

This project is licensed under the [MIT License](LICENSE).
