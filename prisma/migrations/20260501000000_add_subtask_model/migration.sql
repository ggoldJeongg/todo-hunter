-- CreateTable
CREATE TABLE "SubTask" (
    "id" SERIAL NOT NULL,
    "quest_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubTask_quest_id_idx" ON "SubTask"("quest_id");

-- AddForeignKey
ALTER TABLE "SubTask" ADD CONSTRAINT "SubTask_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
