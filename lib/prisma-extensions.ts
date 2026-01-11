/**
 * Common query extensions for better performance
 */

// Reusable where clause to filter out soft-deleted records
export const notDeleted = {
  deletedAt: null,
} as const

// Models that use soft delete
export const SOFT_DELETE_MODELS = [
  'Company',
  'Billing',
  'Signature',
  'Product',
  'Planning',
  'Quotation',
  'Invoice',
  'Expense',
  'ParagonTicket',
  'ErhaTicket',
  'GearExpense',
  'BigExpense',
  'QuotationTemplate',
] as const

export type SoftDeleteModel = typeof SOFT_DELETE_MODELS[number]

/**
 * Check if a model uses soft delete
 */
export function usesSoftDelete(modelName: string): boolean {
  return SOFT_DELETE_MODELS.includes(modelName as SoftDeleteModel)
}

