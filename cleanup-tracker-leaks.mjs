/**
 * Clean up leaked tracker data from production database
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupTrackerLeaks() {
  console.log('🧹 Cleaning up leaked tracker data from production...\n')

  try {
    // Find all test trackers
    const trackers = await prisma.productionTracker.findMany({
      where: {
        OR: [
          { projectName: { contains: 'Test' } },
          { projectName: { contains: 'test' } },
          { projectName: { contains: 'TEST' } },
          { projectName: { contains: 'UniqueTest' } },
          { trackerId: { contains: 'TEST-' } }
        ],
        deletedAt: null
      },
      select: {
        id: true,
        trackerId: true,
        projectName: true,
        expenseId: true
      }
    })

    console.log(`📊 Found ${trackers.length} test trackers to clean\n`)

    for (const tracker of trackers) {
      console.log(`Deleting: ${tracker.projectName} (${tracker.trackerId})`)
      
      // Delete the tracker
      await prisma.productionTracker.delete({
        where: { id: tracker.id }
      })
      
      console.log(`  ✓ Deleted tracker`)
      
      // Check if there's an associated expense
      const expense = await prisma.expense.findUnique({
        where: { expenseId: tracker.expenseId },
        select: { id: true, projectName: true }
      })
      
      if (expense) {
        console.log(`  Found linked expense: ${expense.projectName}`)
        // Delete expense items first
        await prisma.expenseItem.deleteMany({
          where: { expenseId: expense.id }
        })
        // Delete the expense
        await prisma.expense.delete({
          where: { id: expense.id }
        })
        console.log(`  ✓ Deleted expense`)
      }
      
      console.log()
    }

    console.log('✅ Cleanup completed successfully!')
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupTrackerLeaks()
