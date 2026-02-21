-- AlterTable
ALTER TABLE "ParagonTicket" ADD COLUMN IF NOT EXISTS "bastContactPerson" TEXT;
ALTER TABLE "ParagonTicket" ADD COLUMN IF NOT EXISTS "bastContactPosition" TEXT;

-- AlterTable
ALTER TABLE "ErhaTicket" ADD COLUMN IF NOT EXISTS "bastContactPerson" TEXT;
ALTER TABLE "ErhaTicket" ADD COLUMN IF NOT EXISTS "bastContactPosition" TEXT;
