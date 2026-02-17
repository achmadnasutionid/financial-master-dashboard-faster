import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function showAllRecentData() {
  console.log('🔍 Showing ALL recent records (last 50)...\n')

  // Show recent trackers
  const trackers = await prisma.productionTracker.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      trackerId: true,
      projectName: true,
      createdAt: true,
      date: true
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  console.log(`📊 Production Trackers (${trackers.length} total, showing recent 50):`)
  trackers.forEach((t, i) => {
    console.log(`${i+1}. ${t.trackerId}: "${t.projectName}" (created: ${t.createdAt.toISOString().split('T')[0]})`)
  })

  // Show recent invoices
  const invoices = await prisma.invoice.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      invoiceId: true,
      billTo: true,
      companyName: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  })

  console.log(`\n📄 Recent Invoices (${invoices.length} showing):`)
  invoices.forEach((i, idx) => {
    console.log(`${idx+1}. ${i.invoiceId}: "${i.billTo}" from "${i.companyName}" (${i.createdAt.toISOString().split('T')[0]})`)
  })

  // Show recent expenses
  const expenses = await prisma.expense.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      expenseId: true,
      projectName: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  })

  console.log(`\n💰 Recent Expenses (${expenses.length} showing):`)
  expenses.forEach((e, idx) => {
    console.log(`${idx+1}. ${e.expenseId}: "${e.projectName}" (${e.createdAt.toISOString().split('T')[0]})`)
  })

  // Show recent quotations
  const quotations = await prisma.quotation.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      quotationId: true,
      billTo: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  })

  console.log(`\n📋 Recent Quotations (${quotations.length} showing):`)
  quotations.forEach((q, idx) => {
    console.log(`${idx+1}. ${q.quotationId}: "${q.billTo}" (${q.createdAt.toISOString().split('T')[0]})`)
  })

  // Show recent plannings
  const plannings = await prisma.planning.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      planningId: true,
      projectName: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  })

  console.log(`\n📅 Recent Plannings (${plannings.length} showing):`)
  plannings.forEach((p, idx) => {
    console.log(`${idx+1}. ${p.planningId}: "${p.projectName}" (${p.createdAt.toISOString().split('T')[0]})`)
  })

  console.log('\n' + '='.repeat(80))
  console.log('💡 Please review the list above and let me know which records are test data.')
  console.log('='.repeat(80))

  await prisma.$disconnect()
}

showAllRecentData().catch(console.error)
