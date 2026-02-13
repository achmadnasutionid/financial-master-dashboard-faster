import { prisma } from "@/lib/prisma"
import { generateId } from "@/lib/id-generator"

/**
 * Sync tracker with entity data
 * 
 * Creates or updates a production tracker based on entity creation/update.
 * This ensures the tracker is always in sync with the latest entity data.
 * 
 * Business Logic:
 * - If tracker with same projectName exists → UPDATE (date, totalAmount, invoiceId)
 * - If tracker doesn't exist → CREATE new tracker
 * - ProductAmounts always empty {} (user fills manually)
 * - Status always "pending" on creation
 * - Preserves user's manual work (productAmounts, expense, notes)
 * 
 * @param data - Tracker sync data
 * @returns The created or updated tracker
 */
export async function syncTracker(data: {
  projectName: string
  date: Date
  totalAmount: number
  invoiceId?: string | null
  subtotal?: number
}): Promise<any> {
  // Check if tracker exists with same projectName
  const existingTracker = await prisma.productionTracker.findFirst({
    where: {
      projectName: data.projectName,
      deletedAt: null
    }
  })

  if (existingTracker) {
    // UPDATE existing tracker - only date, totalAmount, invoiceId
    // Preserve user's work: productAmounts, expense, notes, status
    const updateData: any = {
      date: data.date,
      totalAmount: data.totalAmount,
    }

    // Only update subtotal if provided
    if (data.subtotal !== undefined) {
      updateData.subtotal = data.subtotal
    }

    // Only update invoiceId if provided (for invoices)
    if (data.invoiceId !== undefined) {
      updateData.invoiceId = data.invoiceId
    }

    return await prisma.productionTracker.update({
      where: { id: existingTracker.id },
      data: updateData
    })
  } else {
    // CREATE new tracker
    const trackerId = await generateId('PT', 'productionTracker')
    
    return await prisma.productionTracker.create({
      data: {
        trackerId,
        expenseId: '', // Will be filled when invoice is paid
        invoiceId: data.invoiceId || null,
        projectName: data.projectName,
        date: data.date,
        subtotal: data.subtotal || 0,
        totalAmount: data.totalAmount,
        expense: 0, // Will be calculated from productAmounts
        productAmounts: {}, // Empty - user fills manually in tracker
        notes: null,
        status: 'pending' // Default status
      }
    })
  }
}

/**
 * Update tracker when entity billTo/projectName changes
 * 
 * Renames the tracker projectName to match the entity's new name.
 * This keeps the tracker in sync when user edits the entity name.
 * 
 * @param oldProjectName - Previous project name
 * @param newProjectName - New project name
 * @param date - Updated production date
 * @param totalAmount - Updated total amount
 * @param invoiceId - Invoice ID (optional, for invoices)
 */
export async function updateTrackerName(
  oldProjectName: string,
  newProjectName: string,
  date: Date,
  totalAmount: number,
  invoiceId?: string | null
): Promise<void> {
  // Find tracker with old name
  const tracker = await prisma.productionTracker.findFirst({
    where: {
      projectName: oldProjectName,
      deletedAt: null
    }
  })

  if (tracker) {
    // Update tracker with new name and data
    await prisma.productionTracker.update({
      where: { id: tracker.id },
      data: {
        projectName: newProjectName,
        date: date,
        totalAmount: totalAmount,
        invoiceId: invoiceId !== undefined ? invoiceId : undefined
      }
    })
  }
}
