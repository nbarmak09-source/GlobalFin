-- AlterTable
ALTER TABLE "WatchlistItem" ADD COLUMN     "group_id" TEXT;

-- CreateTable
CREATE TABLE "WatchlistGroup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WatchlistGroup_userId_idx" ON "WatchlistGroup"("userId");

-- CreateIndex
CREATE INDEX "WatchlistItem_group_id_idx" ON "WatchlistItem"("group_id");

-- AddForeignKey
ALTER TABLE "WatchlistGroup" ADD CONSTRAINT "WatchlistGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "WatchlistGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
