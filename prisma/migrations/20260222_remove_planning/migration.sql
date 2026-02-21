-- Drop Quotation -> Planning relation
ALTER TABLE "Quotation" DROP CONSTRAINT IF EXISTS "Quotation_sourcePlanningId_fkey";
ALTER TABLE "Quotation" DROP COLUMN IF EXISTS "sourcePlanningId";

-- Drop Invoice.planningId
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "planningId";

-- Drop Expense planning fields
ALTER TABLE "Expense" DROP COLUMN IF EXISTS "planningId";
ALTER TABLE "Expense" DROP COLUMN IF EXISTS "planningNumber";
ALTER TABLE "Expense" DROP COLUMN IF EXISTS "planningClientName";

-- Drop Planning models
DROP TABLE IF EXISTS "PlanningItem";
DROP TABLE IF EXISTS "Planning";
