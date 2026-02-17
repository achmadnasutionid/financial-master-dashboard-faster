/**
 * COMPREHENSIVE Cleanup - Remove ALL test data from production
 * Checks all tables for any test-related data
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function comprehensiveCleanup() {
  console.log('🧹 COMPREHENSIVE CLEANUP - Removing ALL test data from production\n')
  console.log('=' .repeat(70))
  
  let totalCleaned = 0

  try {
    // 1. EXPENSES
    console.log('\n📦 Cleaning Expenses...')
    const expenses = await prisma.expense.findMany({
      where: {
        OR: [
          { projectName: { contains: 'Test', mode: 'insensitive' } },
          { projectName: { contains: 'test' } },
          { expenseId: { contains: 'TEST-' } },
          { projectName: { startsWith: 'API Test' } },
          { projectName: { startsWith: 'Status Test' } },
          { projectName: { startsWith: 'Manual Entry Test' } }
        ]
      }
    })
    console.log(`  Found ${expenses.length} test expenses`)
    for (const expense of expenses) {
      await prisma.expenseItem.deleteMany({ where: { expenseId: expense.id } })
      await prisma.expense.delete({ where: { id: expense.id } })
      console.log(`  ✓ ${expense.projectName} (${expense.expenseId})`)
      totalCleaned++
    }

    // 2. PRODUCTION TRACKERS
    console.log('\n📊 Cleaning Production Trackers...')
    const trackers = await prisma.productionTracker.findMany({
      where: {
        OR: [
          { projectName: { contains: 'Test', mode: 'insensitive' } },
          { projectName: { contains: 'test' } },
          { trackerId: { contains: 'TEST-' } },
          { projectName: { startsWith: 'API Test' } },
          { projectName: { startsWith: 'Status Test' } },
          { projectName: { startsWith: 'Manual Entry Test' } }
        ],
        deletedAt: null
      }
    })
    console.log(`  Found ${trackers.length} test trackers`)
    for (const tracker of trackers) {
      await prisma.productionTracker.delete({ where: { id: tracker.id } })
      console.log(`  ✓ ${tracker.projectName} (${tracker.trackerId})`)
      totalCleaned++
    }

    // 3. PLANNING
    console.log('\n📋 Cleaning Planning...')
    const plannings = await prisma.planning.findMany({
      where: {
        OR: [
          { projectName: { contains: 'Test', mode: 'insensitive' } },
          { projectName: { contains: 'test' } },
          { planningId: { contains: 'TEST-' } }
        ]
      }
    })
    console.log(`  Found ${plannings.length} test plannings`)
    for (const planning of plannings) {
      await prisma.planningItem.deleteMany({ where: { planningId: planning.id } })
      await prisma.planning.delete({ where: { id: planning.id } })
      console.log(`  ✓ ${planning.projectName} (${planning.planningId})`)
      totalCleaned++
    }

    // 4. QUOTATIONS
    console.log('\n📄 Cleaning Quotations...')
    const quotations = await prisma.quotation.findMany({
      where: {
        OR: [
          { billTo: { contains: 'Test', mode: 'insensitive' } },
          { billTo: { contains: 'test' } },
          { quotationId: { contains: 'TEST-' } }
        ]
      }
    })
    console.log(`  Found ${quotations.length} test quotations`)
    for (const quotation of quotations) {
      const items = await prisma.quotationItem.findMany({
        where: { quotationId: quotation.id },
        select: { id: true }
      })
      for (const item of items) {
        await prisma.quotationItemDetail.deleteMany({ where: { itemId: item.id } })
      }
      await prisma.quotationItem.deleteMany({ where: { quotationId: quotation.id } })
      await prisma.quotationRemark.deleteMany({ where: { quotationId: quotation.id } })
      await prisma.quotationSignature.deleteMany({ where: { quotationId: quotation.id } })
      await prisma.quotation.delete({ where: { id: quotation.id } })
      console.log(`  ✓ ${quotation.billTo} (${quotation.quotationId})`)
      totalCleaned++
    }

    // 5. INVOICES
    console.log('\n📃 Cleaning Invoices...')
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { billTo: { contains: 'Test', mode: 'insensitive' } },
          { billTo: { contains: 'test' } },
          { invoiceId: { contains: 'TEST-' } }
        ]
      }
    })
    console.log(`  Found ${invoices.length} test invoices`)
    for (const invoice of invoices) {
      const items = await prisma.invoiceItem.findMany({
        where: { invoiceId: invoice.id },
        select: { id: true }
      })
      for (const item of items) {
        await prisma.invoiceItemDetail.deleteMany({ where: { itemId: item.id } })
      }
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } })
      await prisma.invoiceRemark.deleteMany({ where: { invoiceId: invoice.id } })
      await prisma.invoiceSignature.deleteMany({ where: { invoiceId: invoice.id } })
      await prisma.invoice.delete({ where: { id: invoice.id } })
      console.log(`  ✓ ${invoice.billTo} (${invoice.invoiceId})`)
      totalCleaned++
    }

    // 6. PARAGON TICKETS
    console.log('\n🎫 Cleaning Paragon Tickets...')
    const paragons = await prisma.paragonTicket.findMany({
      where: {
        OR: [
          { billTo: { contains: 'Test', mode: 'insensitive' } },
          { billTo: { contains: 'test' } },
          { ticketId: { contains: 'TEST-' } }
        ]
      }
    })
    console.log(`  Found ${paragons.length} test paragon tickets`)
    for (const paragon of paragons) {
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
      console.log(`  ✓ ${paragon.billTo} (${paragon.ticketId})`)
      totalCleaned++
    }

    // 7. ERHA TICKETS
    console.log('\n🎫 Cleaning Erha Tickets...')
    const erhas = await prisma.erhaTicket.findMany({
      where: {
        OR: [
          { billTo: { contains: 'Test', mode: 'insensitive' } },
          { billTo: { contains: 'test' } },
          { ticketId: { contains: 'TEST-' } }
        ]
      }
    })
    console.log(`  Found ${erhas.length} test erha tickets`)
    for (const erha of erhas) {
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
      console.log(`  ✓ ${erha.billTo} (${erha.ticketId})`)
      totalCleaned++
    }

    // 8. COMPANIES
    console.log('\n🏢 Cleaning Companies...')
    const companies = await prisma.company.findMany({
      where: { 
        OR: [
          { name: { contains: 'Test', mode: 'insensitive' } },
          { name: { contains: 'test' } }
        ]
      }
    })
    console.log(`  Found ${companies.length} test companies`)
    for (const company of companies) {
      try {
        await prisma.company.delete({ where: { id: company.id } })
        console.log(`  ✓ ${company.name}`)
        totalCleaned++
      } catch (err) {
        console.log(`  ⚠️  Could not delete ${company.name} (may have references)`)
      }
    }

    // 9. BILLINGS
    console.log('\n💳 Cleaning Billings...')
    const billings = await prisma.billing.findMany({
      where: { 
        OR: [
          { name: { contains: 'Test', mode: 'insensitive' } },
          { name: { contains: 'test' } }
        ]
      }
    })
    console.log(`  Found ${billings.length} test billings`)
    for (const billing of billings) {
      try {
        await prisma.billing.delete({ where: { id: billing.id } })
        console.log(`  ✓ ${billing.name}`)
        totalCleaned++
      } catch (err) {
        console.log(`  ⚠️  Could not delete ${billing.name} (may have references)`)
      }
    }

    // 10. SIGNATURES
    console.log('\n✍️  Cleaning Signatures...')
    const signatures = await prisma.signature.findMany({
      where: { 
        OR: [
          { name: { contains: 'Test', mode: 'insensitive' } },
          { name: { contains: 'test' } }
        ]
      }
    })
    console.log(`  Found ${signatures.length} test signatures`)
    for (const signature of signatures) {
      try {
        await prisma.signature.delete({ where: { id: signature.id } })
        console.log(`  ✓ ${signature.name}`)
        totalCleaned++
      } catch (err) {
        console.log(`  ⚠️  Could not delete ${signature.name} (may have references)`)
      }
    }

    // 11. PRODUCTS
    console.log('\n📦 Cleaning Products...')
    const products = await prisma.product.findMany({
      where: { 
        OR: [
          { name: { contains: 'Test', mode: 'insensitive' } },
          { name: { contains: 'test' } }
        ]
      }
    })
    console.log(`  Found ${products.length} test products`)
    for (const product of products) {
      try {
        await prisma.productDetail.deleteMany({ where: { productId: product.id } })
        await prisma.product.delete({ where: { id: product.id } })
        console.log(`  ✓ ${product.name}`)
        totalCleaned++
      } catch (err) {
        console.log(`  ⚠️  Could not delete ${product.name} (may have references)`)
      }
    }

    console.log('\n' + '='.repeat(70))
    console.log(`\n✅ CLEANUP COMPLETE! Removed ${totalCleaned} test records from production`)
    console.log('\n🎯 Production database is now clean!')
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

comprehensiveCleanup()
  .catch(console.error)
