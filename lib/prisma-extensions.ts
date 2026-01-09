/**
 * Common query extensions for better performance
 */

// Reusable where clause to filter out soft-deleted records
export const notDeleted = {
  deletedAt: null,
} as const

