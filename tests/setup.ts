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
          { projectName: { startsWith: 'test ' } }
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
          { billTo: { contains: 'REF_TRACK_TEST' } }
        ]
      }
    })
    for (const invoice of testInvoices) {
      await prisma.invoiceItemDetail.deleteMany({
        where: { invoiceItem: { invoiceId: invoice.id } }
      })
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } })
      await prisma.invoiceRemark.deleteMany({ where: { invoiceId: invoice.id } })
      await prisma.invoiceSignature.deleteMany({ where: { invoiceId: invoice.id } })
      await prisma.invoice.delete({ where: { id: invoice.id } })
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
      await prisma.quotationItemDetail.deleteMany({
        where: { quotationItem: { quotationId: quotation.id } }
      })
      await prisma.quotationItem.deleteMany({ where: { quotationId: quotation.id } })
      await prisma.quotationRemark.deleteMany({ where: { quotationId: quotation.id } })
      await prisma.quotationSignature.deleteMany({ where: { quotationId: quotation.id } })
      await prisma.quotation.delete({ where: { id: quotation.id } })
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
      await prisma.expenseItem.deleteMany({ where: { expenseId: expense.id } })
      await prisma.expense.delete({ where: { id: expense.id } })
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
      await prisma.planningItem.deleteMany({ where: { planningId: planning.id } })
      await prisma.planning.delete({ where: { id: planning.id } })
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
      await prisma.productDetail.deleteMany({ where: { productId: product.id } })
      await prisma.product.delete({ where: { id: product.id } })
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
