/**
 * Cleanup Test Data from Production Database
 * Removes all test data that leaked from integration tests
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupTestData() {
  console.log('🧹 Starting cleanup of test data from production database...\n')

  try {
    // Patterns to identify test data
    const testPatterns = [
      'Test',
      'UniqueTest',
      'TEST-',
      'UniqueTestExpense',
      'UniqueTestTracker',
      'UniqueTestParagon',
      'UniqueTestErha',
      'UniqueTestPlanning',
      'UniqueTestQuotation',
      'UniqueTestInvoice'
    ]

    // 1. Clean up Expenses
    console.log('📦 Cleaning Expenses...')
    const expenses = await prisma.expense.findMany({
      where: {
        OR: [
          { projectName: { contains: 'Test' } },
          { projectName: { contains: 'UniqueTest' } },
          { expenseId: { contains: 'TEST-' } }
        ]
      },
      select: { id: true, projectName: true, expenseId: true }
    })
    console.log(`  Found ${expenses.length} test expenses`)
    
    for (const expense of expenses) {
      await prisma.expenseItem.deleteMany({ where: { expenseId: expense.id } })
      await prisma.expense.delete({ where: { id: expense.id } })
      console.log(`  ✓ Deleted: ${expense.projectName} (${expense.expenseId})`)
    }

    // 2. Clean up Production Trackers
    console.log('\n📊 Cleaning Production Trackers...')
    const trackers = await prisma.productionTracker.findMany({
      where: {
        OR: [
          { projectName: { contains: 'Test' } },
          { projectName: { contains: 'UniqueTest' } },
          { trackerId: { contains: 'TEST-' } }
        ]
      },
      select: { id: true, projectName: true, trackerId: true }
    })
    console.log(`  Found ${trackers.length} test trackers`)
    
    for (const tracker of trackers) {
      await prisma.productionTracker.delete({ where: { id: tracker.id } })
      console.log(`  ✓ Deleted: ${tracker.projectName} (${tracker.trackerId})`)
    }

    // 3. Clean up Paragon Tickets
    console.log('\n🎫 Cleaning Paragon Tickets...')
    const paragons = await prisma.paragonTicket.findMany({
      where: {
        OR: [
          { billTo: { contains: 'Test' } },
          { billTo: { contains: 'UniqueTest' } },
          { ticketId: { contains: 'TEST-' } }
        ]
      },
      select: { id: true, billTo: true, ticketId: true }
    })
    console.log(`  Found ${paragons.length} test paragon tickets`)
    
    for (const paragon of paragons) {
      // Delete child records first
      const items = await prisma.paragonTicketItem.findMany({
        where: { ticketId: paragon.id },
        select: { id: true }
      })
      for (const item of items) {
        await prisma.paragonTicketItemDetail.deleteMany({ where: { itemId: item.id } })
      }
      await prisma.paragonTicketItem.deleteMany({ where: { ticketId: paragon.id } })
      await prisma.paragonTicketRemark.deleteMany({ where: { ticketId: paragon.id } })
      await prisma.paragonTicket.delete({ where: { id: paragon.id } })
      console.log(`  ✓ Deleted: ${paragon.billTo} (${paragon.ticketId})`)
    }

    // 4. Clean up Erha Tickets
    console.log('\n🎫 Cleaning Erha Tickets...')
    const erhas = await prisma.erhaTicket.findMany({
      where: {
        OR: [
          { billTo: { contains: 'Test' } },
          { billTo: { contains: 'UniqueTest' } },
          { ticketId: { contains: 'TEST-' } }
        ]
      },
      select: { id: true, billTo: true, ticketId: true }
    })
    console.log(`  Found ${erhas.length} test erha tickets`)
    
    for (const erha of erhas) {
      // Delete child records first
      const items = await prisma.erhaTicketItem.findMany({
        where: { ticketId: erha.id },
        select: { id: true }
      })
      for (const item of items) {
        await prisma.erhaTicketItemDetail.deleteMany({ where: { itemId: item.id } })
      }
      await prisma.erhaTicketItem.deleteMany({ where: { ticketId: erha.id } })
      await prisma.erhaTicketRemark.deleteMany({ where: { ticketId: erha.id } })
      await prisma.erhaTicket.delete({ where: { id: erha.id } })
      console.log(`  ✓ Deleted: ${erha.billTo} (${erha.ticketId})`)
    }

    // 5. Clean up Quotations
    console.log('\n📄 Cleaning Quotations...')
    const quotations = await prisma.quotation.findMany({
      where: {
        OR: [
          { billTo: { contains: 'Test' } },
          { billTo: { contains: 'UniqueTest' } },
          { quotationId: { contains: 'TEST-' } }
        ]
      },
      select: { id: true, billTo: true, quotationId: true }
    })
    console.log(`  Found ${quotations.length} test quotations`)
    
    for (const quotation of quotations) {
      await prisma.quotationItemDetail.deleteMany({ 
        where: { quotationItem: { quotationId: quotation.id } } 
      })
      await prisma.quotationItem.deleteMany({ where: { quotationId: quotation.id } })
      await prisma.quotationRemark.deleteMany({ where: { quotationId: quotation.id } })
      await prisma.quotationSignature.deleteMany({ where: { quotationId: quotation.id } })
      await prisma.quotation.delete({ where: { id: quotation.id } })
      console.log(`  ✓ Deleted: ${quotation.billTo} (${quotation.quotationId})`)
    }

    // 6. Clean up Invoices
    console.log('\n📃 Cleaning Invoices...')
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { billTo: { contains: 'Test' } },
          { billTo: { contains: 'UniqueTest' } },
          { invoiceId: { contains: 'TEST-' } }
        ]
      },
      select: { id: true, billTo: true, invoiceId: true }
    })
    console.log(`  Found ${invoices.length} test invoices`)
    
    for (const invoice of invoices) {
      await prisma.invoiceItemDetail.deleteMany({ 
        where: { invoiceItem: { invoiceId: invoice.id } } 
      })
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } })
      await prisma.invoiceRemark.deleteMany({ where: { invoiceId: invoice.id } })
      await prisma.invoiceSignature.deleteMany({ where: { invoiceId: invoice.id } })
      await prisma.invoice.delete({ where: { id: invoice.id } })
      console.log(`  ✓ Deleted: ${invoice.billTo} (${invoice.invoiceId})`)
    }

    // 7. Clean up Planning
    console.log('\n📋 Cleaning Planning...')
    const plannings = await prisma.planning.findMany({
      where: {
        OR: [
          { projectName: { contains: 'Test' } },
          { projectName: { contains: 'UniqueTest' } },
          { planningId: { contains: 'TEST-' } }
        ]
      },
      select: { id: true, projectName: true, planningId: true }
    })
    console.log(`  Found ${plannings.length} test plannings`)
    
    for (const planning of plannings) {
      await prisma.planningItem.deleteMany({ where: { planningId: planning.id } })
      await prisma.planning.delete({ where: { id: planning.id } })
      console.log(`  ✓ Deleted: ${planning.projectName} (${planning.planningId})`)
    }

    // 8. Clean up test Companies, Billings, Signatures
    console.log('\n🏢 Cleaning Companies, Billings, Signatures...')
    
    const companies = await prisma.company.findMany({
      where: { name: { contains: 'Test' } },
      select: { id: true, name: true }
    })
    console.log(`  Found ${companies.length} test companies`)
    for (const company of companies) {
      await prisma.company.delete({ where: { id: company.id } }).catch(() => {})
      console.log(`  ✓ Deleted company: ${company.name}`)
    }

    const billings = await prisma.billing.findMany({
      where: { name: { contains: 'Test' } },
      select: { id: true, name: true }
    })
    console.log(`  Found ${billings.length} test billings`)
    for (const billing of billings) {
      await prisma.billing.delete({ where: { id: billing.id } }).catch(() => {})
      console.log(`  ✓ Deleted billing: ${billing.name}`)
    }

    const signatures = await prisma.signature.findMany({
      where: { name: { contains: 'Test' } },
      select: { id: true, name: true }
    })
    console.log(`  Found ${signatures.length} test signatures`)
    for (const signature of signatures) {
      await prisma.signature.delete({ where: { id: signature.id } }).catch(() => {})
      console.log(`  ✓ Deleted signature: ${signature.name}`)
    }

    console.log('\n✅ Cleanup completed successfully!')
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

cleanupTestData()
  .catch(console.error)
