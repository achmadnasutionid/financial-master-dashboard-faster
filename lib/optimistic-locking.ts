/**
 * Optimistic Locking Utilities
 * 
 * Provides version-based conflict detection for concurrent edits.
 * Uses the existing `updatedAt` field as a version indicator.
 */

export class OptimisticLockError extends Error {
  constructor(message: string = "This record was modified by another user. Please refresh and try again.") {
    super(message)
    this.name = "OptimisticLockError"
  }
}

/**
 * Check if a record has been modified since the client last loaded it
 * @param lastKnownUpdatedAt - The updatedAt timestamp the client has
 * @param currentUpdatedAt - The current updatedAt from the database
 * @returns true if record is stale (modified by another user)
 */
export function isRecordStale(lastKnownUpdatedAt: Date | string, currentUpdatedAt: Date | string): boolean {
  const lastKnown = new Date(lastKnownUpdatedAt).getTime()
  const current = new Date(currentUpdatedAt).getTime()
  return lastKnown < current
}

/**
 * Verify the record hasn't been modified before updating
 * Throws OptimisticLockError if stale
 * @param lastKnownUpdatedAt - The updatedAt timestamp the client has
 * @param currentRecord - The current record from the database
 */
export function verifyRecordVersion(
  lastKnownUpdatedAt: Date | string | undefined, 
  currentRecord: { updatedAt: Date } | null
): void {
  // If no version check requested, skip
  if (!lastKnownUpdatedAt) return
  
  // If record doesn't exist, can't check
  if (!currentRecord) return
  
  if (isRecordStale(lastKnownUpdatedAt, currentRecord.updatedAt)) {
    throw new OptimisticLockError()
  }
}

/**
 * Middleware to add version checking to API routes
 * Usage in route handler:
 * 
 * const body = await request.json()
 * const current = await prisma.model.findUnique({ where: { id } })
 * verifyRecordVersion(body.updatedAt, current)
 * // ... proceed with update
 */
