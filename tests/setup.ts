import { beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'

// Setup runs before all tests
beforeAll(async () => {
  // Ensure we're using test database
  if (!process.env.DATABASE_URL?.includes('test')) {
    console.warn('⚠️  Warning: Not using test database!')
  }
})

// Cleanup runs after all tests
afterAll(async () => {
  // Comprehensive cleanup of all test data
  console.log('\n🧹 Running comprehensive test cleanup...')
  
  try {
    // Clean up production trackers first (no dependencies)
    await prisma.productionTracker.deleteMany({
      where: {
        OR: [
          { expenseId: { contains: 'TEST-' } },
          { expenseId: { contains: 'EXP-TEST-' } },
          { projectName: { equals: 'Test Project' } },
          { projectName: { equals: 'test' } },
          { projectName: { startsWith: 'Test ' } },
          { projectName: { startsWith: 'test ' } },
          { projectName: { contains: 'API Invoice ID' } },
          { projectName: { contains: 'Invoice ID Update' } },
          { projectName: { contains: 'API Status' } },
          { projectName: { contains: 'Status Paid' } },
          { projectName: { contains: 'Status Update' } }
        ]
      }
    })

    // Clean up invoices (with nested relations)
    const testInvoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { invoiceId: { contains: 'INV-TEST-' } },
          { invoiceId: { contains: 'INV-ITEMS-' } },
          { billTo: { contains: 'RACE_TEST' } },
          { billTo: { contains: 'CASCADE_TEST' } },
          { billTo: { contains: 'REF_TRACK_TEST' } },
          { billTo: { contains: 'Generated Entry' } },
          { billTo: { contains: 'Invoice Link' } },
          { billTo: { contains: 'Status Auto-Create' } },
          { billTo: { contains: 'Test Project' } }
        ]
      }
    })
    for (const invoice of testInvoices) {
      try {
        // Check if invoice still exists before deleting
        const exists = await prisma.invoice.findUnique({ where: { id: invoice.id } })
        if (!exists) continue

        await prisma.invoiceItemDetail.deleteMany({
          where: { invoiceItem: { invoiceId: invoice.id } }
        })
        await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } })
        await prisma.invoiceRemark.deleteMany({ where: { invoiceId: invoice.id } })
        await prisma.invoiceSignature.deleteMany({ where: { invoiceId: invoice.id } })
        await prisma.invoice.delete({ where: { id: invoice.id } })
      } catch (error: any) {
        // Ignore P2025 (record not found) errors - record was already deleted
        if (error.code !== 'P2025') {
          console.error('Error cleaning up invoice:', error)
        }
      }
    }

    // Clean up quotations (with nested relations)
    const testQuotations = await prisma.quotation.findMany({
      where: {
        OR: [
          { quotationId: { contains: 'QTN-TEST-' } },
          { quotationId: { contains: 'TEST-COMPLEX-' } },
          { quotationId: { contains: 'TEST-PERF-' } },
          { quotationId: { contains: 'TEST-LOCK-' } },
          { quotationId: { contains: 'TEST-QTN-' } },
          { billTo: { contains: 'RACE_TEST' } },
          { billTo: { contains: 'REF_TRACK_TEST' } }
        ]
      }
    })
    for (const quotation of testQuotations) {
      try {
        // Check if quotation still exists before deleting
        const exists = await prisma.quotation.findUnique({ where: { id: quotation.id } })
        if (!exists) continue

        await prisma.quotationItemDetail.deleteMany({
          where: { quotationItem: { quotationId: quotation.id } }
        })
        await prisma.quotationItem.deleteMany({ where: { quotationId: quotation.id } })
        await prisma.quotationRemark.deleteMany({ where: { quotationId: quotation.id } })
        await prisma.quotationSignature.deleteMany({ where: { quotationId: quotation.id } })
        await prisma.quotation.delete({ where: { id: quotation.id } })
      } catch (error: any) {
        // Ignore P2025 (record not found) errors - record was already deleted
        if (error.code !== 'P2025') {
          console.error('Error cleaning up quotation:', error)
        }
      }
    }

    // Clean up expenses (with nested relations)
    const testExpenses = await prisma.expense.findMany({
      where: {
        OR: [
          { expenseId: { contains: 'EXP-TEST-' } },
          { expenseId: { contains: 'TEST-EXP-' } },
          { projectName: { contains: 'RACE_TEST' } },
          { projectName: { contains: 'CASCADE_TEST' } },
          { projectName: { contains: 'REF_TRACK_TEST' } },
          { projectName: { contains: 'Test Expense ' } },
          { projectName: { equals: 'Test Project' } },
          { projectName: { startsWith: 'Test ' } }
        ]
      }
    })
    for (const expense of testExpenses) {
      try {
        // Check if expense still exists before deleting
        const exists = await prisma.expense.findUnique({ where: { id: expense.id } })
        if (!exists) continue

        await prisma.expenseItem.deleteMany({ where: { expenseId: expense.id } })
        await prisma.expense.delete({ where: { id: expense.id } })
      } catch (error: any) {
        // Ignore P2025 (record not found) errors - record was already deleted
        if (error.code !== 'P2025') {
          console.error('Error cleaning up expense:', error)
        }
      }
    }

    // Clean up planning
    const testPlannings = await prisma.planning.findMany({
      where: {
        OR: [
          { planningId: { contains: 'PLN-TEST-' } },
          { planningId: { contains: 'TEST-PLAN-' } },
          { planningId: { contains: 'PLAN-TEST-' } },
          { projectName: { contains: 'CASCADE_TEST' } },
          { projectName: { contains: 'REF_TRACK_TEST' } },
          { projectName: { contains: 'Test Project ' } }
        ]
      }
    })
    for (const planning of testPlannings) {
      try {
        // Check if planning still exists before deleting
        const exists = await prisma.planning.findUnique({ where: { id: planning.id } })
        if (!exists) continue

        await prisma.planningItem.deleteMany({ where: { planningId: planning.id } })
        await prisma.planning.delete({ where: { id: planning.id } })
      } catch (error: any) {
        // Ignore P2025 (record not found) errors - record was already deleted
        if (error.code !== 'P2025') {
          console.error('Error cleaning up planning:', error)
        }
      }
    }

    // Clean up production trackers
    const testTrackers = await prisma.productionTracker.findMany({
      where: {
        OR: [
          { trackerId: { contains: 'PT-TEST-' } },
          { trackerId: { contains: 'TEST-PT-' } },
          { projectName: { contains: 'TEST-' } },
          { projectName: { contains: 'Test ' } },
          { projectName: { startsWith: 'Status Update Test' } },
          { projectName: { startsWith: 'Status Paid Test' } },
          { projectName: { startsWith: 'API Status Test' } },
          { projectName: { startsWith: 'Invoice ID Update Test' } },
          { projectName: { startsWith: 'API Invoice ID Test' } },
          { projectName: { startsWith: 'Status Auto-Create' } },
          { projectName: { startsWith: 'Invoice Link Test' } },
          { projectName: { startsWith: 'Generated Entry' } }
        ]
      }
    })
    for (const tracker of testTrackers) {
      try {
        // Check if tracker still exists before deleting
        const exists = await prisma.productionTracker.findUnique({ where: { id: tracker.id } })
        if (!exists) continue

        await prisma.productionTracker.delete({ where: { id: tracker.id } })
      } catch (error: any) {
        // Ignore P2025 (record not found) errors - record was already deleted
        if (error.code !== 'P2025') {
          console.error('Error cleaning up tracker:', error)
        }
      }
    }

    // Clean up products
    const testProducts = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: 'CASCADE_TEST' } }
        ]
      }
    })
    for (const product of testProducts) {
      try {
        // Check if product still exists before deleting
        const exists = await prisma.product.findUnique({ where: { id: product.id } })
        if (!exists) continue

        await prisma.productDetail.deleteMany({ where: { productId: product.id } })
        await prisma.product.delete({ where: { id: product.id } })
      } catch (error: any) {
        // Ignore P2025 (record not found) errors - record was already deleted
        if (error.code !== 'P2025') {
          console.error('Error cleaning up product:', error)
        }
      }
    }

    // Clean up master data (be careful)
    await prisma.company.deleteMany({
      where: { name: { contains: 'Test Company ' } }
    })
    await prisma.billing.deleteMany({
      where: { name: { contains: 'Test Billing ' } }
    })
    await prisma.signature.deleteMany({
      where: { name: { contains: 'Test Signature ' } }
    })

    console.log('✅ Test cleanup completed')
  } catch (error) {
    console.error('❌ Error during test cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
})
