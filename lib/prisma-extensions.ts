import { Prisma } from '@prisma/client'

/**
 * Common query extensions for better performance
 */

// Reusable where clause to filter out soft-deleted records
export const notDeleted = {
  deletedAt: null,
} as const

// Select minimal fields for list views (reduces data transfer)
export const minimalPlanningSelect = {
  id: true,
  planningId: true,
  projectName: true,
  clientName: true,
  clientBudget: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PlanningSelect

export const minimalQuotationSelect = {
  id: true,
  quotationId: true,
  companyName: true,
  productionDate: true,
  totalAmount: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.QuotationSelect

export const minimalInvoiceSelect = {
  id: true,
  invoiceId: true,
  companyName: true,
  productionDate: true,
  totalAmount: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.InvoiceSelect

export const minimalExpenseSelect = {
  id: true,
  expenseId: true,
  projectName: true,
  productionDate: true,
  clientBudget: true,
  paidAmount: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ExpenseSelect

