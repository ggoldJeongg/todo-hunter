ALTER TABLE "SuccessDay" ADD COLUMN "cycle_key" TEXT;

UPDATE "SuccessDay" AS sd
SET "cycle_key" = CASE
    WHEN q."is_weekly" THEN 'weekly:' || to_char(date_trunc('week', sd."created_at"), 'YYYY-MM-DD')
    ELSE 'daily:' || to_char(sd."created_at", 'YYYY-MM-DD')
END
FROM "Quest" AS q
WHERE q."id" = sd."quest_id";

DELETE FROM "SuccessDay" AS sd
USING (
    SELECT
        "id",
        row_number() OVER (
            PARTITION BY "quest_id", "cycle_key"
            ORDER BY "created_at" ASC, "id" ASC
        ) AS duplicate_order
    FROM "SuccessDay"
) AS duplicates
WHERE sd."id" = duplicates."id"
  AND duplicates.duplicate_order > 1;

ALTER TABLE "SuccessDay" ALTER COLUMN "cycle_key" SET NOT NULL;

CREATE UNIQUE INDEX "SuccessDay_quest_id_cycle_key_key"
ON "SuccessDay"("quest_id", "cycle_key");
