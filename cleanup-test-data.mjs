import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function cleanupTestData() {
  console.log('🔍 Checking for test data...\n')
  
  try {
    // Define test patterns
    const testPatterns = [
      'Test', 'RACE_TEST', 'CASCADE', 'REF_', 
      'Update Test', 'Delete Test', 'API Test',
      'Manual Entry', 'Generated Entry', 'Sync Test',
      'Status Test', 'Invoice Link Test', 'Differentiation Test',
      'Tracker Sync Test', 'Status Auto-Create'
    ]
    
    // Check counts first
    console.log('📊 Test Data Found:')
    
    const quotations = await prisma.quotation.findMany({
      where: {
        OR: testPatterns.map(p => ({ billTo: { contains: p } }))
      },
      select: { id: true, billTo: true }
    })
    console.log(`  Quotations: ${quotations.length}`)
    
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: testPatterns.map(p => ({ billTo: { contains: p } }))
      },
      select: { id: true, billTo: true }
    })
    console.log(`  Invoices: ${invoices.length}`)
    
    const expenses = await prisma.expense.findMany({
      where: {
        OR: [
          ...testPatterns.map(p => ({ projectName: { contains: p } })),
          { status: 'draft', createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // drafts from last 24h
        ]
      },
      select: { id: true, projectName: true, expenseId: true }
    })
    console.log(`  Expenses: ${expenses.length}`)
    if (expenses.length > 0) {
      console.log('    Sample:', expenses.slice(0, 5).map(e => e.expenseId + ': ' + e.projectName).join('\n           '))
    }
    
    const trackers = await prisma.productionTracker.findMany({
      where: {
        OR: testPatterns.map(p => ({ projectName: { contains: p } }))
      },
      select: { id: true, projectName: true }
    })
    console.log(`  Trackers: ${trackers.length}`)
    
    const products = await prisma.product.findMany({
      where: {
        OR: testPatterns.map(p => ({ name: { contains: p } }))
      },
      select: { id: true, name: true }
    })
    console.log(`  Products: ${products.length}`)
    
    const companies = await prisma.company.findMany({
      where: {
        OR: testPatterns.map(p => ({ name: { contains: p } }))
      },
      select: { id: true, name: true }
    })
    console.log(`  Companies: ${companies.length}`)
    
    const paragonTickets = await prisma.paragonTicket.findMany({
      where: {
        OR: testPatterns.map(p => ({ billTo: { contains: p } }))
      },
      select: { id: true, ticketId: true, billTo: true }
    })
    console.log(`  Paragon Tickets: ${paragonTickets.length}`)
    
    const erhaTickets = await prisma.erhaTicket.findMany({
      where: {
        OR: testPatterns.map(p => ({ billTo: { contains: p } }))
      },
      select: { id: true, ticketId: true, billTo: true }
    })
    console.log(`  Erha Tickets: ${erhaTickets.length}`)
    
    const total = quotations.length + invoices.length + expenses.length + 
                  trackers.length + products.length + companies.length +
                  paragonTickets.length + erhaTickets.length
    
    console.log(`\n  Total test records: ${total}\n`)
    
    if (total === 0) {
      console.log('✅ No test data found! Database is clean.')
      return
    }
    
    console.log('🧹 Cleaning up test data...\n')
    
    // Delete in correct order (respecting foreign keys)
    
    // 1. Delete tracker items
    for (const tracker of trackers) {
      await prisma.productionTracker.delete({ where: { id: tracker.id } }).catch(() => {})
    }
    console.log('  ✓ Cleaned trackers')
    
    // 2. Delete expense items and expenses
    for (const expense of expenses) {
      await prisma.expenseItem.deleteMany({ where: { expenseId: expense.id } })
      await prisma.expense.delete({ where: { id: expense.id } }).catch(() => {})
    }
    console.log('  ✓ Cleaned expenses')
    
    // 3. Delete invoice items and invoices
    for (const invoice of invoices) {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } })
      await prisma.invoiceRemark.deleteMany({ where: { invoiceId: invoice.id } })
      await prisma.invoiceSignature.deleteMany({ where: { invoiceId: invoice.id } })
      await prisma.invoice.delete({ where: { id: invoice.id } }).catch(() => {})
    }
    console.log('  ✓ Cleaned invoices')
    
    // 4. Delete quotation items and quotations
    for (const quotation of quotations) {
      const items = await prisma.quotationItem.findMany({ where: { quotationId: quotation.id } })
      for (const item of items) {
        await prisma.quotationItemDetail.deleteMany({ where: { quotationItemId: item.id } })
      }
      await prisma.quotationItem.deleteMany({ where: { quotationId: quotation.id } })
      await prisma.quotationRemark.deleteMany({ where: { quotationId: quotation.id } })
      await prisma.quotationSignature.deleteMany({ where: { quotationId: quotation.id } })
      await prisma.quotation.delete({ where: { id: quotation.id } }).catch(() => {})
    }
    console.log('  ✓ Cleaned quotations')
    
    // 5. Delete product details and products
    for (const product of products) {
      await prisma.productDetail.deleteMany({ where: { productId: product.id } })
      await prisma.product.delete({ where: { id: product.id } }).catch(() => {})
    }
    console.log('  ✓ Cleaned products')
    
    // 7. Delete companies
    for (const company of companies) {
      await prisma.company.delete({ where: { id: company.id } }).catch(() => {})
    }
    console.log('  ✓ Cleaned companies')
    
    // 8. Delete orphaned billings and signatures
    const testBillings = await prisma.billing.findMany({
      where: {
        OR: testPatterns.map(p => ({ name: { contains: p } }))
      }
    })
    for (const billing of testBillings) {
      await prisma.billing.delete({ where: { id: billing.id } }).catch(() => {})
    }
    
    const testSignatures = await prisma.signature.findMany({
      where: {
        OR: testPatterns.map(p => ({ name: { contains: p } }))
      }
    })
    for (const signature of testSignatures) {
      await prisma.signature.delete({ where: { id: signature.id } }).catch(() => {})
    }
    console.log('  ✓ Cleaned billings and signatures')
    
    // 9. Delete Paragon ticket items and tickets
    for (const ticket of paragonTickets) {
      const items = await prisma.paragonTicketItem.findMany({ where: { ticketId: ticket.id } })
      for (const item of items) {
        await prisma.paragonTicketItemDetail.deleteMany({ where: { itemId: item.id } })
      }
      await prisma.paragonTicketItem.deleteMany({ where: { ticketId: ticket.id } })
      await prisma.paragonTicketRemark.deleteMany({ where: { ticketId: ticket.id } })
      await prisma.paragonTicket.delete({ where: { id: ticket.id } }).catch(() => {})
    }
    console.log('  ✓ Cleaned Paragon tickets')
    
    // 10. Delete Erha ticket items and tickets
    for (const ticket of erhaTickets) {
      const items = await prisma.erhaTicketItem.findMany({ where: { ticketId: ticket.id } })
      for (const item of items) {
        await prisma.erhaTicketItemDetail.deleteMany({ where: { itemId: item.id } })
      }
      await prisma.erhaTicketItem.deleteMany({ where: { ticketId: ticket.id } })
      await prisma.erhaTicketRemark.deleteMany({ where: { ticketId: ticket.id } })
      await prisma.erhaTicket.delete({ where: { id: ticket.id } }).catch(() => {})
    }
    console.log('  ✓ Cleaned Erha tickets')
    
    console.log('\n✅ Test data cleanup complete!')
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupTestData()
