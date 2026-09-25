# DevStash

A developer knowledge hub for snippets, commands, prompts, notes, files, images, links and custom types.

## Context Files

Read the following to get the full context of the project:

- @context/project-overview.md
- @context/coding-standards.md
- @context/ai-interaction.md
- @context/current-feature.md

## Commands

- **Dev server**: `npm run dev` (runs on http://localhost:3000)
- **Build**: `npm run build`
- **Production server**: `npm run start`
- **Lint**: `npm run lint`
- **Test**: `npm run test` (single run)
- **Test watch**: `npm run test:watch`

## Neon Database

Production runs on the Neon project `devstash` (ID: `shiny-math-70461865`, Postgres 18, us-east-1), branch `production`, database `neondb`.

**IMPORTANT:** Never run queries or migrations against the Neon production branch unless explicitly instructed to do so. When using the Neon MCP tools, work on a non-production branch.

Local development uses the Docker Postgres 18 container `devstash-db` on `localhost:5432` (the `DATABASE_URL` in `.env`), restored from a production dump. Use it for all local database work, including `prisma migrate dev`.

**IMPORTANT:** Do not add Claude to any commit messages
