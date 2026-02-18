-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "adjustmentPercentage" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "adjustmentNotes" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "adjustmentPercentage" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "adjustmentNotes" TEXT;

-- AlterTable
ALTER TABLE "ParagonTicket" ADD COLUMN IF NOT EXISTS "adjustmentPercentage" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "adjustmentNotes" TEXT;

-- AlterTable
ALTER TABLE "ErhaTicket" ADD COLUMN IF NOT EXISTS "adjustmentPercentage" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "adjustmentNotes" TEXT;
