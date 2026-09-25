import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    // Migrations need a session-level advisory lock, which Neon's pooler cannot release reliably; use the direct endpoint when one is configured.
    url: process.env.DIRECT_DATABASE_URL || env('DATABASE_URL'),
  },
})
