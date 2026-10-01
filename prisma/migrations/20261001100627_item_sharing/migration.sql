-- AlterTable
ALTER TABLE "items" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "shortId" TEXT,
ADD COLUMN     "visibility" "CollectionVisibility" NOT NULL DEFAULT 'PRIVATE';

-- Backfill shortId with the phase 1 loop: the lateral join yields eight rows per item so random()
-- runs once per character. An id already held by another item, or by a collection, counts as a
-- duplicate and is regenerated, so /s/{shortId} never resolves two things.
DO $$
BEGIN
  LOOP
    UPDATE "items" AS i
    SET "shortId" = s.short_id
    FROM (
      SELECT i2.id,
             string_agg(substr('abcdefghijklmnopqrstuvwxyz0123456789', 1 + floor(random() * 36)::int, 1), '' ORDER BY g) AS short_id
      FROM "items" AS i2
      CROSS JOIN LATERAL generate_series(1, 8) AS g
      WHERE i2."shortId" IS NULL
         OR i2."shortId" IN (SELECT "shortId" FROM "items" GROUP BY "shortId" HAVING count(*) > 1)
         OR i2."shortId" IN (SELECT "shortId" FROM "collections")
      GROUP BY i2.id
    ) AS s
    WHERE s.id = i.id;

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM "items" WHERE "shortId" IS NULL
      UNION ALL
      SELECT 1 FROM "items" GROUP BY "shortId" HAVING count(*) > 1
      UNION ALL
      SELECT 1 FROM "items" WHERE "shortId" IN (SELECT "shortId" FROM "collections")
    );
  END LOOP;
END $$;

-- Lock in the backfill.
ALTER TABLE "items" ALTER COLUMN "shortId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "items_shortId_key" ON "items"("shortId");
