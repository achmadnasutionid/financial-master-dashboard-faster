/**
 * Check for leaked tracker data in production database
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkTrackerLeaks() {
  console.log('🔍 Checking for leaked tracker data in production...\n')

  try {
    // Check for test trackers
    const trackers = await prisma.productionTracker.findMany({
      where: {
        OR: [
          { projectName: { contains: 'Test' } },
          { projectName: { contains: 'test' } },
          { projectName: { contains: 'TEST' } },
          { projectName: { contains: 'UniqueTest' } },
          { trackerId: { contains: 'TEST-' } }
        ],
        deletedAt: null // Only active ones
      },
      select: {
        id: true,
        trackerId: true,
        projectName: true,
        expenseId: true,
        invoiceId: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`📊 Found ${trackers.length} test trackers in production:\n`)
    
    trackers.forEach((tracker, index) => {
      console.log(`${index + 1}. ${tracker.projectName}`)
      console.log(`   Tracker ID: ${tracker.trackerId}`)
      console.log(`   Expense ID: ${tracker.expenseId}`)
      console.log(`   Invoice ID: ${tracker.invoiceId || 'null'}`)
      console.log(`   Created: ${tracker.createdAt}`)
      console.log(`   DB ID: ${tracker.id}`)
      console.log()
    })

    if (trackers.length > 0) {
      console.log('⚠️  These trackers should be cleaned up!')
    } else {
      console.log('✅ No leaked tracker data found!')
    }

  } catch (error) {
    console.error('❌ Error checking trackers:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTrackerLeaks()
