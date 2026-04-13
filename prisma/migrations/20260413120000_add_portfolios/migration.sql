-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Portfolio_userId_idx" ON "Portfolio"("userId");

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Position" ADD COLUMN "portfolio_id" TEXT;

-- CreateIndex
CREATE INDEX "Position_portfolio_id_idx" ON "Position"("portfolio_id");

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
