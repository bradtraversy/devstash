-- Public collections phase 1: visibility, slugs, short ids, handles, item positions, slug history.
-- New required columns start nullable, are backfilled below, then get NOT NULL and their unique
-- constraints, so the constraints prove the backfill produced unique values.

-- CreateEnum
CREATE TYPE "CollectionVisibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- AlterTable
ALTER TABLE "collections" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "shortId" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "visibility" "CollectionVisibility" NOT NULL DEFAULT 'PRIVATE';

-- AlterTable
ALTER TABLE "item_collections" ADD COLUMN     "position" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "handle" TEXT;

-- CreateTable
CREATE TABLE "collection_slug_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "oldSlug" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_slug_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collection_slug_history_collectionId_idx" ON "collection_slug_history"("collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "collection_slug_history_userId_oldSlug_key" ON "collection_slug_history"("userId", "oldSlug");

-- AddForeignKey
ALTER TABLE "collection_slug_history" ADD CONSTRAINT "collection_slug_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_slug_history" ADD CONSTRAINT "collection_slug_history_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- System item types are unique by name (audit T5-9). Prisma cannot express a partial index,
-- so this lives only in SQL.
CREATE UNIQUE INDEX "item_types_system_name_key" ON "item_types"("name") WHERE "userId" IS NULL;

-- Backfill shortId. The lateral join yields eight rows per collection, so random() runs once per
-- character; an uncorrelated subquery would run once and give every row the same id. The loop
-- regenerates any duplicates before the unique index goes on.
DO $$
BEGIN
  LOOP
    UPDATE "collections" AS c
    SET "shortId" = s.short_id
    FROM (
      SELECT c2.id,
             string_agg(substr('abcdefghijklmnopqrstuvwxyz0123456789', 1 + floor(random() * 36)::int, 1), '' ORDER BY g) AS short_id
      FROM "collections" AS c2
      CROSS JOIN LATERAL generate_series(1, 8) AS g
      WHERE c2."shortId" IS NULL
         OR c2."shortId" IN (SELECT "shortId" FROM "collections" GROUP BY "shortId" HAVING count(*) > 1)
      GROUP BY c2.id
    ) AS s
    WHERE s.id = c.id;

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM "collections" WHERE "shortId" IS NULL
      UNION ALL
      SELECT 1 FROM "collections" GROUP BY "shortId" HAVING count(*) > 1
    );
  END LOOP;
END $$;

-- Backfill slug from name with the same rule as slugify() in src/lib/slugs.ts: lowercase, runs
-- outside [a-z0-9] become one hyphen, hyphens trimmed, cut to 63. Empty or reserved names fall
-- back to "collection".
UPDATE "collections" AS c
SET "slug" = CASE
  WHEN s.base = '' OR s.base IN ('raw', 'new', 'edit') THEN 'collection'
  ELSE s.base
END
FROM (
  SELECT id, rtrim(left(trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')), 63), '-') AS base
  FROM "collections"
) AS s
WHERE s.id = c.id;

-- Make slugs unique per user. Walking in creation order and checking only rows earlier in the
-- walk gives each collection the slug createCollection would have given it at the time, so the
-- oldest keeps the bare slug and a later name that already ends in -2 gets its own suffix.
DO $$
DECLARE
  rec RECORD;
  candidate TEXT;
  n INTEGER;
BEGIN
  FOR rec IN SELECT id, "userId", "slug", "createdAt" FROM "collections" ORDER BY "createdAt", id LOOP
    candidate := rec.slug;
    n := 2;
    WHILE EXISTS (
      SELECT 1 FROM "collections"
      WHERE "userId" = rec."userId" AND "slug" = candidate
        AND ("createdAt", id) < (rec."createdAt", rec.id)
    ) LOOP
      candidate := rtrim(left(rec.slug, 63 - length('-' || n)), '-') || '-' || n;
      n := n + 1;
    END LOOP;
    IF candidate <> rec.slug THEN
      UPDATE "collections" SET "slug" = candidate WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;

-- Backfill handle from the email local part with the same slugify rule. Reserved handles are the
-- top-level app routes plus the names the public routes need; empty or reserved fall back to "user".
UPDATE "users" AS u
SET "handle" = CASE
  WHEN s.base = '' OR s.base IN (
    'api', 'collections', 'dashboard', 'favorites', 'items', 'profile', 'settings', 'upgrade',
    'sign-in', 'register', 'forgot-password', 'reset-password', 'verify-email',
    's', 'search', 'new', 'edit', 'login', 'logout', 'auth', 'admin', 'static', 'public', '_next'
  ) THEN 'user'
  ELSE s.base
END
FROM (
  SELECT id, rtrim(left(trim(both '-' from regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9]+', '-', 'g')), 63), '-') AS base
  FROM "users"
) AS s
WHERE s.id = u.id;

-- Make handles unique across all users the same way, oldest account first.
DO $$
DECLARE
  rec RECORD;
  candidate TEXT;
  n INTEGER;
BEGIN
  FOR rec IN SELECT id, "handle", "createdAt" FROM "users" ORDER BY "createdAt", id LOOP
    candidate := rec.handle;
    n := 2;
    WHILE EXISTS (
      SELECT 1 FROM "users"
      WHERE "handle" = candidate AND ("createdAt", id) < (rec."createdAt", rec.id)
    ) LOOP
      candidate := rtrim(left(rec.handle, 63 - length('-' || n)), '-') || '-' || n;
      n := n + 1;
    END LOOP;
    IF candidate <> rec.handle THEN
      UPDATE "users" SET "handle" = candidate WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;

-- Backfill position as the order items were added; itemId breaks ties so the result is deterministic.
UPDATE "item_collections" AS ic
SET "position" = s.pos
FROM (
  SELECT "itemId", "collectionId",
         (row_number() OVER (PARTITION BY "collectionId" ORDER BY "addedAt", "itemId") - 1)::int AS pos
  FROM "item_collections"
) AS s
WHERE s."itemId" = ic."itemId" AND s."collectionId" = ic."collectionId";

-- Lock in the backfills.
ALTER TABLE "collections" ALTER COLUMN "shortId" SET NOT NULL,
ALTER COLUMN "slug" SET NOT NULL;

ALTER TABLE "item_collections" ALTER COLUMN "position" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "collections_shortId_key" ON "collections"("shortId");

-- CreateIndex
CREATE UNIQUE INDEX "collections_userId_slug_key" ON "collections"("userId", "slug");

-- CreateIndex
CREATE INDEX "item_collections_collectionId_position_idx" ON "item_collections"("collectionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "users_handle_key" ON "users"("handle");
