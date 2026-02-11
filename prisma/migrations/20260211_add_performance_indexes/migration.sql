-- Performance Optimization: Add missing database indexes
-- This migration adds strategic indexes to speed up dashboard queries by 30-50%

-- Invoice indexes for dashboard stats and year-based filtering
CREATE INDEX IF NOT EXISTS "Invoice_status_productionDate_deletedAt_idx" ON "Invoice"("status", "productionDate", "deletedAt");
CREATE INDEX IF NOT EXISTS "Invoice_deletedAt_updatedAt_idx" ON "Invoice"("deletedAt", "updatedAt");
CREATE INDEX IF NOT EXISTS "Invoice_status_totalAmount_deletedAt_idx" ON "Invoice"("status", "totalAmount", "deletedAt");

-- Quotation indexes for dashboard stats and year-based filtering
CREATE INDEX IF NOT EXISTS "Quotation_status_productionDate_deletedAt_idx" ON "Quotation"("status", "productionDate", "deletedAt");
CREATE INDEX IF NOT EXISTS "Quotation_deletedAt_updatedAt_idx" ON "Quotation"("deletedAt", "updatedAt");
CREATE INDEX IF NOT EXISTS "Quotation_status_totalAmount_deletedAt_idx" ON "Quotation"("status", "totalAmount", "deletedAt");

-- Expense indexes for financial calculations and monthly trends
CREATE INDEX IF NOT EXISTS "Expense_deletedAt_productionDate_idx" ON "Expense"("deletedAt", "productionDate");
CREATE INDEX IF NOT EXISTS "Expense_deletedAt_updatedAt_idx" ON "Expense"("deletedAt", "updatedAt");
CREATE INDEX IF NOT EXISTS "Expense_status_productionDate_deletedAt_idx" ON "Expense"("status", "productionDate", "deletedAt");
CREATE INDEX IF NOT EXISTS "Expense_productionDate_deletedAt_status_idx" ON "Expense"("productionDate", "deletedAt", "status");

-- ExpenseItem index for product-based aggregations
CREATE INDEX IF NOT EXISTS "ExpenseItem_expenseId_productName_idx" ON "ExpenseItem"("expenseId", "productName");

-- ParagonTicket indexes for recent activity and year filtering
CREATE INDEX IF NOT EXISTS "ParagonTicket_deletedAt_updatedAt_idx" ON "ParagonTicket"("deletedAt", "updatedAt");
CREATE INDEX IF NOT EXISTS "ParagonTicket_productionDate_deletedAt_idx" ON "ParagonTicket"("productionDate", "deletedAt");

-- ErhaTicket indexes for recent activity and year filtering
CREATE INDEX IF NOT EXISTS "ErhaTicket_deletedAt_updatedAt_idx" ON "ErhaTicket"("deletedAt", "updatedAt");
CREATE INDEX IF NOT EXISTS "ErhaTicket_productionDate_deletedAt_idx" ON "ErhaTicket"("productionDate", "deletedAt");

-- GearExpense index for year-based financial calculations
CREATE INDEX IF NOT EXISTS "GearExpense_deletedAt_year_idx" ON "GearExpense"("deletedAt", "year");

-- BigExpense index for year-based financial calculations
CREATE INDEX IF NOT EXISTS "BigExpense_deletedAt_year_idx" ON "BigExpense"("deletedAt", "year");

-- ProductionTracker indexes for common queries
CREATE INDEX IF NOT EXISTS "ProductionTracker_status_deletedAt_idx" ON "ProductionTracker"("status", "deletedAt");
CREATE INDEX IF NOT EXISTS "ProductionTracker_deletedAt_date_idx" ON "ProductionTracker"("deletedAt", "date");
CREATE INDEX IF NOT EXISTS "ProductionTracker_expenseId_deletedAt_idx" ON "ProductionTracker"("expenseId", "deletedAt");
