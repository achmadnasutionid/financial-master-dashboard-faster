-- CreateTable
CREATE TABLE "ProductionTracker" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "projectName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "productAmounts" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionTracker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionTracker_trackerId_key" ON "ProductionTracker"("trackerId");

-- CreateIndex
CREATE INDEX "ProductionTracker_trackerId_idx" ON "ProductionTracker"("trackerId");

-- CreateIndex
CREATE INDEX "ProductionTracker_expenseId_idx" ON "ProductionTracker"("expenseId");

-- CreateIndex
CREATE INDEX "ProductionTracker_invoiceId_idx" ON "ProductionTracker"("invoiceId");

-- CreateIndex
CREATE INDEX "ProductionTracker_date_idx" ON "ProductionTracker"("date");

-- CreateIndex
CREATE INDEX "ProductionTracker_deletedAt_idx" ON "ProductionTracker"("deletedAt");

-- CreateIndex
CREATE INDEX "ProductionTracker_date_deletedAt_idx" ON "ProductionTracker"("date", "deletedAt");
