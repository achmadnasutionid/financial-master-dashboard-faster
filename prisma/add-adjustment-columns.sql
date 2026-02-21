-- Add columns if missing (safe to run multiple times)
ALTER TABLE "ParagonTicket" ADD COLUMN IF NOT EXISTS "adjustmentPercentage" DOUBLE PRECISION;
ALTER TABLE "ParagonTicket" ADD COLUMN IF NOT EXISTS "adjustmentNotes" TEXT;
ALTER TABLE "ErhaTicket" ADD COLUMN IF NOT EXISTS "adjustmentPercentage" DOUBLE PRECISION;
ALTER TABLE "ErhaTicket" ADD COLUMN IF NOT EXISTS "adjustmentNotes" TEXT;
