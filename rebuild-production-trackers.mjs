/**
 * Rebuild ProductionTracker from existing data
 *
 * Use after production was mistakenly cleaned: repopulates ProductionTracker
 * from Expenses, Invoices, Quotations, Erha tickets, and Paragon tickets.
 *
 * Usage:
 *   node rebuild-production-trackers.mjs
 *
 * Optional: BACKUP_PRODUCTION=1 node backup-production-db.mjs  (run backup first)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/** Generate next PT-YYYY-NNNN id using DB sequence (same logic as lib/id-generator) */
async function nextTrackerId() {
  const year = new Date().getFullYear()
  const seq = `id_seq_pt_${year}`
  const existsResult = await prisma.$queryRawUnsafe(
    `SELECT EXISTS (SELECT FROM pg_sequences WHERE schemaname = 'public' AND sequencename = '${seq}') as "exists"`
  )
  if (!existsResult[0]?.exists) {
    const last = await prisma.productionTracker.findFirst({
      where: { trackerId: { startsWith: `PT-${year}-` } },
      orderBy: { trackerId: 'desc' },
      select: { trackerId: true }
    })
    const start = last ? parseInt(last.trackerId.split('-')[2] || '0', 10) + 1 : 1
    await prisma.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS "${seq}" START WITH ${start}`)
  }
  const nextvalResult = await prisma.$queryRawUnsafe(
    `SELECT nextval('"${seq}"') as nextval`
  )
  const nextval = nextvalResult[0]?.nextval
  return `PT-${year}-${String(Number(nextval)).padStart(4, '0')}`
}

async function syncTracker(data) {
  const { projectName, date, totalAmount, invoiceId = null, subtotal = 0 } = data
  const existing = await prisma.productionTracker.findFirst({
    where: { projectName, deletedAt: null }
  })
  if (existing) {
    return prisma.productionTracker.update({
      where: { id: existing.id },
      data: { date, totalAmount, invoiceId, subtotal }
    })
  }
  const trackerId = await nextTrackerId()
  return prisma.productionTracker.create({
    data: {
      trackerId,
      expenseId: '',
      invoiceId,
      projectName,
      date,
      subtotal,
      totalAmount,
      expense: 0,
      productAmounts: {},
      notes: null,
      status: 'pending'
    }
  })
}

async function main() {
  console.log('🔄 Rebuilding ProductionTracker from Expenses, Invoices, Quotations, Erha, Paragon...\n')

  let created = 0
  let updated = 0

  // 1. Expenses
  const expenses = await prisma.expense.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      expenseId: true,
      projectName: true,
      productionDate: true,
      paidAmount: true,
      items: { select: { actual: true } }
    }
  })
  for (const e of expenses) {
    const totalAmount = e.paidAmount ?? e.items?.reduce((s, i) => s + (i.actual || 0), 0) ?? 0
    const existing = await prisma.productionTracker.findFirst({
      where: { projectName: e.projectName, deletedAt: null }
    })
    await syncTracker({
      projectName: e.projectName,
      date: e.productionDate,
      totalAmount,
      invoiceId: null,
      subtotal: totalAmount
    })
    if (existing) updated++; else created++
    const tracker = await prisma.productionTracker.findFirst({
      where: { projectName: e.projectName, deletedAt: null }
    })
    if (tracker && tracker.expenseId !== e.expenseId) {
      await prisma.productionTracker.update({
        where: { id: tracker.id },
        data: { expenseId: e.expenseId }
      })
    }
  }
  console.log(`  Expenses: ${expenses.length} → ${created} new, ${updated} updated trackers`)

  // 2. Invoices (billTo = project name)
  const invoices = await prisma.invoice.findMany({
    where: { deletedAt: null },
    include: { items: { select: { total: true } } }
  })
  let invSynced = 0
  for (const inv of invoices) {
    const subtotal = inv.items?.reduce((s, i) => s + (i.total || 0), 0) ?? 0
    await syncTracker({
      projectName: inv.billTo,
      date: inv.productionDate,
      totalAmount: inv.totalAmount,
      invoiceId: inv.invoiceId,
      subtotal
    })
    invSynced++
  }
  console.log(`  Invoices: ${invSynced} synced`)

  // 3. Quotations
  const quotations = await prisma.quotation.findMany({
    where: { deletedAt: null },
    include: { items: { select: { total: true } } }
  })
  for (const q of quotations) {
    const subtotal = q.items?.reduce((s, i) => s + (i.total || 0), 0) ?? 0
    await syncTracker({
      projectName: q.billTo,
      date: q.productionDate,
      totalAmount: q.totalAmount,
      invoiceId: null,
      subtotal
    })
  }
  console.log(`  Quotations: ${quotations.length} synced`)

  // 4. Paragon tickets
  const paragons = await prisma.paragonTicket.findMany({
    where: { deletedAt: null },
    select: { billTo: true, productionDate: true, totalAmount: true }
  })
  for (const p of paragons) {
    await syncTracker({
      projectName: p.billTo,
      date: p.productionDate,
      totalAmount: p.totalAmount,
      invoiceId: null,
      subtotal: p.totalAmount
    })
  }
  console.log(`  Paragon tickets: ${paragons.length} synced`)

  // 5. Erha tickets
  const erhas = await prisma.erhaTicket.findMany({
    where: { deletedAt: null },
    select: { billTo: true, productionDate: true, totalAmount: true }
  })
  for (const e of erhas) {
    await syncTracker({
      projectName: e.billTo,
      date: e.productionDate,
      totalAmount: e.totalAmount,
      invoiceId: null,
      subtotal: e.totalAmount
    })
  }
  console.log(`  Erha tickets: ${erhas.length} synced`)

  const total = await prisma.productionTracker.count({ where: { deletedAt: null } })
  console.log('\n✅ Rebuild done. Total ProductionTracker records (non-deleted):', total)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
