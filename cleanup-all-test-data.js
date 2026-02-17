import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function cleanupAllTestData() {
  console.log('🧹 Comprehensive test data cleanup...\n')

  // Expanded patterns to catch more test data
  const testPatterns = [
    // Original patterns
    'TEST',
    'RACE_',
    'API_',
    'PT-9999',
    // New patterns from integration tests
    'Valid Change',
    'User A Change',
    'User B Change',
    'Save 1',
    'Save 2',
    'Performance',
    'UPSERT',
    'Complex',
    'Simple',
    // Generic test patterns
    'Auto-save',
    'AutoSave',
    'Concurrent',
    'Integration Test',
    'Test Client',
    'Test Project',
    'Test Expense',
    'Manual Test',
    'Update Test',
    'Delete Test',
    'JSON Test',
    'API Test',
    'Status Update Test',
    'Status Paid Test',
    'API Status Test',
    'Invoice ID Update Test',
    'API Invoice ID Test',
    'Status Auto-Create',
    'Invoice Link Test',
    'Generated Entry',
    'Manual Entry',
    'Tracker Sync Test',
    'Updated Client'
  ]

  // Build OR conditions for Prisma
  const buildTestConditions = (field) => {
    return testPatterns.map(pattern => ({
      [field]: { contains: pattern, mode: 'insensitive' }
    }))
  }

  try {
    // Find and delete Production Trackers
    const testTrackers = await prisma.productionTracker.findMany({
      where: {
        OR: buildTestConditions('projectName'),
        deletedAt: null
      },
      select: {
        id: true,
        trackerId: true,
        projectName: true,
        createdAt: true
      }
    })

    console.log(`📊 Found ${testTrackers.length} test trackers`)
    
    if (testTrackers.length > 0) {
      for (const tracker of testTrackers) {
        await prisma.productionTracker.update({
          where: { id: tracker.id },
          data: { deletedAt: new Date() }
        })
        console.log(`   ✓ Deleted: ${tracker.trackerId} - "${tracker.projectName}"`)
      }
    }

    // Find and delete Invoices
    const testInvoices = await prisma.invoice.findMany({
      where: {
        OR: [
          ...buildTestConditions('billTo'),
          ...buildTestConditions('companyName')
        ],
        deletedAt: null
      },
      select: {
        id: true,
        invoiceId: true,
        billTo: true,
        companyName: true
      }
    })

    console.log(`\n📄 Found ${testInvoices.length} test invoices`)
    
    if (testInvoices.length > 0) {
      for (const invoice of testInvoices) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { deletedAt: new Date() }
        })
        console.log(`   ✓ Deleted: ${invoice.invoiceId} - "${invoice.billTo}"`)
      }
    }

    // Find and delete Expenses
    const testExpenses = await prisma.expense.findMany({
      where: {
        OR: buildTestConditions('projectName'),
        deletedAt: null
      },
      select: {
        id: true,
        expenseId: true,
        projectName: true
      }
    })

    console.log(`\n💰 Found ${testExpenses.length} test expenses`)
    
    if (testExpenses.length > 0) {
      for (const expense of testExpenses) {
        await prisma.expense.update({
          where: { id: expense.id },
          data: { deletedAt: new Date() }
        })
        console.log(`   ✓ Deleted: ${expense.expenseId} - "${expense.projectName}"`)
      }
    }

    // Find and delete Quotations
    const testQuotations = await prisma.quotation.findMany({
      where: {
        OR: buildTestConditions('billTo'),
        deletedAt: null
      },
      select: {
        id: true,
        quotationId: true,
        billTo: true
      }
    })

    console.log(`\n📋 Found ${testQuotations.length} test quotations`)
    
    if (testQuotations.length > 0) {
      for (const quotation of testQuotations) {
        await prisma.quotation.update({
          where: { id: quotation.id },
          data: { deletedAt: new Date() }
        })
        console.log(`   ✓ Deleted: ${quotation.quotationId} - "${quotation.billTo}"`)
      }
    }

    // Find and delete Plannings
    const testPlannings = await prisma.planning.findMany({
      where: {
        OR: buildTestConditions('projectName'),
        deletedAt: null
      },
      select: {
        id: true,
        planningId: true,
        projectName: true
      }
    })

    console.log(`\n📅 Found ${testPlannings.length} test plannings`)
    
    if (testPlannings.length > 0) {
      for (const planning of testPlannings) {
        await prisma.planning.update({
          where: { id: planning.id },
          data: { deletedAt: new Date() }
        })
        console.log(`   ✓ Deleted: ${planning.planningId} - "${planning.projectName}"`)
      }
    }

    const totalDeleted = testTrackers.length + testInvoices.length + testExpenses.length + testQuotations.length + testPlannings.length

    console.log('\n' + '='.repeat(80))
    console.log(`✅ Cleanup complete! Soft-deleted ${totalDeleted} test records.`)
    console.log('='.repeat(80))

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupAllTestData().catch(console.error)
