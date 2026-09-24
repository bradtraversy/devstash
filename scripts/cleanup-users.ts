import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { isLocalDatabaseUrl } from '../src/lib/local-db'

const DEMO_EMAIL = 'demo@devstash.io'

async function main() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set')
    process.exit(1)
  }

  // This script deletes every non-demo account. It only runs against a local database and only with --yes.
  if (!isLocalDatabaseUrl(connectionString)) {
    console.error('Refusing to run: DATABASE_URL does not point at a local development database.')
    process.exit(1)
  }

  if (!process.argv.includes('--yes')) {
    console.error('This deletes every user except the demo account. Re-run with --yes to confirm.')
    process.exit(1)
  }

  console.log('Connecting to database...')

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    // Count users before cleanup
    const totalUsersBefore = await prisma.user.count()
    const usersToDelete = await prisma.user.count({
      where: { email: { not: DEMO_EMAIL } },
    })

    console.log(`\nTotal users: ${totalUsersBefore}`)
    console.log(`Users to delete (excluding ${DEMO_EMAIL}): ${usersToDelete}`)

    // Reset demo user's Stripe fields
    await prisma.user.updateMany({
      where: { email: DEMO_EMAIL },
      data: {
        isPro: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      },
    })
    console.log(`\nReset Stripe fields for ${DEMO_EMAIL}`)

    if (usersToDelete === 0) {
      console.log('\nNo users to delete. Only the demo user exists.')
      return
    }

    // Get details of users to be deleted
    const users = await prisma.user.findMany({
      where: { email: { not: DEMO_EMAIL } },
      select: {
        id: true,
        email: true,
        name: true,
        _count: {
          select: {
            items: true,
            collections: true,
          },
        },
      },
    })

    console.log('\nUsers to be deleted:')
    for (const user of users) {
      console.log(
        `  - ${user.email} (${user.name || 'No name'}) - ${user._count.items} items, ${user._count.collections} collections`
      )
    }

    // Delete verification tokens for non-demo users
    const deletedTokens = await prisma.verificationToken.deleteMany({
      where: {
        identifier: { not: DEMO_EMAIL },
      },
    })
    console.log(`\nDeleted ${deletedTokens.count} verification tokens`)

    // Delete all users except demo (cascades to items, collections, accounts, sessions)
    const result = await prisma.user.deleteMany({
      where: { email: { not: DEMO_EMAIL } },
    })

    console.log(`Deleted ${result.count} users (and their content via cascade)`)

    // Clean up orphaned tags (tags not associated with any items)
    const orphanedTags = await prisma.tag.deleteMany({
      where: {
        items: { none: {} },
      },
    })
    console.log(`Deleted ${orphanedTags.count} orphaned tags`)

    // Verify final state
    const totalUsersAfter = await prisma.user.count()
    const [items, collections, tags] = await Promise.all([
      prisma.item.count(),
      prisma.collection.count(),
      prisma.tag.count(),
    ])

    console.log('\nFinal counts:')
    console.log(`  Users: ${totalUsersAfter}`)
    console.log(`  Items: ${items}`)
    console.log(`  Collections: ${collections}`)
    console.log(`  Tags: ${tags}`)

    console.log('\nCleanup complete!')
  } catch (error) {
    console.error('Cleanup failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main()
