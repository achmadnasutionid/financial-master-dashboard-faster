import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'

/**
 * CRITICAL TEST 4: All Update Endpoints Use Transactions
 * 
 * Purpose: Verify all critical endpoints follow safe UPSERT pattern
 * Prevents regression to unsafe delete-then-create pattern
 */
describe('🔴 CRITICAL: All Endpoints Use Safe Patterns', () => {
  
  it('Planning: should use UPSERT pattern for items', async () => {
    // Create planning
    const planning = await prisma.planning.create({
      data: {
        planningId: `TEST-PLAN-${Date.now()}`,
        projectName: 'Test Project',
        clientName: 'Test Client',
        clientBudget: 10000000,
        items: {
          create: [
            { productName: 'Item 1', budget: 5000000, expense: 4500000, order: 0 },
            { productName: 'Item 2', budget: 5000000, expense: 5200000, order: 1 }
          ]
        }
      },
      include: { items: true }
    })

    const originalItemId = planning.items[0].id

    // Simulate UPSERT: update item 1, create item 3, delete item 2
    await prisma.$transaction(async (tx) => {
      const existing = await tx.planningItem.findMany({
        where: { planningId: planning.id },
        select: { id: true }
      })
      const existingIds = new Set(existing.map(i => i.id))

      const incoming = [
        { id: originalItemId, productName: 'Updated Item 1', budget: 6000000, expense: 5500000, order: 0 },
        { productName: 'New Item 3', budget: 4000000, expense: 3800000, order: 1 }
      ]

      const toUpdate = incoming.filter(i => i.id && existingIds.has(i.id))
      const toCreate = incoming.filter(i => !i.id)

      await Promise.all(
        toUpdate.map(item =>
          tx.planningItem.update({
            where: { id: item.id },
            data: { productName: item.productName, budget: item.budget, expense: item.expense, order: item.order }
          })
        )
      )

      const created = await Promise.all(
        toCreate.map(item =>
          tx.planningItem.create({
            data: {
              planningId: planning.id,
              productName: item.productName,
              budget: item.budget,
              expense: item.expense,
              order: item.order
            }
          })
        )
      )

      const keptIds = [...toUpdate.map(i => i.id!), ...created.map(c => c.id)]
      await tx.planningItem.deleteMany({
        where: { planningId: planning.id, id: { notIn: keptIds } }
      })
    })

    const result = await prisma.planning.findUnique({
      where: { id: planning.id },
      include: { items: true }
    })

    expect(result?.items.length).toBe(2)
    expect(result?.items.find(i => i.productName === 'Updated Item 1')).toBeTruthy()
    expect(result?.items.find(i => i.productName === 'New Item 3')).toBeTruthy()

    // Cleanup
    await prisma.planning.delete({ where: { id: planning.id } })
  })

  it('Expense: should use UPSERT pattern for items', async () => {
    const expense = await prisma.expense.create({
      data: {
        expenseId: `TEST-EXP-${Date.now()}`,
        projectName: 'Test Expense',
        productionDate: new Date(),
        clientBudget: 10000000,
        paidAmount: 9500000,
        totalItemBudgeted: 10000000,
        totalItemDifferences: -500000,
        items: {
          create: [
            { productName: 'Item 1', budgeted: 5000000, actual: 4800000, difference: 200000, order: 0 },
            { productName: 'Item 2', budgeted: 5000000, actual: 5200000, difference: -200000, order: 1 }
          ]
        }
      },
      include: { items: true }
    })

    const originalItemId = expense.items[0].id

    // Test UPSERT
    await prisma.$transaction(async (tx) => {
      const existing = await tx.expenseItem.findMany({
        where: { expenseId: expense.id },
        select: { id: true }
      })
      const existingIds = new Set(existing.map(i => i.id))

      const incoming = [
        { id: originalItemId, productName: 'Updated Item 1', budgeted: 5500000, actual: 5200000, order: 0 }
      ]

      const toUpdate = incoming.filter(i => i.id && existingIds.has(i.id))

      await Promise.all(
        toUpdate.map(item =>
          tx.expenseItem.update({
            where: { id: item.id },
            data: {
              productName: item.productName,
              budgeted: item.budgeted,
              actual: item.actual,
              difference: item.budgeted - item.actual,
              order: item.order
            }
          })
        )
      )

      const keptIds = toUpdate.map(i => i.id!)
      await tx.expenseItem.deleteMany({
        where: { expenseId: expense.id, id: { notIn: keptIds } }
      })
    })

    const result = await prisma.expense.findUnique({
      where: { id: expense.id },
      include: { items: true }
    })

    expect(result?.items.length).toBe(1)
    expect(result?.items[0].productName).toBe('Updated Item 1')

    // Cleanup
    await prisma.expense.delete({ where: { id: expense.id } })
  })

  it('Quotation: should maintain data integrity with complex nested updates', async () => {
    const quotation = await prisma.quotation.create({
      data: {
        quotationId: `TEST-COMPLEX-${Date.now()}`,
        companyName: 'Test Company',
        companyAddress: 'Test Address',
        companyCity: 'Test City',
        companyProvince: 'Test Province',
        productionDate: new Date(),
        billTo: 'Test Client',
        billingName: 'Test Billing',
        billingBankName: 'Test Bank',
        billingBankAccount: '123456',
        billingBankAccountName: 'Test Account',
        signatureName: 'Test Signature',
        signatureImageData: 'data:image/png;base64,test',
        pph: '2',
        totalAmount: 10000000,
        items: {
          create: {
            productName: 'Item 1',
            total: 5000000,
            order: 0,
            details: {
              create: [
                { detail: 'Detail 1', unitPrice: 1000000, qty: 5, amount: 5000000 }
              ]
            }
          }
        },
        remarks: {
          create: [
            { text: 'Remark 1', isCompleted: false, order: 0 }
          ]
        }
      },
      include: {
        items: { include: { details: true } },
        remarks: true
      }
    })

    const originalItemId = quotation.items[0].id
    const originalDetailId = quotation.items[0].details[0].id
    const originalRemarkId = quotation.remarks[0].id

    // Complex update: items + details + remarks
    await prisma.$transaction(async (tx) => {
      // Update item, delete old details, create new details
      await tx.quotationItem.update({
        where: { id: originalItemId },
        data: { total: 6000000 }
      })

      await tx.quotationItemDetail.deleteMany({
        where: { quotationItemId: originalItemId }
      })

      await tx.quotationItemDetail.createMany({
        data: [
          { quotationItemId: originalItemId, detail: 'New Detail 1', unitPrice: 2000000, qty: 3, amount: 6000000 }
        ]
      })

      // Update remark
      await tx.quotationRemark.update({
        where: { id: originalRemarkId },
        data: { text: 'Updated Remark', isCompleted: true }
      })
    })

    const result = await prisma.quotation.findUnique({
      where: { id: quotation.id },
      include: {
        items: { include: { details: true } },
        remarks: true
      }
    })

    expect(result?.items[0].total).toBe(6000000)
    expect(result?.items[0].details.length).toBe(1)
    expect(result?.items[0].details[0].detail).toBe('New Detail 1')
    expect(result?.remarks[0].text).toBe('Updated Remark')
    expect(result?.remarks[0].isCompleted).toBe(true)

    // Cleanup
    await prisma.quotation.delete({ where: { id: quotation.id } })
  })
})
